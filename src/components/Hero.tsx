import Link from 'next/link';

import { T } from '@/components/universe/T';
import { hero, site } from '@/lib/copy';
import { SerpentHero } from './SerpentHero';

/**
 * Graphic first. The serpent carries the page; the words stay in the corners
 * and say only what a shop says.
 */
export function Hero() {
  return (
    <section className="hero">
      <h1 className="sr-only">{site.name}</h1>
      <div className="hero__stage">
        <SerpentHero />
      </div>
      <div className="hero__feet mono">
        <p>
          <T s={hero.caption.sincere} i={hero.caption.ironic} />
        </p>
        <Link href="#shop" className="hero__cta">
          {hero.cta} ↓
        </Link>
      </div>
    </section>
  );
}
