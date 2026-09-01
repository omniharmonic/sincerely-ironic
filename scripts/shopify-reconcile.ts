/**
 * Emit the Shopify mutations that finish a Printify-created listing.
 *
 *   pnpm shopify-reconcile            # writes batches to .reconcile/
 *
 * Printify creates the listing, which is what binds it to a printer, but it
 * names it its own way: the handle comes from the title, the vendor is
 * "Printify", and the product type is the blueprint's ("T-Shirt", not "Tee").
 * It also knows nothing about the second reading. This writes the mutations
 * that put the catalogue's decisions back on top — including the handle,
 * which a Shopify product will happily change.
 *
 * The Shopify credential in this project is an MCP connection rather than a
 * token a script can hold, so this emits GraphQL rather than executing it.
 * Batched, because one mutation document can carry many aliased fields and
 * fifty-seven round trips is not a plan.
 *
 * Note `productUpdate(product:)`, not `input:` — the latter is deprecated.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { catalog } from '../src/lib/catalog.ts';
import { SHOP_ID } from './printify.ts';

const LINKS = path.resolve('scripts/shopify-links.json');
const OUT = path.resolve('.reconcile');

/** The Headless sales channel on the live store. */
const HEADLESS = 'gid://shopify/Publication/191281955014';
const ONLINE_STORE = 'gid://shopify/Publication/191248269510';

/** Products per mutation document. */
const BATCH = 8;

type Links = Record<string, Record<string, { printifyId: string; shopifyId: string; shopifyHandle: string }>>;

const esc = (s: string) => JSON.stringify(s);

async function main() {
  const links = JSON.parse(await readFile(LINKS, 'utf8')) as Links;
  const shop = links[SHOP_ID];
  if (!shop) throw new Error(`no links recorded for shop ${SHOP_ID}`);

  const rows = catalog
    .filter((c) => shop[c.handle])
    .map((c) => ({ item: c, link: shop[c.handle] }));

  const missing = catalog.filter((c) => !shop[c.handle]).map((c) => c.handle);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  let batch = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const parts: string[] = [];
    slice.forEach(({ item, link }, n) => {
      const gid = `gid://shopify/Product/${link.shopifyId}`;
      parts.push(
        `  u${n}: productUpdate(product: {
    id: ${esc(gid)}
    handle: ${esc(item.handle)}
    title: ${esc(item.title)}
    vendor: ${esc('Sincerely Ironic')}
    productType: ${esc(item.type)}
    redirectNewHandle: false
    metafields: [{ namespace: "sincerely", key: "ironic_description", type: "multi_line_text_field", value: ${esc(item.description.ironic)} }]
  }) { product { handle productType } userErrors { field message } }`,
      );
      parts.push(
        `  p${n}: publishablePublish(id: ${esc(gid)}, input: [{ publicationId: ${esc(HEADLESS)} }, { publicationId: ${esc(ONLINE_STORE)} }]) { userErrors { field message } }`,
      );
    });
    const doc = `mutation {\n${parts.join('\n')}\n}\n`;
    const file = path.join(OUT, `batch-${String(batch).padStart(2, '0')}.graphql`);
    await writeFile(file, doc, 'utf8');
    console.log(`${file}  ${slice.length} products`);
    batch += 1;
  }

  console.log(`\n${rows.length} products across ${batch} batches.`);
  if (missing.length) {
    console.log(`${missing.length} catalogue entries have no Shopify link yet:`);
    for (const h of missing) console.log(`  ${h}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
