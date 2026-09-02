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
 *   pnpm print-files "" "" --both-inks   # also the opposite-ink counterpart
 *
 * A catalogue entry names one colourway, so by default each print is drawn in
 * the one ink that colourway needs. A Printify product carries BOTH colourways
 * as variants, though, and each needs its own file — dark ink on the natural
 * garment, light ink on the black one. `--both-inks` additionally writes a
 * `--alt` file in the opposite ink. The default filenames are untouched.
 *
 * Output: print-files/<handle>--<style>--<place>.png, plus a manifest.json
 * listing every file with its placement, pixel size and ink colour.
 *
 * Rendering uses the local Chrome in headless mode, so there is no image
 * dependency to install. Fonts come from Google Fonts at render time. One
 * browser is launched for the whole run and driven over the DevTools
 * protocol — a browser per file cost a start-up each time and looked, fairly,
 * like a runaway process.
 */

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

import { Chrome } from './chrome.ts';

import { catalog, type CatalogItem, type Place, type Print } from '../src/lib/catalog.ts';
import { EMBLEMS } from '../src/lib/emblems.ts';
import { resolvePrint, STYLES, type Placed, type StyleKey } from '../src/lib/typeset.ts';

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
  // 15x17, because that is what the blank actually is. Comfort Colors 1717 at
  // provider 99 tops out at 4494x5097 px — an aspect of 0.88, not the 0.83 of
  // the 15x18 that was assumed here. (12x16 is the legacy area; do not go
  // back to it.)
  //
  // These are the PHYSICAL panels the printer can reach. Where the artwork
  // sits inside one is a `PrintBox`, not an area — a left-chest hit is a
  // small box high on the front panel, not a 4x4in panel of its own. That
  // distinction is why prints used to land at the navel: a full-panel file
  // centred in a 17-inch area has its middle at the navel by construction.
  front: { w: 15, h: 17, label: 'Front' },
  back: { w: 15, h: 17, label: 'Back' },
  chest: { w: 15, h: 17, label: 'Left chest' },
  sleeve: { w: 3.5, h: 14, label: 'Sleeve' },
  leg: { w: 4, h: 16, label: 'Leg' },
  left: { w: 3, h: 1.5, label: 'Left' },
  right: { w: 3, h: 1.5, label: 'Right' },
};

const AREA_OVERRIDES: Partial<Record<CatalogItem['garment'], Partial<Record<Place, { w: number; h: number }>>>> = {
  // Embroidery maxima, per blueprint: a 6-panel cap front is 4x2.25in
  // (1200x675) and a bucket-hat front is 5.5x2in (1650x600). At most six
  // thread colours, auto-matched from the file — flat type is well inside.
  cap: { front: { w: 4, h: 2.25 } },
  bucket: { front: { w: 5.5, h: 2 } },
  // From the blueprint: a fanny pack front is 2323x846px and a kimono back
  // is 3484x5545px. Nothing like a tee panel, so nothing about the tee's
  // numbers applies.
  fannypack: { front: { w: 2323 / 300, h: 846 / 300 } },
  robe: { front: { w: 3484 / 300, h: 5545 / 300 } },
  // Unverified — these vary by blueprint. Check before ordering.
  tote: { front: { w: 12, h: 14 }, back: { w: 12, h: 14 } },
  blanket: { front: { w: 50, h: 60 } },
};

/** A bone garment takes ink; an ink garment takes bone. */
const INK = { bone: '#0D0D0D', ink: '#F3F3F0' } as const;

const OUT = path.resolve('print-files');
const BRAND = path.resolve('public/brand');
const ART = path.resolve('public/art');

/**
 * A ready-made brand asset, used where the artwork is the mark rather than a
 * slogan. These are vector with their webfonts already embedded, so they can
 * be dropped straight into the render page and scaled to any print size.
 */
type Art =
  | { kind: 'svg'; svg: string; aspect: number }
  | { kind: 'raster'; file: string; aspect: number };

const assetCache = new Map<string, Art>();

/** Anything with a file extension is supplied art in `public/art`. */
const RASTER = /\.(png|jpe?g)$/i;

/**
 * Pixel size straight out of the file header — a PNG's IHDR, or a JPEG's
 * first SOF. The aspect has to be the real one: `resolvePrint` divides the
 * emblem's width by it to decide how much headroom the block below needs, so
 * a guess here is a slogan printed over the artwork.
 */
function rasterSize(buf: Buffer): { w: number; h: number } {
  if (buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  for (let i = 2; i + 9 < buf.length; ) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0-SOF15, less the three markers that share the range but are not
    // frame headers (DHT, JPG, DAC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('no PNG or JPEG header to read a size from');
}

async function loadAsset(name: string, ink: string): Promise<Art> {
  // Supplied art carries its own colour, so unlike a brand asset it is not
  // toned to the garment and does not vary with the ink.
  if (RASTER.test(name)) {
    const hit = assetCache.get(name);
    if (hit) return hit;
    const { w, h } = rasterSize(await readFile(path.join(ART, name)));
    const entry: Art = { kind: 'raster', file: path.join(ART, name), aspect: w / h };
    assetCache.set(name, entry);
    return entry;
  }

  const tone = ink === INK.bone ? 'black' : 'white';
  const file = `${name.replace('{tone}', tone)}.svg`;
  const hit = assetCache.get(file);
  if (hit) return hit;
  const svg = await readFile(path.join(BRAND, file), 'utf8');
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!vb) throw new Error(`${file} has no viewBox to size it by`);
  const entry: Art = { kind: 'svg', svg, aspect: Number(vb[1]) / Number(vb[2]) };
  assetCache.set(file, entry);
  return entry;
}

/**
 * Content fingerprint. The upload ledger is keyed by file name, and file
 * names do not change when the artwork inside them does — so a redesign
 * silently re-used whatever had been uploaded under that name the first
 * time. The hash is what makes "already uploaded" mean "already uploaded
 * THIS".
 */
const sha = (buf: Buffer) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

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
 * The print as a standalone page: an SVG cut to the artwork, not to the
 * panel. The layout — box, block, aside, emblem — comes from `resolvePrint`,
 * the same call the vendor placement is derived from, so the file and the
 * position it is printed at can never disagree.
 */
function html(placed: Placed, print: Print, ink: string, art?: Art): string {
  if (art?.kind === 'svg') {
    // Scale the vector to the canvas by rewriting its own width and height;
    // the viewBox does the rest.
    // A brand asset is measured tight to its own ink, so drawn at the full
    // canvas it sits exactly on the edge and can lose a subpixel to the
    // capture. Inset it and centre it; the canvas is what gets positioned on
    // the garment, so the margin costs nothing but safety.
    const inset = 0.985;
    const w = placed.width * inset;
    const h = placed.height * inset;
    const sized = art.svg.replace(
      /^(<svg[^>]*?)\swidth="[^"]*"\sheight="[^"]*"/,
      `$1 width="${w.toFixed(2)}" height="${h.toFixed(2)}"`,
    );
    return `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:transparent}
  .f{width:${placed.width.toFixed(2)}px;height:${placed.height.toFixed(2)}px;display:flex;align-items:center;justify-content:center}
  svg{display:block}
</style>
<div class="f">${sized}</div>`;
  }

  const main = placed.block?.main.style;
  const aside = placed.block?.aside?.style;
  const body: string[] = [];

  if (placed.emblem) {
    const e = placed.emblem;
    if (art?.kind === 'raster') {
      // Supplied art rides the emblem slot, so `resolvePrint` has already
      // sized it and left the block its headroom underneath. Drawn exactly as
      // given: the artwork is not the mark, so it takes no `{tone}` recolour.
      body.push(
        `<image x="${e.x.toFixed(2)}" y="${e.y.toFixed(2)}" width="${e.w.toFixed(2)}" height="${e.h.toFixed(2)}" href="${path.basename(art.file)}" preserveAspectRatio="xMidYMid meet"/>`,
      );
    } else if (print.emblem) {
      body.push(emblemSvg(print.emblem, e.x, e.y, e.w, ink));
    }
  }

  const block = placed.block;
  if (block) {
    const cx = placed.width / 2;
    for (const line of block.main.lines) {
      const y = placed.blockTop + block.mainTop + line.y;
      body.push(
        `<text class="m" x="${cx.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle"` +
          (line.measure ? ` textLength="${line.measure.toFixed(2)}" lengthAdjust="spacingAndGlyphs"` : '') +
          `>${escape(line.text)}</text>`,
      );
    }
    if (block.aside) {
      const y = placed.blockTop + block.asideTop + block.aside.lines[0].y;
      body.push(`<text class="a" x="${cx.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle">${escape(block.aside.lines[0].text)}</text>`);
    }
  }

  const families = [...new Set([main?.googleFamily, aside?.googleFamily].filter(Boolean))] as string[];
  const href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=block`;
  const face = (st: typeof main) =>
    st
      ? `font-family: '${st.googleFamily.split(':')[0].replace(/\+/g, ' ')}';
    font-weight: ${st.weight};
    ${st.variation ? `font-variation-settings: ${st.variation};` : ''}
    ${st.letterSpacing ? `letter-spacing: ${st.letterSpacing}em;` : ''}`
      : '';

  return `<!doctype html>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${href}" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  svg { display: block; }
  text { fill: ${ink}; }
  .m { ${face(main)} font-size: ${(block?.main.fontSize ?? 0).toFixed(2)}px; }
  .a { ${face(aside)} font-size: ${(block?.aside?.fontSize ?? 0).toFixed(2)}px; }
</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(placed.width)}" height="${Math.round(placed.height)}" viewBox="0 0 ${placed.width.toFixed(2)} ${placed.height.toFixed(2)}">
    ${body.join('\n    ')}
</svg>`;
}

/**
 * Chrome writes no physical-density header, so the file reports 72 DPI even
 * though its pixel dimensions are 300. Vendors mostly compute density from
 * the print area and ignore it, but some read it, so stamp a pHYs chunk in
 * after IHDR and make the file say what it is.
 */
function stampDpi(png: Buffer, dpi: number): Buffer {
  if (png.length < 33 || png.readUInt32BE(12) !== 0x49484452) return png; // not IHDR

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
  return Buffer.concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)]);
}

async function main() {
  // Flags are pulled out first, so `--both-inks` on its own is not mistaken
  // for a handle filter.
  const args = process.argv.slice(2);
  const bothInks = args.includes('--both-inks');
  const positional = args.filter((a) => !a.startsWith('--'));
  const handleFilter = positional[0] ?? '';
  const styleFilter = (positional[1] || undefined) as StyleKey | undefined;

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
  const started = Date.now();

  const chrome = await Chrome.launch();
  // Whatever happens next, the browser does not outlive this process.
  const bail = () => {
    void chrome.close().finally(() => process.exit(130));
  };
  process.once('SIGINT', bail);
  process.once('SIGTERM', bail);

  try {
    for (const item of items) {
      if (item.prints.length === 0) {
        console.log(`· ${item.handle} — no print`);
        continue;
      }
      const styles = styleFilter ? item.styles.filter((s) => s === styleFilter) : item.styles;

      for (const styleKey of styles) {
        for (const print of item.prints) {
          // A placement can pin its own treatment — the gothic asides on
          // backs. Render a pinned one once rather than per product style.
          if (print.style && styleKey !== styles[0]) continue;
          const effective = print.style ?? styleKey;

          const { w, h, label } = area(item, print.place);
          const ink = INK[item.colourway];
          const art = print.asset ? await loadAsset(print.asset, ink) : undefined;
          // A brand lockup is the entire print and leaves no room for a
          // slogan. Supplied art is a picture the slogan sits under, so it
          // takes the emblem slot and the block below it still renders.
          const solo = art?.kind === 'svg';
          // Lay out in the panel's own pixel units, so the numbers coming
          // back are the file's and the vendor fractions are exact.
          const placed = resolvePrint(
            {
              place: print.place,
              text: solo ? undefined : print.text,
              style: effective,
              fill: print.fill,
              box: print.box,
              aside: solo ? undefined : print.aside,
              emblemAspect: art ? art.aspect : print.emblem ? 1 : undefined,
            },
            px(w),
            px(h),
          );
          const wPx = Math.round(placed.width);
          const hPx = Math.round(placed.height);
          const name = `${item.handle}--${styleKey}--${print.place}.png`;
          const page = path.join(tmp, `${name}.html`);

          // The page references the art by name, so it has to sit next to it.
          if (art?.kind === 'raster') await copyFile(art.file, path.join(tmp, path.basename(art.file)));
          await writeFile(page, html(placed, print, ink, art), 'utf8');
          // Supplied art makes a PNG too big to come back over CDP; flat
          // type does not, and the shared browser is far quicker for the
          // sixty prints that are only type. See `Chrome.capture`.
          const shot =
            art?.kind === 'raster'
              ? await Chrome.capture(page, wPx, hPx)
              : await chrome.shoot(page, wPx, hPx);
          const png = stampDpi(shot, DPI);
          await writeFile(path.join(OUT, name), png);

          if (bothInks) {
            // The same block in the ink the other colourway needs.
            const altInk = ink === INK.bone ? INK.ink : INK.bone;
            const altArt = print.asset ? await loadAsset(print.asset, altInk) : undefined;
            const altName = name.replace(/\.png$/, '--alt.png');
            const altPage = path.join(tmp, `${altName}.html`);
            await writeFile(altPage, html(placed, print, altInk, altArt), 'utf8');
            const altShot =
              altArt?.kind === 'raster'
                ? await Chrome.capture(altPage, wPx, hPx)
                : await chrome.shoot(altPage, wPx, hPx);
            const altPng = stampDpi(altShot, DPI);
            await writeFile(path.join(OUT, altName), altPng);
            manifest.push({
              file: altName,
              sha: sha(altPng),
              product: item.title,
              handle: item.handle,
              garment: item.garment,
              style: styleKey,
              typeface: STYLES[effective].label,
              placement: label,
              text: print.text ?? '',
              emblem: print.emblem ?? null,
              art: print.asset && RASTER.test(print.asset) ? print.asset : null,
              panelInches: `${w} × ${h}`,
              pixels: `${wPx} × ${hPx}`,
              box: placed.box,
              vendor: placed.vendor,
              dpi: DPI,
              ink: altInk,
              garmentColour: item.colourway === 'bone' ? 'ink' : 'bone',
            });
            console.log(`✓ ${altName}  ${wPx}×${hPx}`);
          }

          manifest.push({
            file: name,
            sha: sha(png),
            product: item.title,
            handle: item.handle,
            garment: item.garment,
            style: styleKey,
            typeface: STYLES[effective].label,
            placement: label,
            text: print.text ?? '',
            emblem: print.emblem ?? null,
            art: print.asset && RASTER.test(print.asset) ? print.asset : null,
            panelInches: `${w} × ${h}`,
            pixels: `${wPx} × ${hPx}`,
            box: placed.box,
            vendor: placed.vendor,
            dpi: DPI,
            ink,
            garmentColour: item.colourway,
          });
          console.log(`✓ ${name}  ${wPx}×${hPx}`);
        }
      }
    }
  } finally {
    await chrome.close();
  }

  await rm(tmp, { recursive: true, force: true });
  await writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${manifest.length} print files in ${OUT}  (${secs}s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
