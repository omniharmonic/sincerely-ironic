# Sincerely Ironic — design & build spec

*2026-08-31. The apparel storefront of Sixth Wall Productions (DBA), at
`sincerelyironic.com`. This doc is the design and the implementation plan in
one, because the brief was "plan it, then build it, keep going."*

---

## What it is

A real store that is not sure it exists. Sixth Wall builds no brand — "the
idol and the logo are the same mistake: energy trapped in a noun" (Transmission
VIII) — and here is its clothing brand. That contradiction is not a bug to hide;
it is the product. The sincere half is the sixth wall itself: a play leaves the
building and becomes the way some people live, and the most literal way a play
leaves a building is on somebody's back. The ironic half is that this is merch.

The lexicon defines the name: *held with a straight face and a wink at once.*
Every surface of the site does both, at the same time, and lets the visitor
choose which one they are reading.

**Subject:** ten garments. **Audience:** people who were at a Sixth Wall
production, and people who were not. **The page's single job:** sell a shirt
while leaving the purpose of the store unresolved.

## The straightest form

The rite says the hollow, mass-consumed form is the best vehicle. The
e-commerce site is the hollowest form on the internet. So the store is built
*straight*: a header, a grid, a product page, a cart drawer, a checkout button
that works. Nothing about the structure is a joke. The break is in the copy,
the type, and one control.

## Signature: the Universe Switch

One control in the header: **SINCERE ⇄ IRONIC**. It flips the universe:

| | Sincere | Ironic |
| --- | --- | --- |
| Ground | paper `#F3F3F0` | ink `#0D0D0D` |
| Text serif | Fraunces, WONK 0, SOFT 0 | Fraunces, WONK 1, SOFT 100 |
| Accent | signal blue `#1F4BFF` | hot pink `#FF3D9A` |
| Copy | the straight reading | the other reading |

You land in one at random. The choice is stored per visitor. Every line of
copy on the site, including product descriptions from Shopify, has both
readings — the sincere one is the product description, the ironic one is a
metafield, both editable in admin. The switch is the meta-pattern from the
rite: hold the told meaning beside the hidden meaning; it cannot be both; it is.

## Material: the slick

One colour, and it moves. An oil-slick gradient (`#FF4FB0 → #FFE94D → #4DF0FF
→ #8A4DFF`) with a slowly rotating hue, used only on: the hero statement, the
hover state of product names, the switch knob. Everything else is monochrome.
This is the psychedelic in "psychedelic contemporary minimalism": contained,
disciplined, one place.

## Type

Type-heavy. The type is the imagery.

- **Display — Anybody** (variable, wdth 50–150, wght 100–900). The stretchy
  voice. Wordmark, hero, product names on cards. Its width axis is driven by
  scroll velocity on the hero, and by hover on cards, so the letterforms
  themselves are what moves.
- **Text — Fraunces** (variable, opsz, wght, SOFT, WONK). The sincere voice.
  Descriptions, the about page, everything with a sentence in it. The
  universe switch changes its variation settings site-wide.
- **Utility — IBM Plex Mono.** Prices, sizes, the status ticker, labels. The
  same utility face as sixthwall.productions, because it is the same company.

## Layout

```
 SINCERELY IRONIC          SHOP  WHAT THIS IS  CART (0)   [SINCERE ● IRONIC]
 ──────────────────────────────────────────────────────────────────────────
 WE MAKE CLOTHES               ← Anybody, 14vw, width breathes with scroll
 THAT MEAN IT.                    ironic: WE MAKE CLOTHES THAT MEAN IT. (SURE.)
                                  slick gradient fill
 A short Fraunces paragraph, two lines, max 46ch.

 ┌───────────┐ ┌───────────┐ ┌───────────┐
 │ garment   │ │ garment   │ │ garment   │   ← typographic garment art (SVG),
 │ art       │ │ art       │ │ art       │     Shopify image if one exists
 │ NAME  $38 │ │ NAME  $38 │ │ NAME  $38 │
 └───────────┘ └───────────┘ └───────────┘
 …

 THIS IS A STORE.  (the position block: six flat sentences, both readings)

 ─ ticker ─ STORE: OPEN · UNIVERSE: SINCERE · EXISTS: PROBABLY · CART: 0 · 21:47 MDT
 footer: Sixth Wall Productions DBA · sixthwall.productions · hello@
```

Product page: art left (sticky), copy right: name (Anybody, wide), price,
size buttons (mono), *Add to cart*, description in the current universe, and
a small mono line under it: "the other reading is one switch away."

Cart: a right-side drawer. Checkout is Shopify's hosted checkout via
`cart.checkoutUrl`.

404: "This page exists in the other universe." with the switch inline.

## Garment art

No product photography exists yet. Each product renders an SVG garment
silhouette (tee, longsleeve, hoodie, crewneck, cap, sock, tote) with its
print set in Anybody, on the product's colourway. When a Shopify image exists
it is used instead, so photography replaces the art with no code change.

## Voice

From the Sixth Wall notes: explains mechanism rather than meaning, first
person plural, lands long sentences on short flat ones, does not hedge. May be
funny; may not be cute. Never "journey", never "transformational" as an
adjective, never "brand partnership". The ironic register is not sarcasm; it
is the same voice admitting what it is doing.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind v4 for layout utilities,
  hand-written CSS custom properties for everything with a point of view.
- `motion` for the scroll-velocity type and the drawer.
- Shopify Storefront API (2026-07) over plain `fetch`, cached with Next's
  fetch cache and tag-based revalidation. Cart via Storefront cart mutations,
  cart id in an httpOnly cookie, server actions for line changes.
- Vercel, Fluid Compute, project `sincerely-ironic`, domain via Vercel DNS
  nameservers (routes around the Namecheap URL-redirect record that the API
  cannot delete).

## Data

`src/lib/catalog.ts` is the local source of truth for the ten garments: handle,
art, and both copy readings. It seeds Shopify (done once, via the Admin API)
and it is the fallback when the Storefront token is absent — the site still
renders, with *Add to cart* replaced by a line saying the register is open in
the other universe. Once the token exists, Shopify is live with no code change.

Shopify holds: product (title, sincere description, vendor `Sincerely Ironic`,
type, tags, variants by size), and the metafield
`sincerely.ironic_description` (multi-line text, storefront PUBLIC_READ).
Smart collection **Everything (Both)** — vendor equals Sincerely Ironic.

## Not in scope

Accounts, wishlists, search, reviews, a blog, dark-mode-by-OS (the universe
switch is the theme control and it is deliberate), photography.

## Build order

1. Catalog + copy (`src/lib/catalog.ts`, `src/lib/copy.ts`).
2. Seed Shopify: metafield definition, ten products, collection, publish.
3. Universe primitives: provider, `<Both>` component, switch, no-flash script.
4. Layout, header, footer, ticker, fonts, tokens.
5. Home: hero, grid, positions.
6. Product page + garment art.
7. Cart: server actions, cookie, drawer, checkout.
8. About, 404, metadata, OG image.
9. Build, lint, screenshot pass.
10. GitHub repo, Vercel project, env vars, production deploy, domain, DNS.

## Manual steps the API refuses

- The Storefront API access token (Shopify blocks AI tools from creating
  one). Install the **Headless** channel in admin, create a storefront, copy
  the *public* access token into Vercel env `SHOPIFY_STOREFRONT_ACCESS_TOKEN`.
- Upgrade the store off the trial plan and connect payments.
- Publish the products to the Headless channel once it exists.
