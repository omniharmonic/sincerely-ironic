'use client';

import { useMemo, useSyncExternalStore } from 'react';

import { ProductCard } from '@/components/ProductCard';
import { T } from '@/components/universe/T';
import { useUniverse } from '@/components/universe/UniverseProvider';
import { filters, grid } from '@/lib/copy';
import type { Product } from '@/lib/shopify/types';

/**
 * The shop, and the row that narrows it.
 *
 * Options come from the products actually present, in the order they first
 * appear — which is catalogue order, so the row reads tees, then sleeves,
 * then fleece, then headwear, without a hardcoded list that could drift from
 * the line.
 *
 * The query string is the state. It is read as an external store rather than
 * through `useSearchParams`, because calling that hook opts the subtree out
 * of static prerendering — which would take all sixty products out of the
 * served HTML to save a query string. Reading it after hydration costs a deep
 * link one frame and keeps the grid in the document. Writing it goes through
 * `window.history.pushState`, which Next documents as shallow routing and
 * which keeps its own router in step without a trip to the server.
 */

// Hoisted: slugify runs once per product on every render of the grid.
const NOT_ALNUM = /[^a-z0-9]+/g;
const EDGE_DASH = /^-|-$/g;

const slugify = (type: string) => type.toLowerCase().replace(NOT_ALNUM, '-').replace(EDGE_DASH, '');

/* The address bar, as a store. `popstate` covers back and forward; a filter
   click has to say so itself, since pushState fires no event. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onChange);
  };
}

const readSearch = () => window.location.search;
const noSearch = () => '';

function go(url: string) {
  window.history.pushState(null, '', url);
  listeners.forEach((notify) => notify());
}

interface Option {
  slug: string;
  label: string;
  count: number;
}

export function ShopFilter({ products }: { products: Product[] }) {
  const { universe } = useUniverse();
  const search = useSyncExternalStore(subscribe, readSearch, noSearch);

  const options = useMemo(() => {
    const found = new Map<string, Option>();
    for (const product of products) {
      const slug = slugify(product.type);
      const seen = found.get(slug);
      if (seen) seen.count += 1;
      else found.set(slug, { slug, label: product.type, count: 1 });
    }
    return [...found.values()];
  }, [products]);

  const asked = new URLSearchParams(search).get('type');
  const active = asked && options.some((o) => o.slug === asked) ? asked : null;

  const shown = active ? products.filter((p) => slugify(p.type) === active) : products;
  const count = grid.count(shown.length);

  return (
    <>
      <header className="flex items-baseline justify-between border-t border-line pt-5">
        <h2 className="display text-[clamp(28px,3.4vw,48px)]" style={{ ['--wdth' as string]: 125 }}>
          <T s={grid.heading.sincere} i={grid.heading.ironic} />
        </h2>
        <p className="mono text-mute" aria-live="polite">
          <T s={count.sincere} i={count.ironic} />
        </p>
      </header>

      <div role="group" aria-label={filters.label[universe]} className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="chip" aria-pressed={active === null} onClick={() => go('/#shop')}>
          <T s={filters.all.sincere} i={filters.all.ironic} />
          <span className="ml-2 tabular-nums opacity-50">{products.length}</span>
        </button>
        {options.map((option) => (
          <button
            key={option.slug}
            type="button"
            className="chip"
            aria-pressed={active === option.slug}
            onClick={() => go(`/?type=${option.slug}#shop`)}
          >
            {option.label}
            <span className="ml-2 tabular-nums opacity-50">{option.count}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-lg mt-10 text-[18px] text-mute">
          <T s={filters.none.sincere} i={filters.none.ironic} />
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-8 2xl:grid-cols-5">
          {shown.map((product, i) => (
            <li key={product.handle}>
              <ProductCard product={product} priority={i < 3} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
