/**
 * A very small Chrome driver.
 *
 * Launches one headless Chrome and keeps it, so a batch of renders costs one
 * browser start instead of one per file. Speaks the DevTools Protocol over
 * the WebSocket built into Node 22 — no dependency, nothing to install.
 *
 * Only what the print pipeline needs: open a page, load a file, wait for the
 * webfonts, screenshot it on a transparent ground.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Pending {
  resolve: (value: Record<string, unknown>) => void;
  reject: (reason: Error) => void;
}

export class Chrome {
  private proc!: ChildProcess;
  private ws!: WebSocket;
  private profile!: string;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private waiters: { method: string; sessionId?: string; resolve: () => void }[] = [];
  private session!: string;
  private closed = false;

  static async launch(): Promise<Chrome> {
    const c = new Chrome();
    await c.start();
    return c;
  }

  private async start() {
    this.profile = await mkdtemp(path.join(os.tmpdir(), 'si-chrome-'));
    const bin = process.env.CHROME_PATH ?? DEFAULT_CHROME;

    this.proc = spawn(
      bin,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        // Print pages reference supplied art as a sibling file rather than
        // inlining it; without this Chrome refuses to read the neighbour.
        '--allow-file-access-from-files',
        '--disable-background-networking',
        '--force-device-scale-factor=1',
        // 0 means "pick a free port and write it to DevToolsActivePort".
        '--remote-debugging-port=0',
        `--user-data-dir=${this.profile}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );

    // Chrome writes the port on line 1 and the browser ws path on line 2,
    // but only once it is actually listening.
    const portFile = path.join(this.profile, 'DevToolsActivePort');
    let endpoint = '';
    for (let i = 0; i < 200; i += 1) {
      if (existsSync(portFile)) {
        const [port, wsPath] = (await readFile(portFile, 'utf8')).split('\n');
        if (port && wsPath) {
          endpoint = `ws://127.0.0.1:${port.trim()}${wsPath.trim()}`;
          break;
        }
      }
      await sleep(50);
    }
    if (!endpoint) throw new Error('Chrome did not report a debugging port');

    this.ws = new WebSocket(endpoint);
    await new Promise<void>((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener('error', () => reject(new Error('Could not connect to Chrome')), {
        once: true,
      });
    });
    this.ws.addEventListener('message', (ev) => this.onMessage(String(ev.data)));
    // Without these a dropped socket strands every pending call forever. It
    // does drop: Node's built-in WebSocket caps the size of a decompressed
    // message and closes with 1006 past it, which is what a screenshot of a
    // photograph used to do. Failing loudly is what made that findable.
    const fail = (why: string) => {
      for (const [id, waiting] of this.pending) {
        this.pending.delete(id);
        waiting.reject(new Error(why));
      }
    };
    this.ws.addEventListener('error', () => fail('DevTools socket errored'));
    this.ws.addEventListener('close', (ev) => fail(`DevTools socket closed (${ev.code})`));

    // One tab, attached flat so every later command can carry a sessionId.
    const { targetId } = (await this.send('Target.createTarget', { url: 'about:blank' })) as {
      targetId: string;
    };
    const attached = (await this.send('Target.attachToTarget', { targetId, flatten: true })) as {
      sessionId: string;
    };
    this.session = attached.sessionId;

    await this.send('Page.enable', {}, this.session);
    await this.send('Runtime.enable', {}, this.session);
  }

  private onMessage(raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (typeof msg.id === 'number') {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) {
        const err = msg.error as { message?: string };
        p.reject(new Error(err.message ?? 'DevTools error'));
      } else {
        p.resolve((msg.result ?? {}) as Record<string, unknown>);
      }
      return;
    }

    // An event: release anything waiting on it.
    const method = msg.method as string | undefined;
    if (!method) return;
    const sessionId = msg.sessionId as string | undefined;
    for (let i = this.waiters.length - 1; i >= 0; i -= 1) {
      const w = this.waiters[i];
      if (w.method === method && (!w.sessionId || w.sessionId === sessionId)) {
        this.waiters.splice(i, 1);
        w.resolve();
      }
    }
  }

  private send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    const payload: Record<string, unknown> = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`DevTools ${method} never answered`));
      }, 60_000);
      timer.unref?.();
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      this.ws.send(JSON.stringify(payload));
    });
  }

  private once(method: string, sessionId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const waiter = { method, sessionId, resolve: () => resolve() };
      this.waiters.push(waiter);
      setTimeout(() => {
        const i = this.waiters.indexOf(waiter);
        // A timeout is not fatal — the page may already have been ready.
        if (i >= 0) this.waiters.splice(i, 1);
        resolve();
      }, timeoutMs).unref?.();
    });
  }

  /**
   * Load a page at an exact viewport and return a PNG of it. `width`/`height`
   * are CSS pixels and become the image's pixel size. Takes a local path or,
   * for checking a deployed page, an http(s) URL.
   */
  async shoot(file: string, width: number, height: number, opaque = false): Promise<Buffer> {
    await this.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: false },
      this.session,
    );
    // Alpha 0: the ground stays transparent rather than white. A real web
    // page wants its own background instead.
    await this.send(
      'Emulation.setDefaultBackgroundColorOverride',
      opaque ? {} : { color: { r: 0, g: 0, b: 0, a: 0 } },
      this.session,
    );

    const loaded = this.once('Page.loadEventFired', this.session, 20_000);
    const url = /^https?:\/\//.test(file) ? file : `file://${file}`;
    await this.send('Page.navigate', { url }, this.session);
    await loaded;

    // Webfonts arrive after load; without this the capture can catch a
    // fallback face, which for the blackletter would be a plain serif.
    await this.send(
      'Runtime.evaluate',
      {
        expression: 'document.fonts.ready.then(() => document.fonts.status)',
        awaitPromise: true,
        returnByValue: true,
      },
      this.session,
    );

    const shot = (await this.send(
      'Page.captureScreenshot',
      {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height, scale: 1 },
      },
      this.session,
    )) as { data: string };

    return Buffer.from(shot.data, 'base64');
  }

  /**
   * Screenshot straight to a file, in a throwaway browser.
   *
   * `shoot` is much faster — it reuses one Chrome over CDP — but a CDP reply
   * carries the whole PNG as a single WebSocket message, and Node's built-in
   * WebSocket drops the socket once a decompressed message passes its ceiling.
   * Flat type compresses far under it; a photograph does not, so a print
   * carrying supplied art is captured here instead, where Chrome writes the
   * bytes itself and nothing crosses a socket. Virtual time stands in for the
   * font wait `shoot` does by hand.
   */
  static async capture(file: string, width: number, height: number): Promise<Buffer> {
    const profile = await mkdtemp(path.join(os.tmpdir(), 'si-shot-'));
    const out = path.join(profile, 'out.png');
    const bin = process.env.CHROME_PATH ?? DEFAULT_CHROME;
    let proc: ChildProcess | undefined;
    try {
      proc = spawn(
        bin,
        [
          '--headless=new',
          '--disable-gpu',
          '--hide-scrollbars',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--allow-file-access-from-files',
          '--force-device-scale-factor=1',
          // Transparent ground, the flag form of what `shoot` sets over CDP.
          '--default-background-color=00000000',
          '--virtual-time-budget=8000',
          `--window-size=${width},${height}`,
          `--screenshot=${out}`,
          `--user-data-dir=${profile}`,
          `file://${file}`,
        ],
        { stdio: ['ignore', 'ignore', 'ignore'] },
      );
      // Given its own profile Chrome writes the screenshot and then stays up
      // rather than exiting, so waiting on the process never returns. Wait for
      // the file instead, and stop the browser once it is whole — a PNG ends
      // with IEND, which is a cheaper and surer test than a settled size.
      const done = (buf: Buffer) =>
        buf.length > 8 && buf.subarray(buf.length - 8, buf.length - 4).toString('latin1') === 'IEND';
      for (let i = 0; i < 600; i += 1) {
        if (existsSync(out)) {
          const buf = await readFile(out);
          if (done(buf)) return buf;
        }
        await sleep(100);
      }
      throw new Error(`Chrome wrote no complete screenshot for ${path.basename(file)}`);
    } finally {
      proc?.kill('SIGKILL');
      await rm(profile, { recursive: true, force: true });
    }
  }

  /** Capture whatever is on screen now, without navigating. `shoot` reloads,
   *  which throws away any scrolling or clicking done first. */
  async snap(width: number, height: number): Promise<Buffer> {
    const shot = (await this.send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: false, clip: { x: 0, y: 0, width, height, scale: 1 } },
      this.session,
    )) as { data: string };
    return Buffer.from(shot.data, 'base64');
  }

  /** Plant a cookie, for reproducing a state the browser would arrive in on
   *  its own — a cart id issued by a store that no longer has it. */
  async setCookie(name: string, value: string, url: string): Promise<void> {
    await this.send('Network.setCookie', { name, value, url }, this.session);
  }

  /** Run an expression in the page and return its value. */
  async evaluate<T>(expression: string): Promise<T> {
    const res = (await this.send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      this.session,
    )) as { result?: { value?: T }; exceptionDetails?: { text?: string } };
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text ?? 'evaluate threw');
    return res.result?.value as T;
  }

  /** Load a page and wait for it, without capturing anything. Takes a local
   *  path or an http(s) URL, the same as `shoot`. */
  async open(file: string): Promise<void> {
    const loaded = this.once('Page.loadEventFired', this.session, 20_000);
    const url = /^https?:\/\//.test(file) ? file : `file://${file}`;
    await this.send('Page.navigate', { url }, this.session);
    await loaded;
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    try {
      await this.send('Browser.close');
    } catch {
      /* already going */
    }
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
    // Make sure it is actually gone, then take the profile with it.
    for (let i = 0; i < 40 && this.proc.exitCode === null; i += 1) await sleep(50);
    if (this.proc.exitCode === null) this.proc.kill('SIGKILL');
    await rm(this.profile, { recursive: true, force: true }).catch(() => {});
  }
}
