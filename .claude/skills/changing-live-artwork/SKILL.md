---
name: changing-live-artwork
description: Use when the artwork, slogan, placement or colourway of a Sincerely Ironic product that is already published to Shopify has changed and the new version must reach the live store. Covers the update, the mockup wait, the forced republish and the re-reconcile.
---

# Changing live artwork

Changing a product that already exists is not the same as making one, and the
differences are all silent. Three separate flags exist purely for this path,
and omitting any of them produces "success" with nothing changed.

**REQUIRED BACKGROUND:** the pipeline and its shop-id trap are in
**shipping-a-design**. This skill covers only what differs.

## The three flags that differ

| Step | New product | Existing product |
|---|---|---|
| Printify product | `--create` | `--create --update <handle>` |
| Publish | `--go` | `--go --force <handle>` |
| Shopify reconcile | required | **still required** |

- `printify-products --update` alone is a **dry run**. `--create` is the flag
  that writes; `--update` only makes an already-built product eligible. Running
  `--update` by itself prints the full plan, says `(dry run)`, and changes
  nothing.
- `printify-publish` skips any handle already in `shopify-links.json`, so
  without `--force` it reports `0 to publish · Nothing to do` and exits 0. That
  looks like success and is the most likely way to believe you shipped a change
  you did not.

## The order

**Step 0 is the repo edit**, and it is easy to skip because the command list
below starts at a render. A changed design is a changed `src/lib/catalog.ts`
entry, or a new file in `public/art` — the pipeline only propagates what the
catalogue already says. Do not change `slug` or the garment unless you mean to
change the URL: the handle keys the catalogue, the Printify ledger,
`shopify-links.json` and the reconcile.

```bash
export PRINTIFY_SHOP_ID=28782180     # do NOT source .env.local; scripts read it

pnpm print-files --both-inks                       # unfiltered: a filtered run
pnpm check-prints                                  #   rm -rf's the whole dir
pnpm placement-proof <handle>
pnpm printify-upload                               # content-hash keyed
pnpm printify-products --create --update <handle>
#   ... wait for mockups, then LOOK at one ...
pnpm printify-publish --go --force <handle>
pnpm shopify-reconcile                             # then run the batch via MCP
pnpm build && git add -A && git commit && git push origin main
#   ... then verify live ...
```

The handle is a **bare positional**, never a flag's value. `--update=<handle>`
makes `args.includes('--update')` false and silently degrades the run to a dry
run. Flags and handle are separate words.

**The last two lines are not optional.** The catalogue edit, the Printify
ledger and `shopify-links.json` are all tracked, and the site's fallback art
and `generateStaticParams` come from the catalogue — leaving them uncommitted
means the repo and the store disagree. Then verify live, as in
**shipping-a-design** step 11: page 200s, card on the grid, right garment
leading, new art in the gallery, and add to cart reaching `Cart (1)`. ISR is
300s, so allow five minutes or let the deploy bust it.

## The mockup wait is the whole risk

Printify re-renders mockups asynchronously after an artwork change, and publish
ships whatever renders exist at that instant. Publishing too early puts the
**previous design's photographs** on the listing, and it will look fine in every
log you have. Allow 2–3 minutes, then download `images[0].src` and look at it.
Confirm you are seeing the new art before you publish.

Publishing **replaces** the listing's media rather than appending — a product
with eight mockups still has eight afterwards, with fresh `createdAt`
timestamps. So a stale-looking gallery means the publish went early, not that
old images need deleting.

### A successful publish is not evidence on a republish

`printify-publish` polls until the product reports an `external.id`. On a
republish that field is **already set**, so the poll returns on its first round
and the script prints `✓ <handle> → <id>` within seconds whether or not
Printify pushed anything. Using `--force` correctly does not protect you from
this. The only proof is the Shopify listing afterwards: query its media and
check the `createdAt` timestamps are from this run.

## Always re-reconcile

Printify resets `vendor` to "Printify" and `productType` to the blueprint's
category on **every** publish, including a forced republish of a product you
already reconciled once. Neither is behind a flag. It also renames the handle
from the title, which breaks the site, because the catalogue keys art by handle
and a Shopify product with no catalogue entry is filtered out.

Run `pnpm shopify-reconcile`, find your product's batch, and execute it:

```bash
grep -l <handle> .reconcile/batch-*.graphql
```

Then Shopify MCP `graphql_mutation` with those aliases. Verify the response
shows `handle`, `vendor: "Sincerely Ironic"`, `productType: "Tee"` and empty
`userErrors`.

## If the colourway changed

`colourway` decides which ink file is "as drawn" and therefore which garment
gets which file. Flipping `bone` ↔ `ink` swaps them, so the render **must** be
redone with `--both-inks` or one colour ships unreadable type. It also changes
which garment the site leads with; `lead` overrides that independently when
merchandising and ink disagree.

## Red flags

- `Nothing to do.` from publish → you forgot `--force`.
- `(dry run)` from products → you forgot `--create`.
- Mockups still show the old design → you published before the re-render.
- Shop filter row shows "T-Shirt" or "Sweatshirt" → you skipped the reconcile.
- Site 404s or the card vanishes → the handle no longer matches the catalogue.
- `✓ <handle> → <id>` seconds after publishing → normal on a republish, and
  proof of nothing. Check the listing's media timestamps.
- Reaching for a Shopify id in `scripts/shopify-ids.json` → dead dev-store ids.
  The live pairing is `scripts/shopify-links.json`, keyed by shop.
