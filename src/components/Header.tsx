import Link from 'next/link';

import { CartButton } from '@/components/cart/CartButton';
import { UniverseSwitch } from '@/components/universe/UniverseSwitch';
import { T } from '@/components/universe/T';
import { nav } from '@/lib/copy';
import { Wordmark } from './Wordmark';

export function Header() {
  return (
    <header className="header">
      <Wordmark />
      <nav className="nav mono flex items-center gap-5 sm:gap-7" aria-label="Primary">
        <Link href="/#shop">
          <T s={nav.shop.sincere} i={nav.shop.ironic} />
        </Link>
        <Link href="/about" className="hidden sm:inline-block">
          <T s={nav.about.sincere} i={nav.about.ironic} />
        </Link>
        <CartButton />
      </nav>
      <UniverseSwitch />
    </header>
  );
}
