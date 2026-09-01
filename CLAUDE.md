# Sincerely Ironic — working notes

Next.js 16 App Router storefront on Shopify's Storefront API. Read `README.md`
first; the design spec is in `docs/superpowers/specs/`.

## Non-obvious constraints

**Every sentence has two readings.** User-facing copy goes through `<T s i />`
(`src/components/universe/T.tsx`) or lives in `src/lib/copy.ts` as
`{ sincere, ironic }`. Never write a single-register string into a component.
Both readings are always in the DOM; CSS in `globals.css` hides the other.

**`data-universe` on `<html>` is the only runtime source of truth.** The
no-flash script in `src/lib/universe.ts` sets it before paint; the provider
reads it with `useSyncExternalStore`. Do not add React state that duplicates
it, and do not read `localStorage` for it anywhere else.

**The catalogue is upstream of Shopify for art, downstream for copy.**
`src/lib/catalog.ts` keys the drawn garments by handle and is the fallback
when the Storefront token is missing. A Shopify product with no catalogue
entry is filtered out on purpose. Handles must match exactly.

**Hero motion must be bounded.** `Hero.tsx` derives the width axis from
scroll velocity and a `sin()` of time — never an accumulator. (Lesson carried
over from sixthwall.productions: unbounded idle motion unwinds on first
interaction.)

**Storefront token cannot be minted by an agent.** Shopify's MCP blocks
`storefrontAccessTokenCreate`. It comes from the Headless channel in admin and
goes into Vercel env. Until then `isStorefrontConfigured()` is false and the
register stays closed by design.

## Voice

Mechanism over meaning. First person plural. Long sentences land on short flat
ones. No hedging. Funny is fine; cute is not. Never "journey", never
"transformational" as an adjective, never "brand partnership". The ironic
register is the same voice admitting what it is doing, not sarcasm.

## Verifying

`pnpm build` typechecks and prerenders every route. The universe switch, the
cart drawer and the hero motion are client-side; check them in a browser.
Screenshots from verification runs are gitignored.
