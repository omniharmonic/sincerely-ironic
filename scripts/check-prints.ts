/**
 * Ink check.
 *
 * Every generated print file is cut tight to its artwork, which means a bad
 * metric no longer shows up as slack in a big canvas — it shows up as a
 * sheared glyph. This measures where the ink actually is in each PNG and
 * fails on anything touching an edge, so a clipped descender is caught here
 * rather than on a garment.
 *
 *   pnpm check-prints
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { Chrome } from './chrome.ts';

const OUT = path.resolve('print-files');
/** A file is clipped if ink reaches within this many pixels of an edge. */
const EDGE = 1;

interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  w: number;
  h: number;
}

async function main() {
  const filter = process.argv[2] ?? '';
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.png') && f.includes(filter));
  if (files.length === 0) throw new Error('no print files to check');

  // A print built from supplied art is a rectangle that is meant to reach its
  // own edges, so the tight-to-ink rule cannot apply to it — the rule exists
  // to catch a sheared glyph, and a photograph has none. These are still
  // measured and still fail on an empty file; only the edge test is dropped.
  const manifest = JSON.parse(await readFile(path.join(OUT, 'manifest.json'), 'utf8')) as {
    file: string;
    art: string | null;
    text: string;
  }[];
  // Art alone is exempt outright. Art with a slogan under it is not: the
  // picture owns the top and sides, but the bottom edge is the type's, and the
  // bottom edge is where a descender or a comma shears off. Exempting the
  // whole file because part of it is a photograph would have quietly retired
  // the check that has already caught both.
  const artOnly = new Set(manifest.filter((m) => m.art && !m.text).map((m) => m.file));
  const artOverType = new Set(manifest.filter((m) => m.art && m.text).map((m) => m.file));

  const chrome = await Chrome.launch();
  const bad: string[] = [];
  try {
    for (const file of files) {
      const bytes = await readFile(path.join(OUT, file));
      const bounds = await chrome.evaluate<Bounds | null>(`(async () => {
        const img = new Image();
        img.src = 'data:image/png;base64,${bytes.toString('base64')}';
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            // Ignore near-transparent antialias fringe.
            if (d[(y * c.width + x) * 4 + 3] > 12) {
              if (x < x0) x0 = x; if (x > x1) x1 = x;
              if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
          }
        }
        return x1 < 0 ? null : { x0, y0, x1, y1, w: c.width, h: c.height };
      })()`);

      if (!bounds) {
        bad.push(`${file} — no ink at all`);
        console.log(`✗ ${file}  EMPTY`);
        continue;
      }
      const overType = artOverType.has(file);
      const touches: string[] = [];
      if (!overType && bounds.x0 <= EDGE) touches.push('left');
      if (!overType && bounds.y0 <= EDGE) touches.push('top');
      if (!overType && bounds.x1 >= bounds.w - 1 - EDGE) touches.push('right');
      if (bounds.y1 >= bounds.h - 1 - EDGE) touches.push('bottom');

      const slack = `t${bounds.y0} b${bounds.h - 1 - bounds.y1} l${bounds.x0} r${bounds.w - 1 - bounds.x1}`;
      if (artOnly.has(file)) {
        console.log(`· ${file.padEnd(52)} ${slack}   art only, edges not checked`);
      } else if (touches.length) {
        bad.push(`${file} — ink reaches the ${touches.join(' and ')} edge`);
        console.log(`✗ ${file.padEnd(52)} ${slack}   CLIPPED: ${touches.join(', ')}`);
      } else {
        console.log(`✓ ${file.padEnd(52)} ${slack}`);
      }
    }
  } finally {
    await chrome.close();
  }

  console.log(`\n${files.length} checked, ${bad.length} clipped.`);
  for (const b of bad) console.log(`  ${b}`);
  if (bad.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
