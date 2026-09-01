'use client';

import { useState } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { T } from '@/components/universe/T';
import { product as copy } from '@/lib/copy';
import type { Size } from '@/lib/shopify/types';

export function ProductForm({ sizes, available }: { sizes: Size[]; available: boolean }) {
  const { add, pending, live } = useCart();
  const firstAvailable = sizes.find((s) => s.available) ?? sizes[0];
  const [selected, setSelected] = useState<Size | undefined>(sizes.length === 1 ? firstAvailable : undefined);
  const [justAdded, setJustAdded] = useState(false);

  const canBuy = live && available && selected?.available;

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

      {live ? (
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
        <p className="mono mt-6 max-w-[40ch] border-l-2 border-accent pl-3 normal-case leading-relaxed tracking-normal text-mute">
          <T s={copy.unavailable.sincere} i={copy.unavailable.ironic} />
        </p>
      )}
      {!selected && live && available ? (
        <p className="mono mt-3 text-mute">Pick a size.</p>
      ) : null}
    </form>
  );
}
