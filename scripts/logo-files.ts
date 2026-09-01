/**
 * Brand export.
 *
 * Writes the whole kit to `public/brand/` as SVG and PNG: the mark on its own
 * in several aspect ratios, the wordmark on its own, and the two locked up
 * together — each flat one-colour and on the slick.
 *
 *   pnpm logo-files
 *
 * Two things make this more than a loop over `--screenshot`:
 *
 * 1. **One browser.** Chrome is launched once and driven over the DevTools
 *    protocol. The earlier version spawned a process per file; at this file
 *    count that is a machine-load problem, not a style one.
 *
 * 2. **The type is measured, not guessed.** The wordmark is two faces set
 *    side by side, so its box and its baselines are whatever the fonts say
 *    they are. The page is laid out first, measured, and only then captured —
 *    and the same measurements position the `<text>` in the SVG, so the
 *    vector and the raster agree.
 *
 * The mark paths here are the single source: `src/components/Logo.tsx` draws
 * the same two silhouettes on the site, and `src/components/Wordmark.tsx`
 * with `.wordmark*` in `globals.css` define the lockup this mirrors.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ------------------------------------------------------------------ the mark */

const MARK_W = 264.58336;
const MARK_H = 223.17815;

/** The smaller figure, at the right. */
const FIGURE_A =
  'm 183.78587,-6.9532424e-5 h 31.97516 L 264.58334,111.34812 H 242.8523 l -0.006,32.89246 c -0.16821,14.64858 -12.74832,22.1747 -22.00482,21.90278 H 210.3678 v 57.0348 h -31.7014 v -57.0348 c 24.34385,0.33922 31.8727,-7.32301 31.80542,-25.2265 v -29.56874 h 22.30594 z';

/** The face — the one with the eye. */
const FIGURE_B =
  'M 89.26758,-6.93e-5 H 148.9691 L 198.40466,111.34812 H 176.6736 v 32.99105 c -0.13735,12.03845 -8.88383,20.57637 -21.83507,21.79872 h -11.08729 v 57.0348 H 64.010498 V 163.83265 C 25.697809,158.00406 6e-6,127.55381 6e-6,84.900524 6e-6,34.175831 40.310752,-6.93e-5 89.26758,-6.93e-5 Z m 44.03701,55.4687443 c -11.35899,0 -20.5758,9.190289 -20.5758,20.550281 0,11.39366 9.21681,20.583128 20.5758,20.583128 11.35896,0 20.54838,-9.189468 20.54838,-20.583128 0,-11.35719 -9.18942,-20.550281 -20.54838,-20.550281 z';

/** The slick, in the order the site uses it. */
const SLICK = ['#FF2E9E', '#FFB52E', '#1FCFEE', '#7C3AED'];

const INK = '#0D0D0D';
const PAPER = '#F3F3F0';

/**
 * Clear space, in mark units — the width of the smaller figure, which is the
 * narrowest thing in the mark and so the honest unit for it. Nothing is
 * allowed inside this margin.
 */
const CLEAR = 86;

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.resolve('public/brand');

/* --------------------------------------------------------------- the fonts */

const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@1,9..144,100..900,0..100,0..1' +
  '&family=Anybody:wdth,wght@50..150,100..900&display=block';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

/**
 * The latin `@font-face` rules with their woff2 inlined as data URLs, so an
 * exported SVG carries its own type and does not depend on what the opener
 * happens to have installed.
 */
async function embeddedFontFaces(): Promise<string> {
  const css = await fetch(FONT_CSS, { headers: { 'User-Agent': UA } }).then((r) => r.text());

  const blocks = css
    .split('@font-face')
    .slice(1)
    .map((b) => b.slice(b.indexOf('{') + 1, b.indexOf('}')))
    // Only the latin subset; the others are dead weight for this alphabet.
    .filter((b) => /unicode-range:\s*U\+0000-00FF/.test(b));

  const faces: string[] = [];
  for (const block of blocks) {
    const url = /src:\s*url\(([^)]+)\)/.exec(block)?.[1];
    if (!url) continue;
    const decl = (prop: string) => new RegExp(`${prop}:\\s*([^;]+);`).exec(block)?.[1]?.trim();
    // Node's fetch types widen arrayBuffer() past what Uint8Array accepts.
    const buf = (await fetch(url, { headers: { 'User-Agent': UA } }).then((r) =>
      r.arrayBuffer(),
    )) as ArrayBuffer;
    const bytes = Buffer.from(new Uint8Array(buf));
    faces.push(
      [
        '@font-face{',
        `font-family:${decl('font-family')};`,
        `font-style:${decl('font-style') ?? 'normal'};`,
        `font-weight:${decl('font-weight') ?? '400'};`,
        decl('font-stretch') ? `font-stretch:${decl('font-stretch')};` : '',
        `src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');`,
        '}',
      ].join(''),
    );
  }
  if (faces.length === 0) throw new Error('no latin font faces found');
  return faces.join('\n');
}

/* ------------------------------------------------------------------- chrome */

interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

/**
 * One headless Chrome, driven over the DevTools protocol and reused for every
 * render in the run.
 */
class Browser {
  // Written out rather than declared in the constructor signature: Node's
  // type-stripping loader does not implement parameter properties.
  private proc: ChildProcess;
  private ws: WebSocket;
  private session: string;
  private profile: string;

  private constructor(proc: ChildProcess, ws: WebSocket, session: string, profile: string) {
    this.proc = proc;
    this.ws = ws;
    this.session = session;
    this.profile = profile;
  }

  private next = 1;
  private waiting = new Map<number, { ok: (v: unknown) => void; err: (e: Error) => void }>();
  private events = new Map<string, () => void>();

  static async launch(): Promise<Browser> {
    const profile = path.join(tmpdir(), `si-brand-${process.pid}`);
    await mkdir(profile, { recursive: true });
    const proc = spawn(CHROME, [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--force-device-scale-factor=1',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ]);

    // Chrome writes the port it actually took into the profile directory.
    const portFile = path.join(profile, 'DevToolsActivePort');
    let port = '';
    for (let i = 0; i < 100 && !port; i += 1) {
      await new Promise((r) => setTimeout(r, 100));
      port = await readFile(portFile, 'utf8')
        .then((t) => t.split('\n')[0].trim())
        .catch(() => '');
    }
    if (!port) throw new Error('Chrome never reported a debugging port');

    const { webSocketDebuggerUrl } = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json());
    const ws = new WebSocket(webSocketDebuggerUrl);
    await new Promise<void>((ok, err) => {
      ws.addEventListener('open', () => ok(), { once: true });
      ws.addEventListener('error', () => err(new Error('devtools socket failed')), { once: true });
    });

    const b = new Browser(proc, ws, '', profile);
    ws.addEventListener('message', (e) => b.receive(String(e.data)));

    const { targetId } = (await b.send('Target.createTarget', { url: 'about:blank' })) as { targetId: string };
    const { sessionId } = (await b.send('Target.attachToTarget', { targetId, flatten: true })) as {
      sessionId: string;
    };
    b.session = sessionId;
    await b.send('Page.enable');
    await b.send('Runtime.enable');
    await b.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    return b;
  }

  private receive(raw: string) {
    const msg = JSON.parse(raw);
    if (msg.id && this.waiting.has(msg.id)) {
      const w = this.waiting.get(msg.id)!;
      this.waiting.delete(msg.id);
      if (msg.error) w.err(new Error(msg.error.message));
      else w.ok(msg.result);
      return;
    }
    if (msg.method && this.events.has(msg.method)) {
      const fire = this.events.get(msg.method)!;
      this.events.delete(msg.method);
      fire();
    }
  }

  private send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.next++;
    const body: Record<string, unknown> = { id, method, params };
    if (this.session) body.sessionId = this.session;
    this.ws.send(JSON.stringify(body));
    return new Promise((ok, err) => {
      this.waiting.set(id, { ok, err });
      setTimeout(() => {
        if (this.waiting.delete(id)) err(new Error(`${method} timed out`));
      }, 30_000);
    });
  }

  private once(method: string): Promise<void> {
    return new Promise((ok) => this.events.set(method, ok));
  }

  /** Load a page and wait for it and its webfonts to be ready. */
  async open(html: string, width: number, height: number) {
    const file = path.join(this.profile, `page-${this.next}.html`);
    await writeFile(file, html, 'utf8');
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: Math.ceil(width),
      height: Math.ceil(height),
      deviceScaleFactor: 1,
      mobile: false,
    });
    const loaded = this.once('Page.loadEventFired');
    await this.send('Page.navigate', { url: `file://${file}` });
    await loaded;
    await this.send('Runtime.evaluate', {
      expression: 'document.fonts.ready.then(() => true)',
      awaitPromise: true,
    });
  }

  async evaluate<T>(expression: string): Promise<T> {
    const r = (await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })) as { result: { value: T } };
    return r.result.value;
  }

  async capture(out: string, clip: Clip) {
    const r = (await this.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip,
    })) as { data: string };
    await writeFile(out, Buffer.from(r.data, 'base64'));
  }

  /**
   * Last resort, wired to process exit — that handler cannot await, so this
   * is the one shutdown path that has to be synchronous.
   */
  kill() {
    if (this.proc.exitCode === null) {
      try {
        this.proc.kill('SIGKILL');
      } catch {
        /* already gone */
      }
    }
  }

  /**
   * Shut the browser down and wait for it to actually be gone.
   *
   * Signalling and moving on is not enough: Chrome takes a moment to tear its
   * helper processes down, and a script that exits first leaves them behind.
   * Ask it to close over the protocol, wait for the process to exit, and only
   * fall back to SIGKILL if it will not.
   */
  async close() {
    const exited = new Promise<void>((done) => {
      if (this.proc.exitCode !== null) return done();
      this.proc.once('exit', () => done());
    });

    try {
      // Sent without a sessionId: this is a browser-level command.
      const wasSession = this.session;
      this.session = '';
      await Promise.race([this.send('Browser.close'), new Promise((r) => setTimeout(r, 2000))]);
      this.session = wasSession;
    } catch {
      /* the socket may already be closing — the kill below still applies */
    }

    try {
      this.ws.close();
    } catch {
      /* already gone */
    }

    await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
    if (this.proc.exitCode === null) {
      this.proc.kill('SIGKILL');
      await Promise.race([exited, new Promise((r) => setTimeout(r, 2000))]);
    }

    await rm(this.profile, { recursive: true, force: true });
  }
}

/* ---------------------------------------------------------------- the frames */

/** Frame the mark to a ratio, never letting it inside the clear space. */
function frame(ratio: number) {
  const minW = MARK_W + CLEAR * 2;
  const minH = MARK_H + CLEAR * 2;
  const w = minW / minH > ratio ? minW : minH * ratio;
  const h = minW / minH > ratio ? minW / ratio : minH;
  return { w, h, x: (w - MARK_W) / 2, y: (h - MARK_H) / 2 };
}

const RATIOS: [string, number][] = [
  ['1x1', 1],
  ['16x9', 16 / 9],
  ['4x5', 4 / 5],
  ['3x1', 3],
];

const GLASS = `<linearGradient id="glass" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.82"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.64"/>
    </linearGradient>`;

const slickDef = (id = 'slick') => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
${SLICK.map((c, i) => `      <stop offset="${(i / (SLICK.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('\n')}
    </linearGradient>`;

/** The mark on the slick, in a rounded tile of the given frame. */
function markOnSlick(ratio: number): string {
  const f = frame(ratio);
  const r = Math.min(f.w, f.h) * 0.06;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f.w.toFixed(2)} ${f.h.toFixed(2)}" width="${f.w.toFixed(0)}" height="${f.h.toFixed(0)}">
  <defs>
    ${slickDef()}
    ${GLASS}
    <filter id="lift" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#000" flood-opacity="0.18"/>
    </filter>
    <clipPath id="tile"><rect width="${f.w.toFixed(2)}" height="${f.h.toFixed(2)}" rx="${r.toFixed(2)}"/></clipPath>
  </defs>
  <g clip-path="url(#tile)">
    <rect width="${f.w.toFixed(2)}" height="${f.h.toFixed(2)}" fill="url(#slick)"/>
    <g transform="translate(${f.x.toFixed(2)} ${f.y.toFixed(2)})" filter="url(#lift)">
      <path d="${FIGURE_B}" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.1"/>
      <path d="${FIGURE_A}" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.1"/>
    </g>
  </g>
</svg>
`;
}

/** The mark flat, one colour, on nothing. */
function markFlat(ratio: number, colour: string): string {
  const f = frame(ratio);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f.w.toFixed(2)} ${f.h.toFixed(2)}" width="${f.w.toFixed(0)}" height="${f.h.toFixed(0)}">
  <g transform="translate(${f.x.toFixed(2)} ${f.y.toFixed(2)})">
    <path d="${FIGURE_B}" fill="${colour}"/>
    <path d="${FIGURE_A}" fill="${colour}" fill-opacity="0.58"/>
  </g>
</svg>
`;
}

/** Both figures at full strength — the file a digitiser wants. */
function markSolid(colour: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_W} ${MARK_H}" width="${MARK_W}" height="${MARK_H}">
  <path d="${FIGURE_B}" fill="${colour}"/>
  <path d="${FIGURE_A}" fill="${colour}"/>
</svg>
`;
}

/* -------------------------------------------------------------- the wordmark */

/** Type size used for measuring. Everything else is scaled from the result. */
const EM = 200;

/**
 * The wordmark's CSS, lifted from `.wordmark*` in globals.css. SOFT is pinned
 * at 50 rather than following the site's universe token, so the exported
 * files have one canonical setting.
 */
const WORDMARK_CSS = `
  /* Baseline, not centre. The two faces are different sizes with different
     metrics, so centring them lines up their boxes and not their type — the
     name visibly steps between "Sincerely" and "IRONIC". The mark has no
     baseline of its own, so it is the one thing that centres. */
  .wm { display: inline-flex; align-items: baseline; gap: 0.28em; white-space: nowrap; line-height: 1; }
  .wm > svg { align-self: center; }
  .wm--stack { flex-direction: column; align-items: center; gap: 0.06em; }
  .s {
    font-family: 'Fraunces'; font-style: italic; font-weight: 500;
    font-variation-settings: 'SOFT' 50, 'WONK' 1, 'opsz' 20;
    font-size: 1.05em; letter-spacing: -0.01em;
  }
  .i {
    font-family: 'Anybody'; font-weight: 800;
    font-variation-settings: 'wdth' 125;
    text-transform: uppercase; letter-spacing: -0.01em; font-size: 1em;
  }
  .probe { display: inline-block; width: 0; height: 0; vertical-align: baseline; }
`;

/** A zero-size inline probe sits on the baseline, so we can read it back. */
const word = (cls: string, text: string, id: string) =>
  `<span class="${cls}" id="${id}">${text}<i class="probe" id="${id}-b"></i></span>`;

interface Measured {
  w: number;
  h: number;
  parts: { id: string; x: number; y: number; w: number; h: number; baseline: number }[];
}

const MEASURE = `(() => {
  const root = document.getElementById('root');
  const r = root.getBoundingClientRect();
  const ids = [...root.querySelectorAll('[id]')].map(e => e.id).filter(id => !id.endsWith('-b'));
  return {
    w: r.width, h: r.height,
    parts: ids.map(id => {
      const e = document.getElementById(id).getBoundingClientRect();
      // The mark carries no baseline probe; only type does.
      const probe = document.getElementById(id + '-b');
      const baseline = probe
        ? probe.getBoundingClientRect().top - r.top
        : e.bottom - r.top;
      return { id, x: e.left - r.left, y: e.top - r.top, w: e.width, h: e.height, baseline };
    }),
  };
})()`;

function page(body: string, faces: string, colour: string, extra = ''): string {
  return `<!doctype html><meta charset="utf-8">
<style>
  ${faces}
  html, body { margin: 0; padding: 0; background: transparent; }
  body { display: inline-block; }
  /* Glyphs overhang their inline boxes — the wide face's outer stems and the
     italic's descender both sit right on the edge. Capturing the measured box
     exactly shaved them, so the box carries a little clear space of its own. */
  #root { color: ${colour}; font-size: ${EM}px; padding: 0.07em 0.06em; }
  ${WORDMARK_CSS}
  ${extra}
</style>
${body}`;
}

/** The wordmark as vector, positioned from what the browser measured. */
function wordmarkSvg(m: Measured, faces: string, colour: string): string {
  const text = m.parts
    .map((p) => {
      const cls = p.id === 'sincerely' ? 's' : 'i';
      const label = p.id === 'sincerely' ? 'Sincerely' : 'IRONIC';
      return `  <text class="${cls}" x="${p.x.toFixed(2)}" y="${p.baseline.toFixed(2)}">${label}</text>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.w.toFixed(2)} ${m.h.toFixed(2)}" width="${m.w.toFixed(0)}" height="${m.h.toFixed(0)}">
  <defs><style>
${faces}
    text { fill: ${colour}; font-size: ${EM}px; }
    .s { font-family: 'Fraunces'; font-style: italic; font-weight: 500; font-variation-settings: 'SOFT' 50, 'WONK' 1, 'opsz' 20; font-size: ${EM * 1.05}px; letter-spacing: -0.01em; }
    .i { font-family: 'Anybody'; font-weight: 800; font-variation-settings: 'wdth' 125; letter-spacing: -0.01em; }
  </style></defs>
${text}
</svg>
`;
}

/**
 * Mark plus wordmark as vector, again from measured geometry.
 *
 * With `sweep`, `colour` is expected to be `url(#slicktype)` and the gradient
 * is defined across the whole lockup in user space, so one rainbow runs
 * through the mark and the name together rather than restarting per element.
 */
function lockupSvg(
  m: Measured,
  faces: string,
  colour: string,
  markBox: { x: number; y: number; s: number },
  sweep = false,
): string {
  const text = m.parts
    .filter((p) => p.id !== 'mark')
    .map((p) => {
      const cls = p.id === 'sincerely' ? 's' : 'i';
      const label = p.id === 'sincerely' ? 'Sincerely' : 'IRONIC';
      return `  <text class="${cls}" x="${p.x.toFixed(2)}" y="${p.baseline.toFixed(2)}">${label}</text>`;
    })
    .join('\n');
  const grad = sweep
    ? `<linearGradient id="slicktype" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${m.w.toFixed(2)}" y2="${m.h.toFixed(2)}">
${SLICK.map((c, i) => `      <stop offset="${(i / (SLICK.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('\n')}
    </linearGradient>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.w.toFixed(2)} ${m.h.toFixed(2)}" width="${m.w.toFixed(0)}" height="${m.h.toFixed(0)}">
  <defs>${grad}<style>
${faces}
    text { fill: ${colour}; font-size: ${EM}px; }
    .s { font-family: 'Fraunces'; font-style: italic; font-weight: 500; font-variation-settings: 'SOFT' 50, 'WONK' 1, 'opsz' 20; font-size: ${EM * 1.05}px; letter-spacing: -0.01em; }
    .i { font-family: 'Anybody'; font-weight: 800; font-variation-settings: 'wdth' 125; letter-spacing: -0.01em; }
  </style></defs>
  <g transform="translate(${markBox.x.toFixed(2)} ${markBox.y.toFixed(2)}) scale(${markBox.s.toFixed(5)})">
    <path d="${FIGURE_B}" fill="${colour}"/>
    <path d="${FIGURE_A}" fill="${colour}" fill-opacity="0.58"/>
  </g>
${text}
</svg>
`;
}

/** The mark on its slick tile, inline, at a given height. Ids are unique per
 *  call so several can share one document. */
function tileInline(height: number, id: string): string {
  const w = (height * MARK_W) / MARK_H;
  const r = Math.min(w, height) * 0.06;
  return `<svg id="mark" width="${w.toFixed(2)}" height="${height.toFixed(2)}" viewBox="0 0 ${MARK_W} ${MARK_H}">
    <defs>
      ${slickDef(`slick-${id}`)}
      <linearGradient id="glass-${id}" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.82"/>
        <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.64"/>
      </linearGradient>
      <clipPath id="tile-${id}"><rect width="${MARK_W}" height="${MARK_H}" rx="${((r * MARK_W) / w).toFixed(2)}"/></clipPath>
    </defs>
    <g clip-path="url(#tile-${id})">
      <rect width="${MARK_W}" height="${MARK_H}" fill="url(#slick-${id})"/>
      <path d="${FIGURE_B}" fill="url(#glass-${id})" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.1"/>
      <path d="${FIGURE_A}" fill="url(#glass-${id})" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.1"/>
    </g>
  </svg>`;
}

/**
 * A lockup that keeps the mark in full colour, with the name beside or under
 * it. With `rainbowType`, the name runs on the slick as well, and the sweep
 * is in user space so it crosses the whole lockup once instead of restarting
 * inside each word — one file that reads on a black garment and a white one.
 */
function lockupSlickSvg(
  m: Measured,
  faces: string,
  colour: string,
  mk: { x: number; y: number; w: number; h: number },
  rainbowType = false,
): string {
  const text = m.parts
    .filter((p) => p.id !== 'mark')
    .map((p) => {
      const cls = p.id === 'sincerely' ? 's' : 'i';
      const label = p.id === 'sincerely' ? 'Sincerely' : 'IRONIC';
      return `  <text class="${cls}" x="${p.x.toFixed(2)}" y="${p.baseline.toFixed(2)}">${label}</text>`;
    })
    .join('\n');
  const r = Math.min(mk.w, mk.h) * 0.06;
  const sweep = rainbowType
    ? `<linearGradient id="slicktype" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${m.w.toFixed(2)}" y2="${m.h.toFixed(2)}">
${SLICK.map((c, i) => `      <stop offset="${(i / (SLICK.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('\n')}
    </linearGradient>`
    : '';
  const typeFill = rainbowType ? 'url(#slicktype)' : colour;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.w.toFixed(2)} ${m.h.toFixed(2)}" width="${m.w.toFixed(0)}" height="${m.h.toFixed(0)}">
  <defs>
    ${slickDef()}
    ${sweep}
    ${GLASS}
    <clipPath id="tile"><rect x="${mk.x.toFixed(2)}" y="${mk.y.toFixed(2)}" width="${mk.w.toFixed(2)}" height="${mk.h.toFixed(2)}" rx="${r.toFixed(2)}"/></clipPath>
    <style>
${faces}
    text { fill: ${typeFill}; font-size: ${EM}px; }
    .s { font-family: 'Fraunces'; font-style: italic; font-weight: 500; font-variation-settings: 'SOFT' 50, 'WONK' 1, 'opsz' 20; font-size: ${EM * 1.05}px; letter-spacing: -0.01em; }
    .i { font-family: 'Anybody'; font-weight: 800; font-variation-settings: 'wdth' 125; letter-spacing: -0.01em; }
    </style>
  </defs>
  <g clip-path="url(#tile)">
    <rect x="${mk.x.toFixed(2)}" y="${mk.y.toFixed(2)}" width="${mk.w.toFixed(2)}" height="${mk.h.toFixed(2)}" fill="url(#slick)"/>
    <g transform="translate(${mk.x.toFixed(2)} ${mk.y.toFixed(2)}) scale(${(mk.w / MARK_W).toFixed(5)})">
      <path d="${FIGURE_B}" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.1"/>
      <path d="${FIGURE_A}" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.1"/>
    </g>
  </g>
${text}
</svg>
`;
}

/* --------------------------------------------------------------------- main */

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log('· fetching webfonts');
  const faces = await embeddedFontFaces();

  // Held outside the work below so a failure mid-run still shuts Chrome
  // down rather than orphaning it.
  const browser = await Browser.launch();
  let closed = false;
  const shutDown = async () => {
    if (closed) return;
    closed = true;
    await browser.close();
  };
  process.on('exit', () => browser.kill());

  try {
  const written: { file: string; size: string; note: string }[] = [];

  const svg = async (name: string, body: string, note: string) => {
    await writeFile(path.join(OUT, name), body, 'utf8');
    written.push({ file: name, size: '—', note });
  };

  /** Render an inline-SVG page at its natural size. */
  const shot = async (name: string, markup: string, w: number, h: number, width: number, note: string) => {
    await browser.open(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>${markup}`, w, h);
    const height = Math.round((width * h) / w);
    await browser.capture(path.join(OUT, name), { x: 0, y: 0, width: w, height: h, scale: width / w });
    written.push({ file: name, size: `${width}×${height}`, note });
    console.log(`✓ ${name}  ${width}×${height}`);
  };

  /* ---- 1. the mark, framed ---- */
  for (const [label, ratio] of RATIOS) {
    const f = frame(ratio);

    await svg(`mark-${label}-slick.svg`, markOnSlick(ratio), `Mark on the slick, ${label}`);
    await shot(`mark-${label}-slick.png`, markOnSlick(ratio), f.w, f.h, 1400, `Mark on the slick, ${label}`);

    for (const [tone, colour] of [['black', INK], ['white', '#FFFFFF']] as const) {
      await svg(`mark-${label}-${tone}.svg`, markFlat(ratio, colour), `Flat ${tone} mark, ${label}, transparent`);
      await shot(`mark-${label}-${tone}.png`, markFlat(ratio, colour), f.w, f.h, 1400, `Flat ${tone} mark, ${label}, transparent`);
    }
  }

  /* ---- 2. the canonical mark and the digitiser's copy ---- */
  await svg('mark-solid-black.svg', markSolid(INK), 'Both figures solid — for embroidery');
  await svg('mark-solid-white.svg', markSolid('#FFFFFF'), 'Both figures solid — for embroidery');
  await shot('mark-solid-black.png', markSolid(INK), MARK_W, MARK_H, 1024, 'Both figures solid — for embroidery');
  await shot('mark-solid-white.png', markSolid('#FFFFFF'), MARK_W, MARK_H, 1024, 'Both figures solid — for embroidery');

  /* ---- 3. the wordmark alone ---- */
  for (const [layout, cls] of [['row', 'wm'], ['stack', 'wm wm--stack']] as const) {
    for (const [tone, colour] of [['black', INK], ['white', '#FFFFFF']] as const) {
      const body = `<div id="root"><div class="${cls}">${word('s', 'Sincerely', 'sincerely')}${word('i', 'Ironic', 'ironic')}</div></div>`;
      await browser.open(page(body, faces, colour), 4000, 1200);
      const m = await browser.evaluate<Measured>(MEASURE);

      await svg(`wordmark-${layout}-${tone}.svg`, wordmarkSvg(m, faces, colour), `Wordmark only, ${layout}, ${tone}`);
      for (const width of [600, 2000]) {
        const name = `wordmark-${layout}-${tone}-${width}.png`;
        await browser.capture(path.join(OUT, name), { x: 0, y: 0, width: m.w, height: m.h, scale: width / m.w });
        const height = Math.round((width * m.h) / m.w);
        written.push({ file: name, size: `${width}×${height}`, note: `Wordmark only, ${layout}, ${tone}` });
        console.log(`✓ ${name}  ${width}×${height}`);
      }
    }
  }

  /* ---- 4. mark and wordmark locked up ---- */
  const markInline = (colour: string, height: number) =>
    `<svg id="mark" width="${((height * MARK_W) / MARK_H).toFixed(2)}" height="${height}" viewBox="0 0 ${MARK_W} ${MARK_H}"><path d="${FIGURE_B}" fill="${colour}"/><path d="${FIGURE_A}" fill="${colour}" fill-opacity="0.58"/></svg>`;

  for (const [layout, cls] of [['row', 'wm'], ['stack', 'wm wm--stack']] as const) {
    for (const [tone, colour] of [['black', INK], ['white', '#FFFFFF']] as const) {
      const markH = layout === 'row' ? EM * 1.35 : EM * 1.6;
      const body = `<div id="root"><div class="${cls}">${markInline(colour, markH)}${word('s', 'Sincerely', 'sincerely')}${word('i', 'Ironic', 'ironic')}</div></div>`;
      await browser.open(page(body, faces, colour, '#mark{display:block}'), 5000, 1600);
      const m = await browser.evaluate<Measured>(MEASURE);
      const mk = m.parts.find((p) => p.id === 'mark');
      if (mk) {
        await svg(
          `lockup-${layout}-${tone}.svg`,
          lockupSvg(m, faces, colour, { x: mk.x, y: mk.y, s: mk.w / MARK_W }),
          `Mark + wordmark, ${layout}, ${tone}`,
        );
      }
      const name = `lockup-${layout}-${tone}.png`;
      await browser.capture(path.join(OUT, name), { x: 0, y: 0, width: m.w, height: m.h, scale: 2000 / m.w });
      written.push({ file: name, size: `2000×${Math.round((2000 * m.h) / m.w)}`, note: `Mark + wordmark, ${layout}, ${tone}` });
      console.log(`✓ ${name}`);
    }
  }

  /* ---- 5. lockups that keep the mark in full colour, and the badge ---- */
  const slickLockups: [string, string, string, number, string][] = [
    ['lockup-row-slick', 'wm', 'row', EM * 1.35, 'Mark in colour, name beside it'],
    ['lockup-stack-slick', 'wm wm--stack', 'stack', EM * 1.6, 'Mark in colour, name under it'],
    ['lockup-badge', 'wm wm--stack', 'badge', EM * 2.1, 'Compact badge — mark in colour over the stacked name'],
  ];

  // The garment lockups. `rainbow` is one file for both colourways: mark and
  // name both on the slick, so it needs no light and dark counterpart.
  const rainbow: [string, string, string, number, string][] = [
    ['lockup-row-rainbow', 'wm', 'row', EM * 1.35, 'Mark and name both on the slick, side by side'],
    ['lockup-stack-rainbow', 'wm wm--stack', 'stack', EM * 1.6, 'Mark and name both on the slick'],
  ];
  for (const [base, cls, , markH, note] of rainbow) {
    // The figures themselves in colour, not white glass on a coloured tile.
    // The tile version reads on a dark page and washes out to nothing on a
    // white garment, and this file has to work on both.
    const body = `<div id="root"><div class="${cls}">${markInline(INK, markH)}${word('s', 'Sincerely', 'sincerely')}${word('i', 'Ironic', 'ironic')}</div></div>`;
    await browser.open(page(body, faces, INK, '#mark{display:block}'), 5000, 2200);
    const m = await browser.evaluate<Measured>(MEASURE);
    const mk = m.parts.find((p) => p.id === 'mark');
    if (mk) {
      const markup = lockupSvg(m, faces, 'url(#slicktype)', { x: mk.x, y: mk.y, s: mk.w / MARK_W }, true);
      await svg(`${base}.svg`, markup, note);
      // Capture the SVG we just wrote, not the HTML page it was measured
      // from: the page paints the name in flat ink and only the SVG carries
      // the gradient, so shooting the page gave a PNG that disagreed with
      // its own vector.
      await browser.open(
        `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style>${markup}`,
        Math.ceil(m.w),
        Math.ceil(m.h),
      );
      await browser.capture(path.join(OUT, `${base}.png`), { x: 0, y: 0, width: m.w, height: m.h, scale: 2000 / m.w });
      written.push({ file: `${base}.png`, size: `2000×${Math.round((2000 * m.h) / m.w)}`, note });
      console.log(`✓ ${base}`);
    }
  }

  for (const [base, cls, kind, markH, note] of slickLockups) {
    for (const [tone, colour] of [['black', INK], ['white', '#FFFFFF']] as const) {
      const gap = kind === 'badge' ? '.wm--stack{gap:0.18em}' : '';
      const body = `<div id="root"><div class="${cls}">${tileInline(markH, tone)}${word('s', 'Sincerely', 'sincerely')}${word('i', 'Ironic', 'ironic')}</div></div>`;
      await browser.open(page(body, faces, colour, `#mark{display:block}${gap}`), 5000, 2200);
      const m = await browser.evaluate<Measured>(MEASURE);
      const mk = m.parts.find((p) => p.id === 'mark');
      if (mk) {
        await svg(
          `${base}-${tone}.svg`,
          lockupSlickSvg(m, faces, colour, { x: mk.x, y: mk.y, w: mk.w, h: mk.h }),
          `${note}, ${tone} type`,
        );
      }
      const name = `${base}-${tone}.png`;
      await browser.capture(path.join(OUT, name), { x: 0, y: 0, width: m.w, height: m.h, scale: 2000 / m.w });
      written.push({ file: name, size: `2000×${Math.round((2000 * m.h) / m.w)}`, note: `${note}, ${tone} type` });
      console.log(`✓ ${name}`);
    }
  }

  await shutDown();

  /* ---- 5. the sheet ---- */
  const rows = written
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((w) => `| \`${w.file}\` | ${w.size} | ${w.note} |`)
    .join('\n');

  await writeFile(
    path.join(OUT, 'README.md'),
    `# Sincerely Ironic — brand sheet

Generated by \`pnpm logo-files\`. Do not hand-edit: change
\`scripts/logo-files.ts\` and re-run, so these stay in step with the mark the
site draws in \`src/components/Logo.tsx\` and the lockup in
\`src/components/Wordmark.tsx\`.

## Colour

The slick runs ${SLICK.join(' → ')}. Ink is \`${INK}\`, paper is \`${PAPER}\`.
Nothing else is brand colour; everything else is one of those at an opacity.

## The two faces

The name is set in two: **Sincerely** in Fraunces italic 500, \`SOFT\` 50,
\`WONK\` 1, optical size 20 — and **IRONIC** in Anybody 800 at \`wdth\` 125,
upper case. Both are letterspaced −0.01em. The SVGs carry their own webfonts
as data URLs, so they render correctly without either font installed.

## Clear space and minimum size

Keep clear on every side at least the **width of the smaller figure** — the
framed files already have it built in. Minimum size is 24px tall on screen;
below that, drop the glass and use a solid one-colour version.

## For embroidery

Use \`mark-solid-black.svg\` or \`mark-solid-white.svg\`. Embroidery allows at
most **six thread colours**, matched automatically from the file, and rejects
gradients — so the slick versions and the glass fill are not usable there.
Solid means both figures at full strength, with no 58% second figure.

## Files

| File | Raster size | Use |
| --- | --- | --- |
${rows}

Aspect ratios: \`1x1\` for avatars and app icons, \`16x9\` for slides and video
end-cards, \`4x5\` for feed posts, \`3x1\` for banners and email headers.
Layouts: \`row\` sets the name on one line, \`stack\` puts *Sincerely* over
*IRONIC*. Lockups combine the mark and the name.
`,
    'utf8',
  );

  console.log(`\n${written.length} files in ${OUT}`);
  } finally {
    await shutDown();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
