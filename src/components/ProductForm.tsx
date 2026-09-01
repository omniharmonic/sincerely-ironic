'use client';

import { useState } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { T } from '@/components/universe/T';
import { product as copy } from '@/lib/copy';
import { setColour } from '@/lib/product/colour';
import type { Option, Variant } from '@/lib/shopify/types';

/**
 * Pick a variant, one axis at a time.
 *
 * A Printify blueprint fixes its options at Colour and Size, so a garment has
 * ten variants across two axes. Rendering one chip per variant showed
 * "S S M M L L XL XL 2XL 2XL" — every size twice, with no way to say which
 * colour was meant, and whichever chip was clicked decided the colour
 * silently. The selection has to be pinned on every axis the store defines.
 *
 * `purchasable` is true only when the product actually came from Shopify — a
 * configured-but-rejected token must not produce a button that fails.
 */
export function ProductForm({
  handle,
  options,
  variants,
  available,
  purchasable,
}: {
  handle: string;
  options: Option[];
  variants: Variant[];
  available: boolean;
  purchasable: boolean;
}) {
  const { add, pending } = useCart();

  // An axis with one value is not a choice; settle it rather than ask.
  const settled = Object.fromEntries(
    options.filter((o) => o.values.length === 1).map((o) => [o.name, o.values[0]]),
  );
  const [chosen, setChosen] = useState<Record<string, string>>(settled);
  const [justAdded, setJustAdded] = useState(false);

  const complete = options.every((o) => chosen[o.name]);
  const variant = complete
    ? variants.find((v) => options.every((o) => v.options[o.name] === chosen[o.name]))
    : undefined;

  /** Is this value reachable, given what else is chosen? */
  const reachable = (name: string, value: string) =>
    variants.some(
      (v) =>
        v.available &&
        v.options[name] === value &&
        Object.entries(chosen).every(([k, val]) => k === name || v.options[k] === val),
    );

  const canBuy = purchasable && available && variant?.available;

  return (
    <form
      className="mt-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!variant || !canBuy) return;
        add(variant.id);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1800);
      }}
    >
      {options
        .filter((o) => o.values.length > 1)
        .map((o) => (
          <fieldset key={o.name} className="mt-6 first:mt-0">
            <legend className="mono mb-3 text-mute">
              {o.name}
              {chosen[o.name] ? <span className="ml-2 text-fg">{chosen[o.name]}</span> : null}
            </legend>
            <div className="flex flex-wrap gap-2">
              {o.values.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={chosen[o.name] === value}
                  disabled={!reachable(o.name, value)}
                  onClick={() => {
                    setChosen((c) => ({ ...c, [o.name]: value }));
                    // Move the gallery to this colour's own photograph.
                    if (/colou?r/i.test(o.name)) setColour(handle, value);
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

      {purchasable ? (
        <button type="submit" className="btn mt-6 w-full sm:w-auto sm:min-w-[240px]" disabled={!canBuy || pending}>
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
      {!variant && purchasable && available ? (
        <p className="mono mt-3 text-mute">
          <T s={copy.pick.sincere} i={copy.pick.ironic} />
        </p>
      ) : null}
    </form>
  );
}
