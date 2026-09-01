'use client';

import { useCart } from './CartProvider';

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mono cursor-pointer whitespace-nowrap border-b border-transparent py-2 hover:border-current"
      aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
    >
      Cart <span className="tabular-nums">({count})</span>
    </button>
  );
}
