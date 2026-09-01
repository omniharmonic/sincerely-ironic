# Going live

*Why the current Shopify store cannot sell, and what to do instead. Researched
2026-09-01 against Shopify's own docs; every load-bearing claim is cited.*

---

## The short version

`sincerely-ironic-apparel.myshopify.com` is a Partner **development store**. It
can never take real money, and it cannot be upgraded. Shopify says so without
qualification: *"Dev stores can't be converted to production stores."*
([shopify.dev](https://shopify.dev/docs/apps/build/dev-dashboard/stores/development-stores))

The Admin API confirms which kind of store it is:

```
plan.displayName        "Basic App Development"
plan.publicDisplayName  "Basic"
plan.partnerDevelopment  true          ← this is the tell
```

`"Basic"` here is a *feature tier* — which features are unlocked for testing —
not a billing plan. The upgrade button is missing from the admin because it
does not exist.

So: **create a normal store at shopify.com, re-seed it, repoint the site.**

## Why it can't just be switched on

Documented restrictions on a dev store:

- *"They can't be used for production and can't process real transactions."*
- *"Real transactions through active payment providers, Store Credit, and Gift
  Cards aren't supported."*
- *"You can't remove the password page."*
- *"Dev stores can't be transferred to a client."*

The thing people remember as "upgrading a dev store" is a different store type
— a **client transfer store**, created for handoff, where the *recipient*
picks the plan after transfer. Do not build the new store that way either:
after a transfer the store *"isn't eligible for promotions or free trials"*,
so it would forfeit the intro pricing for no benefit.

## What migration actually costs us: almost nothing

The usual pain of a Shopify migration is orders, customers and handles. We
have **zero orders**, no customers, and — the important part —
**`src/lib/catalog.ts` is the source of truth for the whole line.** The store
is downstream of this repo, not the other way round. Re-seeding a fresh store
is the same job that has already been done three times.

| Thing | Survives? | How |
| --- | --- | --- |
| Product handles | **Yes, exactly** | Re-seeded from `catalog.ts`, which is where they are defined. The site filters on handles, so this is the one that mattered |
| Titles, descriptions, types, prices, variants | Yes | Same |
| `sincerely.ironic_description` metafield | Yes | Recreate the definition first, then set per product |
| "Everything" smart collection | Yes | One mutation |
| Custom domain | **Nothing to move** | `sincerelyironic.com` points at Vercel, not Shopify. Shopify's `primaryDomain` is still the `.myshopify.com` one |
| Printify products and uploads | Yes | The uploaded artwork lives in the Printify account, not the store. Add the new store in Printify and relink |
| Storefront API token | **No** | Tokens are per-store. Install the Headless channel on the new store, take the new public token, update `SHOPIFY_STOREFRONT_ACCESS_TOKEN` and `SHOPIFY_STORE_DOMAIN` in Vercel |
| Product and variant GIDs | No | Irrelevant — the site resolves products by handle and reads variant ids live |

## The order to do it in

1. Sign up at [shopify.com](https://www.shopify.com/pricing) — **Basic**, $39/mo
   monthly or $29/mo annual. There is currently a *3 days free, then $1/month
   for 3 months* offer. Sign up **normally**, not as a client transfer store.
2. Name it **Sincerely Ironic** — with no trailing space. The current store's
   name ends in one, which is why its sales channel reads
   `"Sincerely Ironic Apparel  Headless"`, and it leaks into customer emails.
3. Start **Shopify Payments** activation immediately — it needs two-step auth,
   bank details, business details and identity verification, and can take
   days. Everything else can happen while it's pending.
4. Install the **Headless** sales channel (free), create a storefront, copy the
   **public** access token.
5. Re-seed from this repo: metafield definition → 61 products with their
   handles → the "Everything" smart collection → publish everything to Online
   Store *and* Headless.
6. Update Vercel env: `SHOPIFY_STORE_DOMAIN` and
   `SHOPIFY_STOREFRONT_ACCESS_TOKEN`. Redeploy.
7. Add the new store in Printify, relink, and put real artwork on the fanny
   pack and the robe — both still carry Printify's stock graphics.
8. Place a real test order end to end before announcing anything.
9. **Keep the dev store.** It becomes a free staging environment. Do not
   delete it until the new store is verified.

## Things that will bite later

- **Shopify Tax pricing changed for new stores.** Free until $100,000 in US
  sales, then 0.35% per US order (capped at $0.99). For stores created after
  13 May 2026 that $100k is a **lifetime** threshold, not annual, and the
  annual cap does not apply. A store created now falls under the new rules.
  ([help.shopify.com](https://help.shopify.com/en/manual/taxes/shopify-tax/pricing))
- Shopify only *calculates* tax. Registering where there is nexus is on us.
- Anything hardcoding a checkout or cart URL needs updating. `checkoutUrl`
  from the Storefront API looks after itself.
- Not fully verified: the Headless channel's listing has a truncated
  *"Headless is only compatible with stores that:"* line. Every other source
  treats headless as available from Basic upward, and the Headless channel
  itself is free.
