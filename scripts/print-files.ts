/**
 * Print-file generator.
 *
 * Every print in `src/lib/catalog.ts`, in every type treatment it ships in,
 * rendered to a transparent PNG at 300 DPI and sized to the placement's print
 * area — the file a print-on-demand vendor wants uploaded.
 *
 * The layout comes from `src/lib/typeset.ts`, the same engine that draws the
 * garment art on the site, so what a customer sees and what the printer
 * receives cannot drift apart.
 *
 *   pnpm print-files                 # everything
 *   pnpm print-files two-wolves      # handles containing "two-wolves"
 *   pnpm print-files "" gothic       # every design, gothic only
 *
 * Output: print-files/<handle>--<style>--<place>.png, plus a manifest.json
 * listing every file with its placement, pixel size and ink colour.
 *
 * Rendering uses the local Chrome in headless mode, so there is no image
 * dependency to install. Fonts come from Google Fonts at render time.
 */

import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

import { catalog, type CatalogItem, type Place, type Print } from '../src/lib/catalog.ts';
import { EMBLEMS } from '../src/lib/emblems.ts';
import { splitPanel, STYLES, typeset, type StyleKey } from '../src/lib/typeset.ts';

const run = promisify(execFile);

const DPI = 300;
const px = (inches: number) => Math.round(inches * DPI);

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
const AREAS: Record<Place, { w: number; h: number; label: string }> = {
  // 15x18 is the current standard DTG area; 12x16 is the legacy one and
  // throws away a third of the canvas.
  front: { w: 15, h: 18, label: 'Front' },
  back: { w: 15, h: 18, label: 'Back' },
  chest: { w: 4, h: 4, label: 'Left chest' },
  sleeve: { w: 3.5, h: 14, label: 'Sleeve' },
  // A leg hit is a wordmark near the thigh, not a banner down the whole
  // panel. Printify's own leg area is 4x16in; the artwork wants far less.
  leg: { w: 4, h: 5, label: 'Leg' },
  left: { w: 3, h: 1.5, label: 'Left' },
  right: { w: 3, h: 1.5, label: 'Right' },
};

const AREA_OVERRIDES: Partial<Record<CatalogItem['garment'], Partial<Record<Place, { w: number; h: number }>>>> = {
  // Embroidery maxima, per blueprint: a 6-panel cap front is 4x2.25in
  // (1200x675) and a bucket-hat front is 5.5x2in (1650x600). At most six
  // thread colours, auto-matched from the file — flat type is well inside.
  cap: { front: { w: 4, h: 2.25 } },
  bucket: { front: { w: 5.5, h: 2 } },
  // Unverified — these vary by blueprint. Check before ordering.
  tote: { front: { w: 12, h: 14 }, back: { w: 12, h: 14 } },
  blanket: { front: { w: 50, h: 60 } },
};

/** A bone garment takes ink; an ink garment takes bone. */
const INK = { bone: '#0D0D0D', ink: '#F3F3F0' } as const;

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const OUT = path.resolve('print-files');

function area(item: CatalogItem, place: Place) {
  return { ...AREAS[place], ...AREA_OVERRIDES[item.garment]?.[place] };
}

const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The emblem's primitives as SVG, scaled into its box. */
function emblemSvg(which: keyof typeof EMBLEMS, x: number, y: number, size: number, ink: string): string {
  const emblem = EMBLEMS[which];
  const parts = emblem.shapes.map((sh) => {
    const paint = sh.stroke
      ? `fill="none" stroke="${ink}" stroke-width="${sh.stroke}"`
      : `fill="${ink}"`;
    if (sh.circle) return `<circle cx="${sh.circle.cx}" cy="${sh.circle.cy}" r="${sh.circle.r}" ${paint}/>`;
    if (sh.points) return `<polygon points="${sh.points}" ${paint}/>`;
    return `<path d="${sh.d}" ${paint}/>`;
  });
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(size / emblem.size).toFixed(5)})">
      ${parts.join('\n      ')}
    </g>`;
}

/**
 * The print as a standalone page: an SVG the exact pixel size of the print
 * area, with the emblem and the block laid out by the shared engine.
 */
function html(print: Print, styleKey: StyleKey, ink: string, w: number, h: number): string {
  const style = STYLES[styleKey];
  const split = splitPanel(Boolean(print.emblem), Boolean(print.text), w, h);

  let fontSize = 0;
  const body: string[] = [];

  if (print.emblem && split.emblem) {
    body.push(emblemSvg(print.emblem, split.emblem.x, split.emblem.y, split.emblem.size, ink));
  }

  if (print.text && split.text) {
    const box = split.text;
    // Lay out in the panel's own pixel units, so the numbers are the file's.
    const layout = typeset(print.text, styleKey, box.w, box.h, print.fill ?? 1);
    fontSize = layout.fontSize;
    const top = box.y + (box.h - layout.height) / 2;
    for (const line of layout.lines) {
      body.push(
        `<text x="${(box.x + box.w / 2).toFixed(2)}" y="${(top + line.y).toFixed(2)}" text-anchor="middle"` +
          (line.measure ? ` textLength="${line.measure.toFixed(2)}" lengthAdjust="spacingAndGlyphs"` : '') +
          `>${escape(line.text)}</text>`,
      );
    }
  }

  const href = `https://fonts.googleapis.com/css2?family=${style.googleFamily}&display=block`;

  return `<!doctype html>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${href}" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  svg { display: block; }
  text {
    fill: ${ink};
    font-family: '${style.googleFamily.split(':')[0].replace(/\+/g, ' ')}';
    font-weight: ${style.weight};
    font-size: ${fontSize.toFixed(2)}px;
    ${style.variation ? `font-variation-settings: ${style.variation};` : ''}
    ${style.letterSpacing ? `letter-spacing: ${style.letterSpacing}em;` : ''}
  }
</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${body.join('\n    ')}
</svg>`;
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
  const chunk = Buffer.concat([Buffer.alloc(4), type, data, Buffer.alloc(4)]);
  chunk.writeUInt32BE(data.length, 0);
  chunk.writeUInt32BE(zlib.crc32(Buffer.concat([type, data])), 8 + data.length);

  const ihdrEnd = 8 + 8 + png.readUInt32BE(8) + 4;
  await writeFile(file, Buffer.concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)]));
}

async function render(page: string, out: string, w: number, h: number) {
  await run(CHROME, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--window-size=${w},${h}`,
    '--virtual-time-budget=6000',
    `--screenshot=${out}`,
    `file://${page}`,
  ]).catch((e: unknown) => {
    // Chrome writes diagnostics to stderr and can still exit non-zero on some
    // machines; the screenshot is what matters, so surface and carry on.
    console.warn(`  chrome: ${(e as Error).message.split('\n')[0]}`);
  });
}

async function main() {
  const handleFilter = process.argv[2] ?? '';
  const styleFilter = process.argv[3] as StyleKey | undefined;

  const items = handleFilter ? catalog.filter((c) => c.handle.includes(handleFilter)) : catalog;
  if (items.length === 0) {
    console.error(`No catalogue handle matches "${handleFilter}".`);
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
    const styles = styleFilter ? item.styles.filter((s) => s === styleFilter) : item.styles;

    for (const styleKey of styles) {
      for (const print of item.prints) {
        // A placement can pin its own treatment — the gothic asides on backs.
        // Render a pinned one once rather than per product style.
        if (print.style && styleKey !== styles[0]) continue;
        const effective = print.style ?? styleKey;

        const { w, h, label } = area(item, print.place);
        const wPx = px(w);
        const hPx = px(h);
        const name = `${item.handle}--${styleKey}--${print.place}.png`;
        const page = path.join(tmp, `${name}.html`);
        const ink = INK[item.colourway];

        await writeFile(page, html(print, effective, ink, wPx, hPx), 'utf8');
        const outFile = path.join(OUT, name);
        await render(page, outFile, wPx, hPx);
        await stampDpi(outFile, DPI);

        manifest.push({
          file: name,
          product: item.title,
          handle: item.handle,
          garment: item.garment,
          style: styleKey,
          typeface: STYLES[effective].label,
          placement: label,
          text: print.text ?? '',
          emblem: print.emblem ?? null,
          inches: `${w} × ${h}`,
          pixels: `${wPx} × ${hPx}`,
          dpi: DPI,
          ink,
          garmentColour: item.colourway,
        });
        console.log(`✓ ${name}  ${wPx}×${hPx}`);
      }
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
