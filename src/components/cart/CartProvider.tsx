'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react';

import { addToCart, getCart, removeLine, updateLine, type CartResult } from '@/lib/shopify/cart';
import type { Cart } from '@/lib/shopify/types';

interface CartContextValue {
  cart: Cart | null;
  count: number;
  open: boolean;
  pending: boolean;
  error: string | null;
  /** False until the Storefront token exists; the register is closed. */
  live: boolean;
  setOpen: (open: boolean) => void;
  add: (variantId: string, quantity?: number) => void;
  update: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ live, children }: { live: boolean; children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = useCallback((result: CartResult) => {
    if (result.ok) {
      setCart(result.cart);
      setError(null);
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    getCart().then((r) => {
      if (!cancelled) apply(r);
    });
    return () => {
      cancelled = true;
    };
  }, [live, apply]);

  const add = useCallback(
    (variantId: string, quantity = 1) => {
      setOpen(true);
      startTransition(async () => apply(await addToCart(variantId, quantity)));
    },
    [apply],
  );

  const update = useCallback(
    (lineId: string, quantity: number) => {
      startTransition(async () => apply(await updateLine(lineId, quantity)));
    },
    [apply],
  );

  const remove = useCallback(
    (lineId: string) => {
      startTransition(async () => apply(await removeLine(lineId)));
    },
    [apply],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: cart?.quantity ?? 0,
      open,
      pending,
      error,
      live,
      setOpen,
      add,
      update,
      remove,
    }),
    [cart, open, pending, error, live, add, update, remove],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
