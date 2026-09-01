/**
 * Create a Printify product for every catalogue entry.
 *
 *   pnpm printify-products                 # dry run: prints what it would do
 *   pnpm printify-products --create        # actually create them
 *   pnpm printify-products --create tee    # only handles containing "tee"
 *
 * Products are created UNPUBLISHED. Nothing reaches Shopify until someone
 * calls publish, deliberately — publishing would make Printify create its own
 * Shopify listing alongside the one we already seeded, which is exactly the
 * duplicate we are avoiding.
 *
 * One product per design, in that design's default treatment only. Printify's
 * variant options are fixed by the blueprint at colour and size, so a second
 * type treatment cannot be a variant — it would have to be a whole second
 * product, and 61 designs times three treatments is not a catalogue anyone
 * wants to manage.
 *
 * Each product carries both colourways, and the two get different artwork:
 * the dark-ink file on the natural garment, the light-ink `--alt` on the
 * black. `print_areas` is a list and each entry names its own `variant_ids`,
 * which is the one place Printify's data model is more flexible than its
 * option model. Order matters: Printify expands the last group to swallow
 * every variant not named in an earlier one.
 *
 * Idempotent. Every created product is recorded in `printify-products.json`
 * by handle, and a re-run skips anything already there.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { catalog, type CatalogItem, type Place } from '../src/lib/catalog.ts';
import type { StyleKey } from '../src/lib/typeset.ts';
import { api, SHOP_ID } from './printify.ts';
import { loadMap, type UploadMap } from './printify-upload.ts';

const LEDGER = path.resolve('scripts/printify-products.json');

/** Where a print sits inside its area, as fractions of the area. */
interface Placement {
  x: number;
  y: number;
  /** Cap on the fitted scale, as a fraction of the area's width. */
  maxScale?: number;
}

interface Blank {
  blueprint: number;
  provider: number;
  /** Colour names as Printify spells them, [natural, black]. Null = no colour option. */
  colours: [string, string] | null;
  /** Catalogue placement → Printify placeholder position. */
  positions: Partial<Record<Place, string>>;
  /** Sizes we sell, as Printify spells them. Omit to take all. */
  sizes?: string[];
  /** Where each print sits. Centred and filling unless overridden. */
  placement?: Partial<Record<Place, Placement>>;
}

/**
 * Blueprint and print provider per garment. Two providers cover the line:
 * 99 Printify Choice and 39 SwiftPOD, both US.
 */
const BLANKS: Partial<Record<CatalogItem['garment'], Blank>> = {
  tee: {
    blueprint: 706, // Comfort Colors 1717
    provider: 99,
    colours: ['Ivory', 'Black'],
    positions: { front: 'front', back: 'back', chest: 'front' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    // A left-chest hit is about a quarter of the panel, set high and left.
    placement: { chest: { x: 0.31, y: 0.22, maxScale: 0.28 } },
  },
  longsleeve: {
    blueprint: 710, // Comfort Colors 6014
    provider: 99,
    colours: ['Ivory', 'Black'],
    positions: { front: 'front', back: 'back', chest: 'front', sleeve: 'left_sleeve' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    placement: { chest: { x: 0.31, y: 0.22, maxScale: 0.28 } },
  },
  crewneck: {
    blueprint: 1405, // Comfort Colors 1466 lightweight
    provider: 39,
    colours: ['Ivory', 'Black'],
    positions: { front: 'front', back: 'back', chest: 'front' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    placement: { chest: { x: 0.31, y: 0.22, maxScale: 0.28 } },
  },
  hoodie: {
    blueprint: 1528, // Comfort Colors 1467 lightweight
    provider: 99,
    colours: ['Ivory', 'Black'],
    positions: { front: 'front', back: 'back', chest: 'front' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    // Above the pocket, so the print is not swallowed by it.
    placement: { front: { x: 0.5, y: 0.42 }, chest: { x: 0.31, y: 0.22, maxScale: 0.28 } },
  },
  sweatpants: {
    blueprint: 1398, // Gildan 18200
    provider: 39,
    // This blank has no Ivory; Sand is its natural.
    colours: ['Sand', 'Black'],
    positions: { leg: 'left_leg_front' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    // High on the thigh, the way a track pant carries a wordmark.
    placement: { leg: { x: 0.5, y: 0.26 } },
  },
  cap: {
    blueprint: 1447, // Yupoong 6245CM dad cap
    provider: 99,
    // Stone is this cap's natural; it has no Ivory.
    colours: ['Stone', 'Black'],
    positions: { front: 'front' }, // embroidery
  },
  bucket: {
    blueprint: 1910, // Big Accessories BX003
    provider: 99,
    // Only Black, Navy and White exist here, so White stands in for natural.
    colours: ['White', 'Black'],
    positions: { front: 'front' }, // embroidery
  },
  tote: {
    blueprint: 1313, // Liberty Bags OAD113
    provider: 99,
    colours: ['Natural', 'Black'],
    positions: { front: 'front', back: 'back' },
  },
  blanket: {
    blueprint: 238, // Sherpa Fleece Blanket
    provider: 99,
    // Sized only — no colour axis, so it takes a single print group.
    colours: null,
    positions: { front: 'front' },
    sizes: ['60" × 80"'],
  },
};

/** Already made in Printify by hand; do not duplicate them. */
const ALREADY_THEIRS = new Set(['yard-sign', 'fanny-pack', 'long-sleeve-kimono-robe-aop']);

interface Variant {
  id: number;
  title: string;
  options: Record<string, string>;
  placeholders: { position: string; width: number; height: number }[];
}

type Ledger = Record<string, { id: string; blueprint: number; provider: number; style: string }>;

async function loadLedger(): Promise<Ledger> {
  if (!existsSync(LEDGER)) return {};
  return JSON.parse(await readFile(LEDGER, 'utf8')) as Ledger;
}

async function saveLedger(l: Ledger) {
  await writeFile(LEDGER, `${JSON.stringify(l, null, 2)}\n`, 'utf8');
}

/**
 * How far to scale artwork so it sits inside the print area.
 *
 * Printify measures `scale` against the area's width, so an image
 * proportionally taller than the area runs off the top and bottom at scale 1.
 * Fitting by the tighter axis keeps every print inside its panel.
 */
function fitScale(imgW: number, imgH: number, areaW: number, areaH: number): number {
  return Math.min(1, areaH / areaW / (imgH / imgW));
}

const variantCache = new Map<string, Variant[]>();

async function variantsFor(blank: Blank): Promise<Variant[]> {
  const key = `${blank.blueprint}/${blank.provider}`;
  const hit = variantCache.get(key);
  if (hit) return hit;
  const res = await api<{ variants: Variant[] }>(
    'GET',
    `/catalog/blueprints/${blank.blueprint}/print_providers/${blank.provider}/variants.json`,
  );
  variantCache.set(key, res.variants);
  return res.variants;
}

function pick(all: Variant[], blank: Blank, colour: string | null): Variant[] {
  return all.filter((v) => {
    if (colour !== null && v.options.color !== colour) return false;
    if (!blank.sizes) return true;
    return blank.sizes.includes(v.options.size);
  });
}

interface Built {
  body: Record<string, unknown>;
  note: string;
}

function build(item: CatalogItem, style: StyleKey, uploads: UploadMap, all: Variant[]): Built {
  const blank = BLANKS[item.garment];
  if (!blank) throw new Error(`no blank mapped for garment "${item.garment}"`);

  // Which variants each ink goes on.
  const groups: { variants: Variant[]; useAsDrawn: boolean }[] = [];
  if (blank.colours) {
    const natural = pick(all, blank, blank.colours[0]);
    const black = pick(all, blank, blank.colours[1]);
    if (natural.length === 0) throw new Error(`no "${blank.colours[0]}" variants`);
    if (black.length === 0) throw new Error(`no "${blank.colours[1]}" variants`);
    // A bone entry is drawn dark, so its own file belongs on the natural
    // garment; an ink entry is drawn light and its opposite is the dark one.
    groups.push({ variants: natural, useAsDrawn: item.colourway === 'bone' });
    groups.push({ variants: black, useAsDrawn: item.colourway !== 'bone' });
  } else {
    const only = pick(all, blank, null);
    if (only.length === 0) throw new Error('no variants matched');
    groups.push({ variants: only, useAsDrawn: item.colourway === 'bone' });
  }

  // Which prints this blank can actually carry.
  const prints = item.prints.filter((p) => blank.positions[p.place]);
  if (prints.length === 0) throw new Error(`blank carries none of: ${item.prints.map((p) => p.place).join(', ')}`);

  const priceCents = Math.round(item.price * 100);
  const notes: string[] = [];

  const printAreas = groups.map((group) => {
    const sample = group.variants[0];
    return {
      variant_ids: group.variants.map((v) => v.id),
      placeholders: prints.map((print) => {
        const position = blank.positions[print.place] as string;
        const area = sample.placeholders.find((p) => p.position === position);
        if (!area) throw new Error(`no "${position}" placeholder on variant ${sample.id}`);

        // A placement pinned to its own treatment — the gothic back asides —
        // is rendered once and filed under the design's DEFAULT style, not
        // the pinned one. `print.style` changes how it is set, not where the
        // generator puts it.
        const base = `${item.handle}--${style}--${print.place}`;
        const asDrawn = uploads[`${base}.png`];
        const opposite = uploads[`${base}--alt.png`];
        const file = group.useAsDrawn ? asDrawn : (opposite ?? asDrawn);
        if (!file) throw new Error(`no upload for ${base}`);

        const spot = blank.placement?.[print.place];
        let scale = fitScale(file.width, file.height, area.width, area.height);
        if (spot?.maxScale) scale = Math.min(scale, spot.maxScale);

        notes.push(`${print.place}→${position} ${area.width}×${area.height} @${scale.toFixed(3)}`);

        return {
          position,
          images: [
            {
              id: file.id,
              x: spot?.x ?? 0.5,
              y: spot?.y ?? 0.5,
              scale: Number(scale.toFixed(4)),
              angle: 0,
            },
          ],
        };
      }),
    };
  });

  const variants = groups
    .flatMap((g) => g.variants)
    .map((v) => ({ id: v.id, price: priceCents, is_enabled: true }));

  return {
    body: {
      title: item.title,
      description: item.description.sincere,
      blueprint_id: blank.blueprint,
      print_provider_id: blank.provider,
      variants,
      print_areas: printAreas,
    },
    note:
      `bp${blank.blueprint}/p${blank.provider} · ` +
      `${groups.map((g) => g.variants.length).join('+')} variants · ` +
      [...new Set(notes)].join(' · '),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const create = args.includes('--create');
  const filter = args.find((a) => !a.startsWith('--')) ?? '';

  const uploads = await loadMap();
  const ledger = await loadLedger();

  const queue = catalog
    .filter((c) => !ALREADY_THEIRS.has(c.handle))
    .filter((c) => BLANKS[c.garment])
    .filter((c) => (filter ? c.handle.includes(filter) : true))
    .filter((c) => !ledger[c.handle]);

  const unmapped = [...new Set(catalog.filter((c) => !BLANKS[c.garment] && !ALREADY_THEIRS.has(c.handle)).map((c) => c.garment))];

  console.log(
    `${catalog.length} in catalogue · ${ALREADY_THEIRS.size} already theirs · ` +
      `${Object.keys(ledger).length} already built · ${queue.length} to build` +
      (unmapped.length ? ` · unmapped garments: ${unmapped.join(', ')}` : ''),
  );
  if (queue.length === 0) {
    console.log('\nNothing to do.');
    return;
  }
  console.log('');

  const failures: { handle: string; reason: string }[] = [];
  let made = 0;

  for (const item of queue) {
    const style = item.styles[0];
    const blank = BLANKS[item.garment] as Blank;
    try {
      const all = await variantsFor(blank);
      const { body, note } = build(item, style, uploads, all);
      console.log(`${item.handle} (${style})\n  ${note}`);

      if (!create) {
        console.log('  (dry run)');
        continue;
      }

      const res = await api<{ id: string }>('POST', `/shops/${SHOP_ID}/products.json`, body);
      ledger[item.handle] = {
        id: res.id,
        blueprint: blank.blueprint,
        provider: blank.provider,
        style,
      };
      made += 1;
      console.log(`  created ${res.id}`);
      // Persist as we go: an interruption should never cost more than one.
      await saveLedger(ledger);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      failures.push({ handle: item.handle, reason });
      console.warn(`${item.handle}\n  ✗ ${reason}`);
    }
  }

  if (create) await saveLedger(ledger);

  console.log(`\n${made} created, ${failures.length} failed. Ledger holds ${Object.keys(ledger).length}.`);
  for (const f of failures) console.log(`  ${f.handle}: ${f.reason}`);
  if (create) console.log('\nAll unpublished. Nothing has reached Shopify.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
