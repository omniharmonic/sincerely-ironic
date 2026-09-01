'use client';

import { useState } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { T } from '@/components/universe/T';
import { product as copy } from '@/lib/copy';
import type { Size } from '@/lib/shopify/types';

/**
 * `purchasable` is true only when the product actually came from Shopify —
 * a configured-but-rejected token must not produce a button that fails.
 */
export function ProductForm({ sizes, available, purchasable }: { sizes: Size[]; available: boolean; purchasable: boolean }) {
  const { add, pending } = useCart();
  const firstAvailable = sizes.find((s) => s.available) ?? sizes[0];
  const [selected, setSelected] = useState<Size | undefined>(sizes.length === 1 ? firstAvailable : undefined);
  const [justAdded, setJustAdded] = useState(false);

  const canBuy = purchasable && available && selected?.available;

  return (
    <form
      className="mt-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected || !canBuy) return;
        add(selected.id);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1800);
      }}
    >
      <fieldset>
        <legend className="mono mb-3 text-mute">
          <T s={copy.size.sincere} i={copy.size.ironic} />
          {selected ? <span className="ml-2 text-fg">{selected.label}</span> : null}
        </legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s.id}
              type="button"
              className="chip"
              aria-pressed={selected?.id === s.id}
              disabled={!s.available}
              onClick={() => setSelected(s)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      {purchasable ? (
        <button type="submit" className="btn mt-6 w-full sm:w-auto sm:min-w-[240px]" disabled={!selected || !canBuy || pending}>
          {!available ? (
            <T s={copy.soldOut.sincere} i={copy.soldOut.ironic} />
          ) : pending ? (
            <T s={copy.adding.sincere} i={copy.adding.ironic} />
          ) : justAdded ? (
            <T s={copy.added.sincere} i={copy.added.ironic} />
          ) : (
            <T s={copy.add.sincere} i={copy.add.ironic} />
          )}
        </button>
      ) : (
        <p className="mono mt-6 text-mute">
          <T s={copy.unavailable.sincere} i={copy.unavailable.ironic} />
        </p>
      )}
      {!selected && purchasable && available ? (
        <p className="mono mt-3 text-mute">
          <T s={copy.pick.sincere} i={copy.pick.ironic} />
        </p>
      ) : null}
    </form>
  );
}
