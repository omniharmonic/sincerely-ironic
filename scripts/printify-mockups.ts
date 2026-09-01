/**
 * Choose which Printify mockups belong on each Shopify listing.
 *
 *   pnpm printify-mockups            # writes scripts/printify-mockups.json
 *   pnpm printify-mockups two-wolves # only handles containing that
 *
 * Printify renders four mockups per colourway — front, back, and two staged
 * shots. This picks the few worth showing and writes a plan keyed by Shopify
 * handle; the Admin API calls that attach them are made separately, because
 * the Shopify credential here is an MCP connection rather than a token a
 * script can hold.
 *
 * The colourway is chosen to match the catalogue entry, so the photograph
 * shows the same garment colour the drawn art did and the grid does not
 * change complexion when real images land.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { catalog } from '../src/lib/catalog.ts';
import { api, SHOP_ID } from './printify.ts';

const LEDGER = path.resolve('scripts/printify-products.json');
const OUT = path.resolve('scripts/printify-mockups.json');
const MUTATIONS = path.resolve('scripts/printify-mockups-mutations.txt');

/** How many mockups to put on a listing. The site shows photography and
 *  nothing else now, so a listing wants every angle Printify rendered, not a
 *  chosen few — capped only to keep one product from flooding the gallery. */
const KEEP = 8;

interface Entry {
  id: string;
  blueprint: number;
  provider: number;
  style: string;
}

/** Keyed by shop first: a Printify shop is one sales-channel connection, and
 *  the same handle exists in each shop as a different product. */
type Ledger = Record<string, Record<string, Entry>>;

interface Image {
  src: string;
  variant_ids: number[];
  position: string;
  is_default: boolean;
}

interface Product {
  id: string;
  title: string;
  images: Image[];
  variants: { id: number; title: string; is_enabled: boolean }[];
}

export interface Plan {
  [handle: string]: { printifyId: string; title: string; images: string[] };
}

async function main() {
  const filter = process.argv[2] ?? '';

  if (!existsSync(LEDGER)) throw new Error('no product ledger — run pnpm printify-products --create first');
  const ledger = JSON.parse(await readFile(LEDGER, 'utf8')) as Ledger;
  const forShop = ledger[SHOP_ID] ?? {};
  if (Object.keys(forShop).length === 0) {
    throw new Error(
      `the ledger holds nothing for shop ${SHOP_ID} — it knows about ${Object.keys(ledger).join(', ') || 'no shops'}`,
    );
  }

  const handles = Object.keys(forShop).filter((h) => (filter ? h.includes(filter) : true));
  const plan: Plan = {};
  const problems: string[] = [];

  for (const handle of handles) {
    const item = catalog.find((c) => c.handle === handle);
    if (!item) {
      problems.push(`${handle}: not in the catalogue`);
      continue;
    }

    const product = await api<Product>('GET', `/shops/${SHOP_ID}/products/${forShop[handle].id}.json`);

    // Which variants wear the colour this design was drawn on. Everything that
    // is not Black is the natural colourway, whatever the blank calls it —
    // Ivory, Stone, Sand, Natural, White.
    const wantBlack = item.colourway === 'ink';
    const titleOf = new Map(product.variants.map((v) => [v.id, v.title]));
    const matches = (img: Image) => {
      const title = titleOf.get(img.variant_ids[0]) ?? '';
      return /black/i.test(title) === wantBlack;
    };

    const mine = product.images.filter(matches);
    const pool = mine.length > 0 ? mine : product.images;
    if (mine.length === 0) problems.push(`${handle}: no mockup on the ${wantBlack ? 'black' : 'natural'} colourway, used what there was`);

    // Front first, then the back if this design has one, then a staged shot.
    const rank = (img: Image) =>
      img.position === 'front' ? 0 : img.position === 'back' ? 1 : 2;
    const hasBack = item.prints.some((p) => p.place === 'back');
    const chosen = pool
      .filter((img) => (hasBack ? true : img.position !== 'back'))
      .sort((a, b) => rank(a) - rank(b) || Number(b.is_default) - Number(a.is_default))
      .slice(0, KEEP);

    if (chosen.length === 0) {
      problems.push(`${handle}: no usable mockups`);
      continue;
    }

    plan[handle] = {
      printifyId: product.id,
      title: product.title,
      images: chosen.map((img) => img.src),
    };
    console.log(`${handle}  ${chosen.length} mockups  (${chosen.map((c) => c.position).join(', ')})`);
  }

  await writeFile(OUT, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

  // Also emit the Admin API calls, batched, ready to run. Shopify is reached
  // through an MCP connection here rather than a token a script can hold, so
  // the mutations are handed over as text rather than sent.
  const ids = JSON.parse(await readFile(path.resolve('scripts/shopify-ids.json'), 'utf8')) as Record<string, string>;
  const entries = Object.entries(plan).filter(([h]) => ids[h]);
  const missing = Object.keys(plan).filter((h) => !ids[h]);

  const CHUNK = 10;
  const blocks: string[] = [];
  for (let i = 0; i < entries.length; i += CHUNK) {
    const lines = entries.slice(i, i + CHUNK).map(([handle, p], n) => {
      const media = p.images
        .map((src) => `{originalSource: "${src}", mediaContentType: IMAGE, alt: ${JSON.stringify(p.title)}}`)
        .join(', ');
      const alias = `m${n}`;
      return `  ${alias}: productCreateMedia(productId: "gid://shopify/Product/${ids[handle]}", media: [${media}]) { mediaUserErrors { field message } }`;
    });
    blocks.push(`mutation {\n${lines.join('\n')}\n}`);
  }

  await writeFile(MUTATIONS, `${blocks.join('\n\n---\n\n')}\n`, 'utf8');

  console.log(`\n${Object.keys(plan).length} listings planned → ${OUT}`);
  console.log(`${blocks.length} mutation blocks → ${MUTATIONS}`);
  for (const h of missing) problems.push(`${h}: no Shopify id in shopify-ids.json`);
  for (const p of problems) console.log(`  ! ${p}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
