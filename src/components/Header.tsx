import Link from 'next/link';

import { CartButton } from '@/components/cart/CartButton';
import { UniverseSwitch } from '@/components/universe/UniverseSwitch';
import { nav } from '@/lib/copy';
import { Wordmark } from './Wordmark';

export function Header() {
  return (
    <header className="header">
      {/* Wordmark sets its size as an inline style, which beats any rule in
          the stylesheet — so the responsive size has to be passed in here,
          not written as a media query. The lockup, the nav and the switch
          share a phone's width between them. */}
      <Wordmark size="clamp(13px, 3.4vw, 17px)" />
      <nav className="nav mono flex items-center gap-5 sm:gap-7" aria-label="Primary">
        <Link href="/#shop">{nav.shop}</Link>
        <Link href="/about" className="hidden sm:inline-block">
          {nav.about}
        </Link>
        <CartButton />
      </nav>
      <UniverseSwitch />
    </header>
  );
}
