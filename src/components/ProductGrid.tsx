import type { Product } from '@/lib/shopify/types';
import { ShopFilter } from './ShopFilter';

/**
 * The shop section. The heading, the filter row and the grid all live in
 * `ShopFilter`, because the count in the header has to agree with whatever
 * the filter is showing.
 */
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <section id="shop" className="scroll-mt-16" style={{ padding: '0 var(--gutter)' }}>
      <ShopFilter products={products} />
    </section>
  );
}
