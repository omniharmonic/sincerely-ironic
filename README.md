# Sincerely Ironic

The apparel storefront of [Sixth Wall Productions](https://sixthwall.productions),
doing business as. Live at **<https://sincerelyironic.com>**.

Every line of copy on the site has two readings, and the visitor lands in one
of the two at random. The unlabelled switch in the header moves them; it
remembers. The second reading is the first one, a notch more earnest. Nothing
on the site says so.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # add the Storefront token when you have it
pnpm dev                     # http://localhost:3000
```

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build (typechecks) |
| `pnpm lint` | ESLint |

Node 22+, pnpm 10.

## How it works

- **Two universes, one attribute.** `data-universe` on `<html>` is the store.
  An inline script in `<head>` sets it before paint from `localStorage`
  (random on first visit), so there is no flash. `<T s i />` renders *both*
  readings into the DOM and CSS hides the other one. Colours, Fraunces'
  `WONK`/`SOFT` axes, and the accent all key off the same attribute.
- **Shopify holds the copy.** The sincere description is the product
  description; the ironic one is the metafield `sincerely.ironic_description`
  (storefront-readable). Both editable in admin.
- **The catalogue is the fallback.** `src/lib/catalog.ts` lists the line —
  every garment with its typographic art and both readings. It seeded Shopify,
  it keys the drawn garments by handle, and it renders the whole site when the
  Storefront token is absent — with *Add to cart* replaced by a note.
- **Cart** is Shopify's Storefront cart. Cart id in an httpOnly cookie, server
  actions for line changes, checkout is Shopify's hosted checkout.
- **Type is the imagery.** Anybody (variable width, driven by scroll velocity
  on the hero), Fraunces (the sincere voice, wonked in the ironic universe),
  IBM Plex Mono (labels, prices, the ticker — the same utility face as the
  parent site).

## Where to change things

| To change… | Edit |
| --- | --- |
| Product copy | Shopify admin (description + ironic metafield); or `src/lib/catalog.ts` for the fallback |
| A garment's print or silhouette | `src/lib/catalog.ts` (`prints`) and `src/components/GarmentArt.tsx` (`SHAPES`) |
| Any other sentence on the site | `src/lib/copy.ts` — every entry has `sincere` and `ironic` |
| Colours, type axes, the slick | `src/app/globals.css` `:root` |
| The hero's motion | `src/components/Hero.tsx` (`BASE`, `BREATH`, `PULL`) |

## Environment

| Var | What |
| --- | --- |
| `SHOPIFY_STORE_DOMAIN` | `fkpeqz-bp.myshopify.com` |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Public Storefront API token from the Headless channel |

## Adding a product

1. Add it to `src/lib/catalog.ts` first — handle, garment, prints, both
   readings. A Shopify product with no catalogue entry is not shown; that is
   the contract.
2. Create it in Shopify with the same handle, vendor `Sincerely Ironic`,
   a `Size` option, and the ironic metafield. Publish to every channel.

## Deploy

Vercel, project `sincerely-ironic`, production on push to `main`. The domain's
nameservers point at Vercel DNS. See `docs/superpowers/specs/` for the design
spec and the manual steps the APIs would not automate.
