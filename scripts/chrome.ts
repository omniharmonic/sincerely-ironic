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
      this.pending.set(id, { resolve, reject });
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

  /** Load a local page and wait for it, without capturing anything. */
  async open(file: string): Promise<void> {
    const loaded = this.once('Page.loadEventFired', this.session, 20_000);
    await this.send('Page.navigate', { url: `file://${file}` }, this.session);
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
