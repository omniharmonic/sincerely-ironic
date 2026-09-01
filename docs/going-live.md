# Going live

*How this store actually starts taking orders. Revised 2026-09-01, after an
audit found that the listings we had could not be fulfilled at all.*

---

## The finding that reorganised this document

`sincerely-ironic-apparel.myshopify.com` had 61 live, active, published
products. **58 of them could not have been fulfilled.**

We had built both halves of the shop separately: Shopify listings seeded
directly from `src/lib/catalog.ts` through the Admin API, and Printify
products built from the same catalogue. Nothing joined them. Printify records
the Shopify product it is bound to in a product's `external` field, and only
**3 of 61** Printify products had one — the three that were made in Printify
by hand. The other 58 had no `external` key at all.

An order on any of those 58 would have taken the customer's money and reached
no printer.

This was not a bug in the sense of a mistake in a line of code. It followed
from a deliberate choice recorded in `scripts/printify-products.ts`: create
products unpublished, because publishing would make Printify create its *own*
Shopify listing beside the one we had already seeded. That reasoning was
sound about duplicates and wrong about fulfilment. The duplicate was the
lesser problem.

## The rule that follows

**Printify creates the Shopify listing. We never seed one by hand.**

A listing Printify created is bound to a Printify product, carries the right
variants, and routes an order to a printer. A listing we created is a picture
of a product. Only one of those is a shop.

The objection to this was that Printify names the product, so Shopify derives
the handle from the title, so our URLs stop being ours. That objection rested
on a false premise — that a Shopify handle is fixed at creation. It is not:

```
ProductInput.handle    settable on productUpdate
redirectNewHandle      leaves a redirect at the old URL
```

So the order is: Printify publishes → Shopify creates the listing → we rename
the handle to the catalogue's slug and set the pieces Printify does not know
about. The catalogue stays the source of truth for slugs, product type and
the second reading; Printify stays the source of truth for imagery, variants
and fulfilment. Neither one guesses at the other's job.

## Why the old store can't be repaired

`plan.partnerDevelopment: true`. It is a Partner development store, and
Shopify says without qualification: *"Dev stores can't be converted to
production stores."*
([shopify.dev](https://shopify.dev/docs/apps/build/dev-dashboard/stores/development-stores))
It can never take real money, and the `"Basic"` in `plan.displayName` is a
feature tier for testing, not a billing plan. The upgrade button is missing
because it does not exist.

It has since stopped serving at all: the Storefront API now answers

```
400 — {"message":"Online Store channel is locked."}
```

so the live site is currently rendering catalogue fallback with no imagery
from any source. There is nothing to preserve.

Do not build the replacement as a **client transfer store** either. After a
transfer a store *"isn't eligible for promotions or free trials"*, so it
would forfeit the intro pricing for nothing.

## What migration costs: almost nothing

Zero orders, no customers, and `src/lib/catalog.ts` is the source of truth for
the line. The store is downstream of this repo.

| Thing | Survives? | How |
| --- | --- | --- |
| Product handles | **Yes** | Set explicitly after Printify creates each listing |
| Titles, descriptions, types, prices | Yes | From the catalogue, applied after creation |
| Variants and fulfilment | **Better than before** | Printify's own, which is the entire point |
| Imagery | **Better than before** | Printify pushes its mockups with the listing |
| `sincerely.ironic_description` metafield | Yes | Recreate the definition first, then set per product |
| Custom domain | **Nothing to move** | `sincerelyironic.com` points at Vercel, not Shopify |
| Uploaded artwork | Yes | Lives in the Printify account, not the store |
| Storefront API token | **No** | Per-store. New Headless channel, new token |
| Product and variant GIDs | No | Irrelevant — the site resolves by handle, reads variants live |

## The order to do it in

1. **Sign up at [shopify.com](https://www.shopify.com/pricing)** — Basic, as a
   normal store, not a client transfer. *(Done: the store exists and has been
   renamed "Sincerely Ironic Apparel". It is in its free trial.)*
2. **Name it without a trailing space.** The old store's name ended in one,
   which is why its channel read `"Sincerely Ironic Apparel  Headless"` — and
   it leaks into customer email.
3. **Start Shopify Payments activation immediately.** Two-step auth, bank
   details, business details, identity verification; it can take days.
   Everything below can proceed while it is pending.
4. **Connect the new store in Printify.** It appears as a new Printify *shop*
   with its own id. Put that id in `PRINTIFY_SHOP_ID`; the product ledger is
   keyed by shop, so the old shop's records stay intact and untouched.
5. **Rebuild the products in the new shop** — `pnpm printify-products --create`.
   Art comes from `print-files/`, which is regenerated from the catalogue.
6. **Publish from Printify.** This is the step that was skipped before, and
   the one that makes the shop a shop. Printify creates each Shopify listing,
   bound to its own product.
7. **Reconcile Shopify**: set each handle to the catalogue slug, set the
   title, `productType`, price and the ironic metafield, and publish to Online
   Store *and* Headless.
8. **Install the Headless channel**, create a storefront, take the **public**
   access token.
9. **Update Vercel env** — `SHOPIFY_STORE_DOMAIN` and
   `SHOPIFY_STOREFRONT_ACCESS_TOKEN`. Redeploy.
10. **Place a real order end to end** and confirm it appears in Printify.
    Nothing is live until this has happened once.
11. **Keep the dev store** as staging until the new one is verified.

## Things that will bite later

- **Shopify Tax pricing changed for new stores.** Free until $100,000 in US
  sales, then 0.35% per US order (capped at $0.99). For stores created after
  13 May 2026 that $100k is a **lifetime** threshold, not annual, and the
  annual cap does not apply. A store created now falls under the new rules.
  ([help.shopify.com](https://help.shopify.com/en/manual/taxes/shopify-tax/pricing))
- Shopify only *calculates* tax. Registering where there is nexus is on us.
- **Margins are thinner on two-sided prints.** A front-and-back tee costs
  $18.45–19.72 against $38 — 51%, against 67% for a single-sided one.
- **There is no Printify sandbox.** The gap between "customer paid" and
  "Printify accepted the order" cannot be rehearsed; step 10 is the only test.
- A second type treatment for a design cannot be a variant — a blueprint
  fixes its options at colour and size. It has to be a second product.
