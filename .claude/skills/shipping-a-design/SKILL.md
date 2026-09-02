---
name: shipping-a-design
description: Use when adding a new garment, slogan, or design to the Sincerely Ironic store and it must end up purchasable on sincerelyironic.com. Covers catalogue entry through Printify creation, publish, Shopify reconcile and live verification.
---

# Shipping a design

A design becomes a purchasable product by passing through four systems in a
fixed order: repo → Printify → Shopify → deploy. Skipping or reordering a step
does not fail loudly; it produces a listing that looks right and cannot be
fulfilled, or a product the site refuses to show.

**Printify must create the Shopify listing.** A listing Printify created is
bound to a printer. One created any other way is a picture of a product that
takes money and reaches nobody. Never seed a Shopify product by hand.

## Before anything

```bash
export PRINTIFY_SHOP_ID=28782180        # the live shop
```

Do **not** source `.env.local`. Every script calls `loadToken()`, which reads
the file off disk itself; sourcing only copies the token into the environment
where any `env` or process dump leaks it. Export it only if you need it for an
ad-hoc `curl`, and never echo it.

`PRINTIFY_SHOP_ID` is **not in `.env.local`**, and every `printify-*` script
silently falls back to `12124343` — the dead dev shop — when it is unset. There
is no error. Export it once per shell and confirm the script echoes
`Printify shop 28782180 (from PRINTIFY_SHOP_ID)`.

## The order

| # | Step | Command |
|---|---|---|
| 1 | Catalogue entry | edit `src/lib/catalog.ts` |
| 2 | Render print files | `pnpm print-files --both-inks` |
| 3 | Check the ink | `pnpm check-prints` |
| 4 | Check the placement | `pnpm placement-proof <handle>` |
| 5 | Upload art | `pnpm printify-upload` |
| 6 | Create the product | `pnpm printify-products --create <handle>` |
| 7 | **Wait for mockups** | poll, then look at one |
| 8 | Publish | `pnpm printify-publish --go <handle>` |
| 9 | Reconcile Shopify | `pnpm shopify-reconcile` + MCP |
| 10 | Deploy | commit, push `main` |
| 11 | Verify live | see below |

### 1. Catalogue entry

One `DESIGNS` entry plus one `make(...)` line is the whole code change:

```ts
grass: { slug: 'touch-grass-allegedly', title: 'Touch Grass, Allegedly',
         prints: front('Touch grass, allegedly') },
// then, in `catalog`:
make(D.grass, 'tee', 'ink'),
```

The handle is `<slug>-<garment suffix>` and must match Shopify exactly later.
`colourway` is which ink the art is drawn in — `ink` = light art for a black
garment, `bone` = dark art for a light one. Do not add a `styles` array: one
treatment per design. For anything other than plain type, read
**placing-print-artwork** first.

### 2–4. Make the files and prove them

`--both-inks` is not optional. Each tee sells in two colours and each needs its
own ink file; without it the opposite colour silently gets the as-drawn file,
which is white type on ivory.

`pnpm print-files` does `rm -rf print-files/` **even with a filter**, so a
filtered run leaves a manifest holding only those rows. Run it unfiltered
before any unfiltered downstream command.

`check-prints` fails on ink touching an edge — it has already caught a lost
comma and a lost blackletter descender. Supplied art is exempt and prints as
`art, edges not checked`.

### 5–6. Printify

**The handle is a bare positional, never a flag's value.** The scripts take it
as `args.find(a => !a.startsWith('--'))`, so `--update=<handle>` makes
`args.includes('--update')` false and the run silently degrades to a dry run —
the exact failure the flag exists to avoid. Write the flags and the handle as
separate words.

Uploads are keyed by content hash, so re-running is free and changed bytes
re-upload under the same name. Run `printify-products` with no flags first and
read the dry run: two colour groups, the right file against each, and zero `!`
blocker lines. `--create` is the flag that writes.

### 7. Wait for mockups — the step that is easy to skip

Printify re-renders mockups **asynchronously**, and publish ships whatever
renders exist at that instant. Expect roughly 2–3 minutes. Do not trust a
timer: fetch `images[0].src` and actually look at it before publishing.

```bash
PID=$(python3 -c "import json;print(json.load(open('scripts/printify-products.json'))['28782180']['<handle>'].get('id'))")
curl -s -H "Authorization: Bearer $(grep -m1 '^PRINTIFY_API_TOKEN=' .env.local | cut -d= -f2-)" \
  "https://api.printify.com/v1/shops/$PRINTIFY_SHOP_ID/products/$PID.json" \
  | python3 -c 'import json,sys; p=json.load(sys.stdin); print(len(p["images"]), p["images"][0]["src"])'
```

That ledger is keyed by shop and holds a row for the same handle under the dead
shop `12124343`; read from `['28782180']` or you will poll the wrong product.

### 8–9. Publish, then always reconcile

Publish is what binds the listing to a printer. Printify then names it its own
way: handle from the title, `vendor` "Printify", `productType` the blueprint's
category. **Every publish resets those, and none of it is behind a flag**, so
the reconcile always comes after the publish, never before.

`pnpm shopify-reconcile` writes `.reconcile/batch-NN.graphql` and makes no
network calls; the Shopify credential here is an MCP connection, not a token a
script can hold. Find your product's batch with
`grep -l <handle> .reconcile/batch-*.graphql` and run it with the Shopify MCP
`graphql_mutation`, after checking the shop is `fkpeqz-bp.myshopify.com`.

Running only the aliases you need is fine, but `u<N>` (productUpdate) and
`p<N>` (publishablePublish) are **a pair** — send `u3` without `p3` and the
product keeps its correct handle while never reaching the sales channels. The
batch file and the alias numbers are regenerated each run and shift as the
catalogue grows, so re-derive both every time rather than reusing a note.
Expect every `userErrors` to be `[]`.

**Never take a Shopify id from `scripts/shopify-ids.json`.** It is a leftover
from the retired dev store and its ids are dead. The live pairing is
`scripts/shopify-links.json`, keyed by shop.

### 10–11. Deploy and verify

The site filters out any Shopify product with no catalogue entry, so the
product stays invisible until the catalogue change deploys. Push to `main`;
Vercel builds production. Pages are ISR at 300s.

Verification is not "the page 200s". Check all four:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://sincerelyironic.com/products/<handle>
curl -s https://sincerelyironic.com/ | grep -c <handle>     # on the shop grid
```

then in a browser or via `scripts/chrome.ts`: the right garment colour leads,
and **add to cart actually works** — pick a colour *and* a size (the button
stays disabled until both are chosen) and confirm the header reads `Cart (1)`.
Button labels carry both readings, so the add-to-cart label is literally
`Add to cartAdd to cart`; match on prefix, not equality.

## Common mistakes

| Mistake | What happens |
|---|---|
| `PRINTIFY_SHOP_ID` unset | Everything lands in the dead shop. No error. |
| Rendering without `--both-inks` | White type on the ivory garment. |
| Publishing before mockups render | Listing ships the previous design's photos. |
| Skipping the reconcile | Shop filter row sprouts "T-Shirt"; handle stops matching. |
| Deploying before the listing exists | Card missing from the grid; page renders with no images. |
| Listing two `styles` | The cart carries size only, so the second face ships as the first. One entry is correct — several designs pin `['gothic']`. |
