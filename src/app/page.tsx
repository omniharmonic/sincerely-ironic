import { Care } from '@/components/Care';
import { Hero } from '@/components/Hero';
import { ProductGrid } from '@/components/ProductGrid';
import { getProducts } from '@/lib/shopify/products';

export default async function HomePage() {
  const products = await getProducts();
  return (
    <>
      <Hero />
      <ProductGrid products={products} />
      <Care />
    </>
  );
}
