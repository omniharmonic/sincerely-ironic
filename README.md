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
| `pnpm print-files` | Render every catalogue print, in every treatment, to a 300 DPI transparent PNG in `print-files/` |
| `pnpm logo-files` | Write the logo to `public/brand/` as SVG and PNG |

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

## Type treatments

Every design ships in up to three: **Wide** (Anybody, justified blocks),
**Gothic** (Pirata One blackletter, lower case) and **Stack** (Anton,
condensed). `src/lib/typeset.ts` sets all of them — see the note in
`CLAUDE.md`. The product page previews each; `styles` on a catalogue entry
decides which a design ships in, and the first is its default.

## Print files

`pnpm print-files [handle-filter]` turns every print in the catalogue into the
artwork a print-on-demand vendor wants: transparent PNG, 300 DPI, sized to the
placement's print area (15×18in front and back, 4×4in left chest, 4×2.5in cap,
and so on — see `AREAS` in `scripts/print-files.ts`, sized for Printify's DTG
areas). The authoritative numbers are per blueprint and per print provider,
from `GET /v1/catalog/blueprints/{id}/print_providers/{pid}/variants.json`;
pull those once the blanks are chosen and correct `AREAS` where it disagrees. Ink colour follows the
garment: bone garments print ink, ink garments print bone. A `manifest.json`
lists every file with its placement, size and colour.

Because the type is set from the same catalogue and the same faces the site
uses, the printed garment and the drawn one cannot drift apart. Rendering uses
the local Chrome, so there is no image library to install; point `CHROME_PATH`
at the binary if it is somewhere unusual. Adjust `AREAS` to match a specific
vendor's template.

## Environment

| Var | What |
| --- | --- |
| `SHOPIFY_STORE_DOMAIN` | `sincerely-ironic-apparel.myshopify.com` |
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
