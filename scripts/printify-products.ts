/**
 * Create Printify products from the catalogue.
 *
 *   pnpm printify-products              # dry run: prints what it would do
 *   pnpm printify-products --create     # actually create them
 *
 * Products are created UNPUBLISHED. Nothing reaches Shopify until someone
 * calls publish, deliberately.
 *
 * Each product carries both colourways as variants, and the two groups get
 * different artwork: the dark-ink file on the natural garment, the light-ink
 * `--alt` file on the black one. Printify allows this because `print_areas`
 * is a list, each entry naming its own `variant_ids` — the one place its data
 * model is more flexible than its option model, which is fixed at colour and
 * size and is why a type treatment has to be its own product.
 */

import { catalog, type CatalogItem } from '../src/lib/catalog.ts';
import type { StyleKey } from '../src/lib/typeset.ts';
import { api, SHOP_ID } from './printify.ts';
import { loadMap, type UploadMap } from './printify-upload.ts';

/** What a garment maps to in Printify, and which colours we sell it in. */
interface Blank {
  blueprint: number;
  provider: number;
  /** Colour names as Printify spells them: [natural, black]. */
  colours: [string, string];
  /** The placeholder position our `front` print goes to. */
  position: string;
  /** Sizes we sell, as Printify spells them. */
  sizes?: string[];
}

const BLANKS: Partial<Record<CatalogItem['garment'], Blank>> = {
  tee: {
    blueprint: 706,
    provider: 99,
    colours: ['Ivory', 'Black'],
    position: 'front',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
  hoodie: {
    blueprint: 1528,
    provider: 99,
    colours: ['Ivory', 'Black'],
    position: 'front',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
  cap: {
    blueprint: 1447,
    provider: 99,
    // Stone is this cap's natural; it has no Ivory.
    colours: ['Stone', 'Black'],
    position: 'front',
  },
};

interface Variant {
  id: number;
  title: string;
  options: Record<string, string>;
  placeholders: { position: string; width: number; height: number }[];
}

/**
 * How far to scale the artwork so it sits inside the print area.
 *
 * Printify measures `scale` against the print area's width, so an image that
 * is proportionally taller than the area would run off the top and bottom at
 * scale 1. Fitting by the tighter of the two axes keeps every print inside
 * its panel.
 */
function fitScale(imgW: number, imgH: number, areaW: number, areaH: number): number {
  const byWidth = 1;
  const byHeight = areaH / areaW / (imgH / imgW);
  return Math.min(byWidth, byHeight);
}

async function variantsFor(blank: Blank): Promise<Variant[]> {
  const res = await api<{ variants: Variant[] }>(
    'GET',
    `/catalog/blueprints/${blank.blueprint}/print_providers/${blank.provider}/variants.json`,
  );
  return res.variants;
}

function pick(all: Variant[], blank: Blank, colour: string): Variant[] {
  return all.filter((v) => {
    if (v.options.color !== colour) return false;
    if (!blank.sizes) return true;
    return blank.sizes.includes(v.options.size);
  });
}

async function build(item: CatalogItem, style: StyleKey, uploads: UploadMap) {
  const blank = BLANKS[item.garment];
  if (!blank) throw new Error(`No blank mapped for garment "${item.garment}"`);

  const base = `${item.handle}--${style}--front`;
  // The catalogue entry's own ink is in the plain file; its opposite is the
  // `--alt`. Which of those is dark depends on the entry's colourway, so name
  // them by role rather than by colour.
  const asDrawn = uploads[`${base}.png`];
  const opposite = uploads[`${base}--alt.png`];
  if (!asDrawn || !opposite) {
    throw new Error(`Missing uploads for ${base} (run pnpm print-files "" "" --both-inks, then pnpm printify-upload)`);
  }
  // A natural garment takes dark ink and a black one takes light. A `bone`
  // entry is already drawn dark, so it goes on the natural; an `ink` entry is
  // drawn light and its opposite is the dark one.
  const [onNatural, onBlack] =
    item.colourway === 'bone' ? [asDrawn, opposite] : [opposite, asDrawn];

  const all = await variantsFor(blank);
  const natural = pick(all, blank, blank.colours[0]);
  const black = pick(all, blank, blank.colours[1]);
  if (natural.length === 0 || black.length === 0) {
    throw new Error(`No variants for ${blank.colours.join('/')} on blueprint ${blank.blueprint}`);
  }

  const areaOf = (v: Variant) => {
    const p = v.placeholders.find((x) => x.position === blank.position);
    if (!p) throw new Error(`No "${blank.position}" placeholder on variant ${v.id}`);
    return p;
  };

  const naturalArea = areaOf(natural[0]);
  const blackArea = areaOf(black[0]);

  const priceCents = Math.round(item.price * 100);

  const variants = [...natural, ...black].map((v) => ({
    id: v.id,
    price: priceCents,
    is_enabled: true,
  }));

  const printAreas = [
    {
      variant_ids: natural.map((v) => v.id),
      placeholders: [
        {
          position: blank.position,
          images: [
            {
              id: onNatural.id,
              x: 0.5,
              y: 0.5,
              scale: Number(
                fitScale(onNatural.width, onNatural.height, naturalArea.width, naturalArea.height).toFixed(4),
              ),
              angle: 0,
            },
          ],
        },
      ],
    },
    {
      variant_ids: black.map((v) => v.id),
      placeholders: [
        {
          position: blank.position,
          images: [
            {
              id: onBlack.id,
              x: 0.5,
              y: 0.5,
              scale: Number(
                fitScale(onBlack.width, onBlack.height, blackArea.width, blackArea.height).toFixed(4),
              ),
              angle: 0,
            },
          ],
        },
      ],
    },
  ];

  return {
    title: item.title,
    description: item.description.sincere,
    blueprint_id: blank.blueprint,
    print_provider_id: blank.provider,
    variants,
    print_areas: printAreas,
    _debug: {
      handle: item.handle,
      style,
      naturalColour: blank.colours[0],
      blackColour: blank.colours[1],
      naturalVariants: natural.length,
      blackVariants: black.length,
      area: `${naturalArea.width}×${naturalArea.height}`,
      image: `${onNatural.width}×${onNatural.height}`,
      scale: printAreas[0].placeholders[0].images[0].scale,
    },
  };
}

async function main() {
  const create = process.argv.includes('--create');
  const uploads = await loadMap();

  // One of each construction: DTG tee, DTG hoodie, embroidered cap. All the
  // same design, so the three are directly comparable.
  const targets: [string, StyleKey][] = [
    ['culture-war-veteran-tee', 'wide'],
    ['culture-war-veteran-hoodie', 'wide'],
    ['culture-war-veteran-cap', 'wide'],
  ];

  for (const [handle, style] of targets) {
    const item = catalog.find((c) => c.handle === handle);
    if (!item) {
      console.error(`✗ ${handle} is not in the catalogue`);
      continue;
    }

    const body = await build(item, style, uploads);
    const debug = body._debug;
    delete (body as { _debug?: unknown })._debug;

    console.log(`\n${handle} (${style})`);
    console.log(
      `  blueprint ${body.blueprint_id} / provider ${body.print_provider_id} · ` +
        `${debug.naturalColour} ×${debug.naturalVariants}, ${debug.blackColour} ×${debug.blackVariants}`,
    );
    console.log(`  area ${debug.area} · image ${debug.image} · scale ${debug.scale}`);

    if (!create) {
      console.log('  (dry run — pass --create to make it)');
      continue;
    }

    const made = await api<{ id: string; title: string }>(
      'POST',
      `/shops/${SHOP_ID}/products.json`,
      body,
    );
    console.log(`  created ${made.id}`);

    // Read it back: the two-group print_areas is the whole point, so prove it
    // survived the round trip rather than trusting the 200.
    const back = await api<{
      id: string;
      variants: { id: number; price: number; cost: number; is_enabled: boolean; title: string }[];
      print_areas: { variant_ids: number[]; placeholders: { position: string; images: { id: string }[] }[] }[];
    }>('GET', `/shops/${SHOP_ID}/products/${made.id}.json`);

    console.log(`  print_areas back: ${back.print_areas.length} group(s)`);
    for (const g of back.print_areas) {
      const img = g.placeholders[0]?.images[0]?.id ?? 'none';
      console.log(`    ${g.variant_ids.length} variants → image ${img}`);
    }
    const enabled = back.variants.filter((v) => v.is_enabled);
    const costs = [...new Set(enabled.map((v) => v.cost))].sort((a, b) => a - b);
    const prices = [...new Set(enabled.map((v) => v.price))];
    console.log(
      `  ${enabled.length} enabled · cost ${costs.map((c) => `$${(c / 100).toFixed(2)}`).join('–')} · ` +
        `price ${prices.map((p) => `$${(p / 100).toFixed(2)}`).join(',')}`,
    );
  }

  console.log(create ? '\nCreated. Nothing published.' : '\nDry run only.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
