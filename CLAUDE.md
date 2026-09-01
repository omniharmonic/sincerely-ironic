# Sincerely Ironic — working notes

Next.js 16 App Router storefront on Shopify's Storefront API. Read `README.md`
first; the design spec is in `docs/superpowers/specs/`.

## Non-obvious constraints

**Every sentence has two readings.** User-facing copy goes through `<T s i />`
(`src/components/universe/T.tsx`) or lives in `src/lib/copy.ts` as
`{ sincere, ironic }`. Both readings are always in the DOM; CSS in
`globals.css` hides the other. Chrome labels that are identical in both
(nav, "Open") may be plain strings.

**The switch is unlabelled on purpose.** Do not add "sincere"/"ironic" text
to it or anywhere else on the site.

**The mark is the supplied silhouettes on the slick.** `src/components/Logo.tsx`
holds the two paths verbatim; the gradient is CSS so it drifts with the rest
of the rainbow. `icon.svg` and the OG image duplicate the paths because they
cannot use the CSS.

**`data-universe` on `<html>` is the only runtime source of truth.** The
no-flash script in `src/lib/universe.ts` sets it before paint; the provider
reads it with `useSyncExternalStore`. Do not add React state that duplicates
it, and do not read `localStorage` for it anywhere else.

**Type is set by one engine, `src/lib/typeset.ts`.** It breaks a slogan into
lines (an exact DP that keeps the lines even, because a justified block is
only a solid rectangle if they are), sizes it to the panel, and returns a
measure per line. The garment art and the print files both call it, so what a
customer sees and what the printer receives cannot drift. Lines are rendered
as SVG `<text>` with `textLength`, so type is stretched to the measure rather
than guessed at — guessing is what used to clip long words off the panel. Do
not reintroduce an estimated-advance sizing path.

**A design is not a product.** `src/lib/catalog.ts` holds designs (a slogan
and the treatments it ships in) and builds products from `design × garment`.
Adding a slogan is one entry in `DESIGNS` plus one `make(...)` line.

**The catalogue is upstream of Shopify for art, downstream for copy.**
`src/lib/catalog.ts` keys the drawn garments by handle and is the fallback
when the Storefront token is missing. A Shopify product with no catalogue
entry is filtered out on purpose. Handles must match exactly.

**The hero is the serpent.** `src/components/SerpentHero.tsx` repeats one face
from the mark along a lemniscate, mirrored to face its direction of travel,
filled with six hue-rotated slicks, blended (`--seg-blend`: multiply on paper,
screen on ink) so overlaps mix. Transforms are written per frame straight to
the DOM, never through React state. Hero copy stays two small lines in the
corners — the page is graphic-first and names nothing.

**Hero motion must be bounded.** `SerpentHero.tsx` derives every position
from `sin`/`cos` of (scroll, elapsed) — never an accumulator. (Lesson carried
over from sixthwall.productions: unbounded idle motion unwinds on first
interaction.)

**Storefront token cannot be minted by an agent.** Shopify's MCP blocks
`storefrontAccessTokenCreate`. It comes from the Headless channel in admin and
goes into Vercel env. Until then `isStorefrontConfigured()` is false and the
register stays closed by design.

## Voice

Minimal. Nothing on the site names the joke, the switch, the two readings, or
the parent company's ideas — a garment says what it says and the store says
what a store says. The second reading (`ironic`) is the first one, a notch
more earnest ("Thank you for your support." → "Thank you so much for your
support."); never sarcasm, never a wink. Descriptions are garment facts.
Never "journey", never "transformational" as an adjective, never "brand
partnership". If a sentence explains itself, cut it.

## Verifying

`pnpm build` typechecks and prerenders every route. The universe switch, the
cart drawer and the hero motion are client-side; check them in a browser.
Screenshots from verification runs are gitignored.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
