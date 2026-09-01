'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { T } from '@/components/universe/T';
import { cart as copy } from '@/lib/copy';

/** /cart opens the drawer; the page underneath just points back. */
export default function CartPage() {
  const { setOpen } = useCart();
  useEffect(() => setOpen(true), [setOpen]);
  return (
    <div style={{ padding: 'clamp(40px, 7vw, 110px) var(--gutter) 0' }}>
      <h1 className="display text-[clamp(40px,8vw,120px)]" style={{ ['--wdth' as string]: 120 }}>
        <T s={copy.title.sincere} i={copy.title.ironic} />
      </h1>
      <p className="text-lg mt-6 text-[20px] text-mute">
        <button type="button" onClick={() => setOpen(true)} className="cursor-pointer underline underline-offset-4 hover:text-accent">
          Open cart
        </button>
        <span className="mx-3 opacity-40">/</span>
        <Link href="/#shop" className="underline underline-offset-4 hover:text-accent">
          <T s={copy.keep.sincere} i={copy.keep.ironic} />
        </Link>
      </p>
    </div>
  );
}
