/**
 * Publish Printify products to the connected Shopify store.
 *
 *   pnpm printify-publish            # dry run
 *   pnpm printify-publish --go       # actually publish
 *   pnpm printify-publish --go tee   # only handles containing "tee"
 *
 * This is the step that makes the shop a shop.
 *
 * Every listing on the old store was seeded straight into Shopify from the
 * catalogue, and Printify recorded no `external` link for 58 of 61 products —
 * so an order on any of them would have taken money and reached no printer.
 * A listing Printify creates is bound to a Printify product; one we create is
 * a picture of a product. Only the first can be fulfilled.
 *
 * Printify pushes asynchronously, so this fires every publish and then polls
 * until each product reports the Shopify id it created, recording the pairs
 * in `scripts/shopify-links.json` for the reconcile that follows.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { api, SHOP_ID } from './printify.ts';

const LEDGER = path.resolve('scripts/printify-products.json');
const LINKS = path.resolve('scripts/shopify-links.json');

/**
 * What Printify should push.
 *
 * Only the things Printify is the authority on. The flags mean "update this
 * field", and the copy is ours: title and description come from the
 * catalogue, and letting Printify rewrite them on every republish undoes the
 * reconcile.
 *
 * It is not enough on its own. Printify also resets `vendor` to "Printify"
 * and `productType` to the blueprint's own category — "Sweatshirt", "Bags",
 * "All Over Prints" — and those are not behind any flag. So a republish
 * ALWAYS needs the Shopify reconcile run after it, or the shop's filter row
 * grows categories the catalogue never had.
 */
const WHAT = {
  title: false,
  description: false,
  images: true,
  variants: true,
  tags: false,
  keyFeatures: false,
  shipping_template: true,
};

type Ledger = Record<string, Record<string, { id: string }>>;
type Links = Record<string, Record<string, { printifyId: string; shopifyId: string; shopifyHandle: string }>>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const go = args.includes('--go');
  const filter = args.find((a) => !a.startsWith('--')) ?? '';

  if (!existsSync(LEDGER)) throw new Error('no product ledger — run pnpm printify-products --create first');
  const ledger = JSON.parse(await readFile(LEDGER, 'utf8')) as Ledger;
  const shop = ledger[SHOP_ID];
  if (!shop) throw new Error(`the ledger holds nothing for shop ${SHOP_ID}`);

  const links: Links = existsSync(LINKS) ? JSON.parse(await readFile(LINKS, 'utf8')) : {};
  links[SHOP_ID] ??= {};
  const done = links[SHOP_ID];

  const queue = Object.entries(shop)
    .filter(([h]) => (filter ? h.includes(filter) : true))
    .filter(([h]) => !done[h]);

  console.log(
    `shop ${SHOP_ID} · ${Object.keys(shop).length} products · ${Object.keys(done).length} already linked · ${queue.length} to publish`,
  );
  if (queue.length === 0) return console.log('\nNothing to do.');
  if (!go) {
    for (const [h] of queue) console.log(`  would publish ${h}`);
    return console.log('\n(dry run — pass --go)');
  }

  // Fire them all first; Printify queues the pushes and does them in parallel,
  // so polling one at a time would serialise work that is already concurrent.
  const pending = new Map<string, string>();
  for (const [handle, entry] of queue) {
    try {
      await api('POST', `/shops/${SHOP_ID}/products/${entry.id}/publish.json`, WHAT);
      pending.set(handle, entry.id);
      console.log(`→ ${handle}`);
    } catch (e) {
      console.warn(`✗ ${handle} — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\n${pending.size} queued. Waiting for Shopify ids…`);
  for (let round = 0; round < 60 && pending.size > 0; round += 1) {
    await sleep(8000);
    for (const [handle, id] of [...pending]) {
      const p = await api<{ external?: { id: string; handle: string } }>(
        'GET',
        `/shops/${SHOP_ID}/products/${id}.json`,
      );
      if (!p.external?.id) continue;
      done[handle] = {
        printifyId: id,
        shopifyId: p.external.id,
        shopifyHandle: p.external.handle.split('/products/').pop() ?? '',
      };
      pending.delete(handle);
      console.log(`✓ ${handle} → ${p.external.id} (${done[handle].shopifyHandle})`);
      await writeFile(LINKS, `${JSON.stringify(links, null, 2)}\n`, 'utf8');
    }
  }

  await writeFile(LINKS, `${JSON.stringify(links, null, 2)}\n`, 'utf8');
  console.log(`\n${Object.keys(done).length} linked. ${pending.size} still pending.`);
  for (const [h] of pending) console.log(`  pending: ${h}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
