/**
 * Placement proof.
 *
 * Composites the generated print files onto a real garment photograph at
 * exactly the position and scale the vendor will use, so a placement can be
 * judged by eye before anything is uploaded, published, or ordered.
 *
 *   pnpm placement-proof            # every tee in the catalogue
 *   pnpm placement-proof wolves     # handles containing "wolves"
 *
 * The print-area rectangle below is measured, not assumed. Printify centres
 * a file in the panel at `x`/`y` and scales it against the panel's WIDTH, so
 * an old full-panel file's ink told us where the panel is: the four-line
 * wolves block spanned 425px of a 1200px mockup at scale 1.0, and its measure
 * is 0.94 of the panel, which puts the panel at 452px wide. Checked against a
 * second product — the predicted centre of the "quietly disrespectful" chest
 * hit lands within 3px of where it actually prints.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Chrome } from './chrome.ts';
import { catalog } from '../src/lib/catalog.ts';

/** The tee front panel, in the 1200x1200 mockup's pixels. */
const PANEL = { x: 374, y: 341, w: 452, h: 512 };
/** Landmarks, for the annotation: where the collar and hem fall. */
const COLLAR = 250;
const HEM = 1040;

const OUT = path.resolve(process.env.PROOF_DIR ?? 'print-files/proof');

interface Row {
  file: string;
  handle: string;
  pixels: string;
  vendor: { x: number; y: number; scale: number };
}

async function main() {
  const filter = process.argv[2] ?? '';
  const manifest = JSON.parse(await readFile('print-files/manifest.json', 'utf8')) as Row[];
  const mockups = JSON.parse(await readFile('scripts/printify-mockups.json', 'utf8')) as Record<
    string,
    { images: string[] }
  >;

  // A nearly-blank garment to composite onto: the smallest print we ship.
  const blank = mockups['quietly-disrespectful-tee']?.images[0];
  if (!blank) throw new Error('no blank mockup to composite onto');

  const tees = new Set(catalog.filter((c) => c.garment === 'tee').map((c) => c.handle));
  const rows = manifest
    .filter((r) => tees.has(r.handle) && !r.file.includes('--alt') && !r.file.includes('--back'))
    .filter((r) => (filter ? r.file.includes(filter) : true));

  await mkdir(OUT, { recursive: true });
  const chrome = await Chrome.launch();
  try {
    for (const row of rows) {
      const bytes = await readFile(path.join('print-files', row.file));
      const [iw, ih] = row.pixels.split('×').map((n) => Number(n.trim()));
      const w = row.vendor.scale * PANEL.w;
      const h = w * (ih / iw);
      const left = PANEL.x + row.vendor.x * PANEL.w - w / 2;
      const top = PANEL.y + row.vendor.y * PANEL.h - h / 2;
      const dropIn = ((top - COLLAR) / (PANEL.h / 17)).toFixed(1);

      const page = path.join(OUT, `${row.handle}.html`);
      await writeFile(
        page,
        `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0}
  .s{position:relative;width:1200px;height:1200px;background:#fff}
  .s img.g{position:absolute;inset:0;width:1200px;height:1200px}
  .s img.p{position:absolute;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px}
  .r{position:absolute;left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px;outline:1px dashed rgba(255,0,120,.45)}
  .c{position:absolute;left:0;right:0;height:0;border-top:1px dashed rgba(0,120,255,.5)}
  .l{position:absolute;font:600 15px ui-monospace,monospace;color:#c0006e;background:#fff;padding:2px 6px}
</style>
<div class="s">
  <img class="g" src="${blank}">
  <img class="p" src="data:image/png;base64,${bytes.toString('base64')}">
  <div class="r"></div>
  <div class="c" style="top:${COLLAR}px"></div>
  <div class="c" style="top:${HEM}px"></div>
  <div class="l" style="left:8px;top:${COLLAR - 22}px">collar</div>
  <div class="l" style="left:8px;top:8px">${row.handle} — top of art sits collar +${dropIn}in</div>
</div>`,
        'utf8',
      );
      const shot = await chrome.shoot(page, 1200, 1200);
      await writeFile(path.join(OUT, `${row.handle}.png`), shot);
      console.log(`✓ ${row.handle.padEnd(42)} collar +${dropIn}in`);
    }
  } finally {
    await chrome.close();
  }
  console.log(`\n${rows.length} proofs in ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
