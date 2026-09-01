'use client';

import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

import { GarmentArt } from '@/components/GarmentArt';
import { T } from '@/components/universe/T';
import { catalogByHandle } from '@/lib/catalog';
import { cart as copy, product as productCopy } from '@/lib/copy';
import { useCart } from './CartProvider';

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export function CartDrawer() {
  const { cart, open, setOpen, pending, error, live, update, remove } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, setOpen]);

  const lines = cart?.lines ?? [];

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="backdrop"
            type="button"
            aria-label="Close cart"
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            key="drawer"
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <header className="flex items-center justify-between border-b border-line px-6" style={{ height: 'var(--header-h)' }}>
              <h2 className="display text-[26px]" style={{ ['--wdth' as string]: 120 }}>
                <T s={copy.title.sincere} i={copy.title.ironic} />
                <span className="mono ml-3 align-middle text-mute">({cart?.quantity ?? 0})</span>
              </h2>
              <button type="button" className="mono cursor-pointer hover:underline underline-offset-4" onClick={() => setOpen(false)}>
                <T s={copy.close.sincere} i={copy.close.ironic} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6" aria-busy={pending}>
              {error ? (
                <p className="mono mb-6 border border-accent px-3 py-2 text-accent normal-case tracking-normal">{error}</p>
              ) : null}

              {!live ? (
                <p className="text-lg text-[18px] leading-snug text-mute">
                  <T s={productCopy.unavailable.sincere} i={productCopy.unavailable.ironic} />
                </p>
              ) : lines.length === 0 ? (
                <p className="text-lg text-[20px] leading-snug text-mute">
                  <T s={copy.empty.sincere} i={copy.empty.ironic} />
                </p>
              ) : (
                <ul className="flex flex-col gap-6">
                  {lines.map((line) => {
                    const item = catalogByHandle[line.product.handle];
                    return (
                      <li key={line.id} className="grid grid-cols-[72px_1fr_auto] gap-4">
                        <Link href={`/products/${line.product.handle}`} onClick={() => setOpen(false)} className="relative aspect-[4/5] overflow-hidden border border-line bg-panel">
                          {line.product.image ? (
                            <Image src={line.product.image.url} alt={line.product.image.alt} fill sizes="72px" className="object-cover" />
                          ) : item ? (
                            <GarmentArt garment={item.garment} colourway={item.colourway} prints={item.prints} />
                          ) : null}
                        </Link>
                        <div className="min-w-0">
                          <Link href={`/products/${line.product.handle}`} onClick={() => setOpen(false)} className="display block text-[18px] leading-none" style={{ ['--wdth' as string]: 110 }}>
                            {line.product.title}
                          </Link>
                          <p className="mono mt-2 text-mute">{line.size}</p>
                          <div className="mono mt-3 inline-flex items-center border border-line">
                            <button type="button" className="h-8 w-8 cursor-pointer hover:bg-panel" onClick={() => update(line.id, line.quantity - 1)} aria-label="One fewer" disabled={pending}>
                              −
                            </button>
                            <span className="w-8 text-center tabular-nums">{line.quantity}</span>
                            <button type="button" className="h-8 w-8 cursor-pointer hover:bg-panel" onClick={() => update(line.id, line.quantity + 1)} aria-label="One more" disabled={pending}>
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          <span className="mono tabular-nums">{money(line.total.amount, line.total.currency)}</span>
                          <button type="button" className="mono cursor-pointer text-mute hover:text-fg hover:underline underline-offset-4" onClick={() => remove(line.id)} disabled={pending}>
                            <T s={copy.remove.sincere} i={copy.remove.ironic} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="border-t border-line px-6 py-5">
              {cart && lines.length > 0 ? (
                <>
                  <div className="mono flex items-center justify-between">
                    <T s={copy.subtotal.sincere} i={copy.subtotal.ironic} />
                    <span className="tabular-nums">{money(cart.subtotal.amount, cart.subtotal.currency)}</span>
                  </div>
                  <p className="text mt-2 text-[14px] text-mute">
                    <T s={copy.note.sincere} i={copy.note.ironic} />
                  </p>
                  <a href={cart.checkoutUrl} className="btn mt-5 w-full">
                    <T s={copy.checkout.sincere} i={copy.checkout.ironic} /> →
                  </a>
                </>
              ) : (
                <button type="button" className="btn btn--ghost w-full" onClick={() => setOpen(false)}>
                  <T s={copy.keep.sincere} i={copy.keep.ironic} />
                </button>
              )}
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
