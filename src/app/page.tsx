import { Hero } from '@/components/Hero';
import { Positions } from '@/components/Positions';
import { ProductGrid } from '@/components/ProductGrid';
import { getProducts } from '@/lib/shopify/products';

export default async function HomePage() {
  const products = await getProducts();
  return (
    <>
      <Hero />
      <ProductGrid products={products} />
      <Positions />
    </>
  );
}
