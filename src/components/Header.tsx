import Link from 'next/link';

import { CartButton } from '@/components/cart/CartButton';
import { UniverseSwitch } from '@/components/universe/UniverseSwitch';
import { nav } from '@/lib/copy';
import { Wordmark } from './Wordmark';

export function Header() {
  return (
    <header className="header">
      <Wordmark />
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
