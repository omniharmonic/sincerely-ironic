/**
 * Print-file generator.
 *
 * Turns every print in `src/lib/catalog.ts` into a transparent PNG at 300 DPI,
 * sized to the placement's print area — the file a print-on-demand vendor
 * wants uploaded. The type is set in the same faces the site uses, so what is
 * printed and what is drawn on the product page cannot drift.
 *
 *   pnpm print-files            # everything
 *   pnpm print-files two-wolves # handles containing "two-wolves"
 *
 * Output: print-files/<handle>--<place>.png, plus a manifest.json listing
 * every file with its placement, pixel size and ink colour.
 *
 * Rendering is done by the local Chrome in headless mode, so there is no
 * image dependency to install. Fonts come from Google Fonts at render time.
 */

import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import zlib from 'node:zlib';
import path from 'node:path';
import { promisify } from 'node:util';

import { catalog, type CatalogItem, type Print } from '../src/lib/catalog.ts';

const run = promisify(execFile);

const DPI = 300;
const inches = (n: number) => Math.round(n * DPI);

/**
 * Print areas in inches, by placement. Sized for Printify's DTG areas.
 *
 * These are defaults, not gospel: the authoritative numbers are per blueprint
 * and per print provider, from
 *   GET /v1/catalog/blueprints/{id}/print_providers/{pid}/variants.json
 * which returns the exact printable pixel size for each placeholder. Pull that
 * once the blanks are chosen and correct anything here that disagrees —
 * Printify runs a DPI check at product creation and rejects a bad file with
 * `400 code 8203`.
 */
const AREAS: Record<Print['place'], { w: number; h: number; label: string }> = {
  // 15x18 is the current standard DTG area; 12x16 is the legacy one and
  // throws away a third of the canvas.
  front: { w: 15, h: 18, label: 'Front' },
  back: { w: 15, h: 18, label: 'Back' },
  chest: { w: 4, h: 4, label: 'Left chest' },
  left: { w: 4, h: 4, label: 'Left' },
  right: { w: 4, h: 4, label: 'Right' },
  sleeve: { w: 3.5, h: 14, label: 'Sleeve' },
};

/** Smaller areas for the garments that are not a shirt. */
const AREA_OVERRIDES: Partial<Record<CatalogItem['garment'], Partial<Record<Print['place'], { w: number; h: number }>>>> = {
  // Embroidery: 4x2.5in is the maximum on a standard 6-panel front, and the
  // design may use at most six thread colours. Flat type is well inside that.
  cap: { front: { w: 4, h: 2.5 } },
  // Unverified — tote areas vary by blueprint. Check before ordering.
  tote: { front: { w: 12, h: 14 }, back: { w: 12, h: 14 } },
  sock: { left: { w: 3, h: 1.5 }, right: { w: 3, h: 1.5 } },
};

/** A bone garment takes ink; an ink garment takes bone. */
const INK = { bone: '#0D0D0D', ink: '#F3F3F0' } as const;

const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const OUT = path.resolve('print-files');

function area(item: CatalogItem, place: Print['place']) {
  const base = AREAS[place];
  const override = AREA_OVERRIDES[item.garment]?.[place];
  return { ...base, ...override };
}

/**
 * The print, as a standalone page sized exactly to the print area. The type
 * scales to fill the width, matching how the site sets it: display prints in
 * Anybody, lowercase asides in Fraunces italic.
 */
function html(item: CatalogItem, print: Print, wPx: number, hPx: number): string {
  const ink = INK[item.colourway];
  const isText = print.face === 'text';
  const family = isText ? 'Fraunces' : 'Anybody';
  // The catalogue's scale is tuned for the on-screen art, where the panel is
  // a different shape. Here the browser measures the real type and grows it
  // until it fills the safe area; scale only ever trims from that maximum, so
  // a print can never overrun its panel.
  const trim = Math.min(1, print.scale ?? 1);
  const boxW = Math.round(wPx * 0.9);
  const boxH = Math.round(hPx * 0.86);

  return `<!doctype html>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@75..125,800&family=Fraunces:ital,opsz,wght,SOFT,WONK@1,9..144,500,50,1&display=block" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body {
    width: ${wPx}px; height: ${hPx}px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .print {
    width: ${boxW}px;
    color: ${ink};
    font-family: '${family}', sans-serif;
    font-size: 100px;
    line-height: 0.9;
    text-align: center;
    max-width: 94%;
    ${isText
      ? `font-style: italic; font-weight: 500; font-variation-settings: 'SOFT' 50, 'WONK' 1, 'opsz' 120; line-height: 1.08;`
      : `font-weight: 800; font-variation-settings: 'wdth' 112; text-transform: ${print.text === print.text.toUpperCase() ? 'uppercase' : 'none'}; letter-spacing: -0.02em;`}
    overflow-wrap: normal;
    word-break: keep-all;
  }
</style>
<div class="print">${print.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>
<script>
  (function () {
    var el = document.querySelector('.print');
    function fits(px) {
      el.style.fontSize = px + 'px';
      return el.scrollHeight <= ${boxH} && el.scrollWidth <= ${boxW} + 1;
    }
    function fit() {
      var lo = 6, hi = ${boxH};
      for (var i = 0; i < 34; i++) {
        var mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid; else hi = mid;
      }
      el.style.fontSize = (lo * ${trim}).toFixed(2) + 'px';
      document.documentElement.dataset.fitted = 'yes';
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    else window.addEventListener('load', fit);
  })();
</script>`;
}

/**
 * Chrome writes no physical-density header, so the file reports 72 DPI even
 * though its pixel dimensions are 300. Vendors mostly compute density from
 * the print area and ignore it, but some read it, so stamp a pHYs chunk in
 * after IHDR and make the file say what it is.
 */
async function stampDpi(file: string, dpi: number) {
  const png = await readFile(file);
  if (png.length < 33 || png.readUInt32BE(12) !== 0x49484452) return; // not IHDR

  const perMetre = Math.round(dpi / 0.0254);
  const data = Buffer.alloc(9);
  data.writeUInt32BE(perMetre, 0);
  data.writeUInt32BE(perMetre, 4);
  data.writeUInt8(1, 8); // unit: metre

  const type = Buffer.from('pHYs', 'ascii');
  const chunk = Buffer.concat([
    Buffer.alloc(4), // length, filled below
    type,
    data,
    Buffer.alloc(4), // crc, filled below
  ]);
  chunk.writeUInt32BE(data.length, 0);
  chunk.writeUInt32BE(zlib.crc32(Buffer.concat([type, data])), 8 + data.length);

  const ihdrEnd = 8 + 8 + png.readUInt32BE(8) + 4;
  await writeFile(file, Buffer.concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)]));
}

async function render(file: string, out: string, w: number, h: number) {
  await run(CHROME, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--window-size=${w},${h}`,
    '--virtual-time-budget=6000',
    `--screenshot=${out}`,
    `file://${file}`,
  ]).catch((e: unknown) => {
    // Chrome writes diagnostics to stderr and still exits non-zero on some
    // machines; the screenshot is what matters, so surface and carry on.
    console.warn(`  chrome: ${(e as Error).message.split('\n')[0]}`);
  });
}

async function main() {
  const filter = process.argv[2];
  const items = filter ? catalog.filter((c) => c.handle.includes(filter)) : catalog;
  if (items.length === 0) {
    console.error(`No catalogue handle matches "${filter}".`);
    process.exit(1);
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const tmp = path.join(OUT, '.tmp');
  await mkdir(tmp, { recursive: true });

  const manifest: Record<string, unknown>[] = [];

  for (const item of items) {
    if (item.prints.length === 0) {
      console.log(`· ${item.handle} — no print`);
      continue;
    }
    for (const print of item.prints) {
      const { w, h, label } = area(item, print.place);
      const wPx = inches(w);
      const hPx = inches(h);
      const name = `${item.handle}--${print.place}.png`;
      const page = path.join(tmp, `${item.handle}-${print.place}.html`);

      await writeFile(page, html(item, print, wPx, hPx), 'utf8');
      const outFile = path.join(OUT, name);
      await render(page, outFile, wPx, hPx);
      await stampDpi(outFile, DPI);

      manifest.push({
        file: name,
        product: item.title,
        handle: item.handle,
        garment: item.garment,
        placement: label,
        text: print.text,
        inches: `${w} × ${h}`,
        pixels: `${wPx} × ${hPx}`,
        dpi: DPI,
        ink: INK[item.colourway],
        garmentColour: item.colourway,
      });
      console.log(`✓ ${name}  ${wPx}×${hPx}  ${INK[item.colourway]}`);
    }
  }

  await rm(tmp, { recursive: true, force: true });
  await writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`\n${manifest.length} print files in ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
