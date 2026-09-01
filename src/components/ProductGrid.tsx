import { T } from '@/components/universe/T';
import { grid } from '@/lib/copy';
import type { Product } from '@/lib/shopify/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products }: { products: Product[] }) {
  const count = grid.count(products.length);
  return (
    <section id="shop" className="scroll-mt-16" style={{ padding: '0 var(--gutter)' }}>
      <header className="flex items-baseline justify-between border-t border-line pt-5">
        <h2 className="display text-[clamp(28px,3.4vw,48px)]" style={{ ['--wdth' as string]: 125 }}>
          <T s={grid.heading.sincere} i={grid.heading.ironic} />
        </h2>
        <p className="mono text-mute">
          <T s={count.sincere} i={count.ironic} />
        </p>
      </header>
      <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-8 2xl:grid-cols-5">
        {products.map((p, i) => (
          <li key={p.handle}>
            <ProductCard product={p} priority={i < 3} />
          </li>
        ))}
      </ul>
    </section>
  );
}
