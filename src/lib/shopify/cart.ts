'use server';

import { cookies } from 'next/headers';
import { isStorefrontConfigured, storefront } from './client';
import {
  CART_CREATE,
  CART_LINES_ADD,
  CART_LINES_REMOVE,
  CART_LINES_UPDATE,
  CART_QUERY,
} from './queries';
import type { Cart, Money, RawCart, RawMoney } from './types';

const COOKIE = 'si_cart';
const COOKIE_DAYS = 30;

const money = (m: RawMoney): Money => ({ amount: Number(m.amount), currency: m.currencyCode });

function normalise(raw: RawCart): Cart {
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    quantity: raw.totalQuantity,
    subtotal: money(raw.cost.subtotalAmount),
    total: money(raw.cost.totalAmount),
    lines: raw.lines.nodes.map((l) => ({
      id: l.id,
      quantity: l.quantity,
      total: money(l.cost.totalAmount),
      variantId: l.merchandise.id,
      size: l.merchandise.selectedOptions.find((o) => o.name === 'Size')?.value ?? l.merchandise.title,
      product: {
        handle: l.merchandise.product.handle,
        title: l.merchandise.product.title,
        image: l.merchandise.product.featuredImage
          ? {
              url: l.merchandise.product.featuredImage.url,
              alt: l.merchandise.product.featuredImage.altText ?? l.merchandise.product.title,
            }
          : undefined,
      },
    })),
  };
}

interface MutationPayload {
  cart: RawCart | null;
  userErrors: { field?: string[]; message: string }[];
}

function unwrap(payload: MutationPayload, what: string): Cart {
  if (payload.userErrors.length) {
    throw new Error(`${what}: ${payload.userErrors.map((e) => e.message).join('; ')}`);
  }
  if (!payload.cart) throw new Error(`${what}: no cart returned`);
  return normalise(payload.cart);
}

async function readCartId(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

async function writeCartId(id: string) {
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * COOKIE_DAYS,
  });
}

export type CartResult = { ok: true; cart: Cart | null } | { ok: false; error: string };

export async function getCart(): Promise<CartResult> {
  if (!isStorefrontConfigured()) return { ok: true, cart: null };
  const id = await readCartId();
  if (!id) return { ok: true, cart: null };
  try {
    const data = await storefront<{ cart: RawCart | null }>(CART_QUERY, {
      variables: { id },
      cache: 'no-store',
    });
    // A cart that has been checked out comes back null; forget it.
    return { ok: true, cart: data.cart ? normalise(data.cart) : null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not read the cart' };
  }
}

export async function addToCart(variantId: string, quantity = 1): Promise<CartResult> {
  if (!isStorefrontConfigured()) {
    return { ok: false, error: 'The register is not open in this universe yet.' };
  }
  try {
    const id = await readCartId();
    const lines = [{ merchandiseId: variantId, quantity }];
    let cart: Cart;
    if (id) {
      const data = await storefront<{ cartLinesAdd: MutationPayload }>(CART_LINES_ADD, {
        variables: { cartId: id, lines },
        cache: 'no-store',
      });
      cart = unwrap(data.cartLinesAdd, 'Add to cart');
    } else {
      const data = await storefront<{ cartCreate: MutationPayload }>(CART_CREATE, {
        variables: { lines },
        cache: 'no-store',
      });
      cart = unwrap(data.cartCreate, 'Create cart');
      await writeCartId(cart.id);
    }
    return { ok: true, cart };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not add to cart' };
  }
}

export async function updateLine(lineId: string, quantity: number): Promise<CartResult> {
  const id = await readCartId();
  if (!id) return { ok: true, cart: null };
  try {
    if (quantity <= 0) return removeLine(lineId);
    const data = await storefront<{ cartLinesUpdate: MutationPayload }>(CART_LINES_UPDATE, {
      variables: { cartId: id, lines: [{ id: lineId, quantity }] },
      cache: 'no-store',
    });
    return { ok: true, cart: unwrap(data.cartLinesUpdate, 'Update cart') };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not update the cart' };
  }
}

export async function removeLine(lineId: string): Promise<CartResult> {
  const id = await readCartId();
  if (!id) return { ok: true, cart: null };
  try {
    const data = await storefront<{ cartLinesRemove: MutationPayload }>(CART_LINES_REMOVE, {
      variables: { cartId: id, lineIds: [lineId] },
      cache: 'no-store',
    });
    return { ok: true, cart: unwrap(data.cartLinesRemove, 'Remove from cart') };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not remove from cart' };
  }
}
