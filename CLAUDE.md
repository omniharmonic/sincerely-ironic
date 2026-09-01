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

**Placement is a `PrintBox`, not a side effect.** `resolvePrint()` in
`typeset.ts` turns a print into a tight canvas plus the `x`/`y`/`scale` the
vendor needs, and everything downstream derives from that one call. Before it
existed, every file was rendered at the full size of the print area and handed
over as "centre it, scale to fit" — so a slogan landed at the middle of a
17-inch panel, which on a body is the navel. A box names `w`, `h`, `top` and
`x` as fractions of the panel. **`h` is load-bearing**: without a height cap
the engine always prefers more lines, because more lines mean a shorter
longest line, which lets the type set bigger — so a slogan builds a tower down
the belly instead of a block across the chest.

Garment boxes (`GARMENTS[g].boxes`) beat design boxes, because the garment
knows its own panel — a cap front is 4 × 2.25in and a tee front is 15 × 17in.
`rebox()` is the escape hatch for one product that wants otherwise. **Hats
were deliberately left out of the placement redesign**; their boxes reproduce
the old fill-the-panel-and-centre behaviour, and only the Culture War Veteran
cap is re-boxed.

**Print files are cut tight to the ink**, so a wrong font metric shears a
glyph instead of hiding in slack. `pnpm check-prints` measures the real alpha
bounds of every PNG and fails on anything touching an edge. Run it after any
change to type, padding or boxes — it has already caught a lost comma and a
lost blackletter descender.

**A design is not a product.** `src/lib/catalog.ts` holds designs (a slogan
and the treatments it ships in) and builds products from `design × garment`.
Adding a slogan is one entry in `DESIGNS` plus one `make(...)` line.

**One treatment per design, and the site offers no choice of face.** The
product page used to show Wide / Gothic / Stack chips; they only redrew a
local SVG. The cart carries a size variant and nothing else, and Printify only
ever built `styles[0]` — so choosing "Gothic" shipped a "Wide" shirt. A
blueprint fixes its variant options at colour and size, so a treatment cannot
be a variant; a second one has to be a second product. Do not put the chips
back without building the products behind them.

**The catalogue is upstream of Shopify for art, downstream for copy.**
`src/lib/catalog.ts` keys the drawn garments by handle and is the fallback
when the Storefront token is missing. A Shopify product with no catalogue
entry is filtered out on purpose. Handles must match exactly.

**Printify creates the Shopify listing. Never seed one by hand.** A listing
Printify created is bound to a Printify product and routes an order to a
printer; one we created through the Admin API is a picture of a product. The
old store had 61 live listings of which 58 had no Printify link at all — an
order on any of them would have taken money and reached nobody. Build in
Printify, publish from Printify, then reconcile the Shopify side (handle,
vendor, `productType`, the ironic metafield, the Headless channel).

**A republish undoes the reconcile.** Printify resets `vendor` to "Printify"
and `productType` to the blueprint's own category on every publish, and
neither is behind a publish flag. Always re-run the Shopify reconcile after
publishing, or the shop's filter row sprouts "Sweatshirt", "Bags" and "All
Over Prints". Mockups are also regenerated *asynchronously* after an artwork
change, and publish ships whatever renders exist at that instant — so update,
wait, then publish, or the store gets the previous design's photographs.

**A Shopify handle is mutable.** `ProductInput.handle` is settable on
`productUpdate`, with `redirectNewHandle` to leave a redirect behind. An
earlier comment here claimed the opposite, and that false belief was the only
argument for seeding listings ourselves. It is what lets Printify own creation
while we still choose the URLs.

**Uploads are keyed by content hash, not file name.** Artwork changes without
its name changing, and `scripts/printify-uploads.json` used to match on name
alone — so a redesign would silently keep every old image attached. The
manifest carries a `sha` per file and the uploader re-uploads when it moves.

**Updating a Printify product is not creating one.** A create names only the
variants being sold; an update is rejected unless `print_areas.*.variant_ids`
covers *every* variant on the product (437 on a Comfort Colors tee, of which
ten are enabled). `coverEveryVariant()` spreads the artwork across the full
list — black garments take the light file, everything else the dark one.

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
