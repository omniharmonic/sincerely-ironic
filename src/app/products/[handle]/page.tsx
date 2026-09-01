import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GarmentViewer } from '@/components/GarmentViewer';
import { money } from '@/components/ProductCard';
import { ProductForm } from '@/components/ProductForm';
import { FlipButton } from '@/components/universe/FlipButton';
import { T, THtml } from '@/components/universe/T';
import { catalog } from '@/lib/catalog';
import { grid, product as copy } from '@/lib/copy';
import { getProduct } from '@/lib/shopify/products';

export function generateStaticParams() {
  return catalog.map((c) => ({ handle: c.handle }));
}

export async function generateMetadata({ params }: PageProps<'/products/[handle]'>): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return {};
  return {
    title: product.title,
    description: product.tagline.sincere,
    openGraph: {
      title: product.title,
      description: product.tagline.sincere,
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<'/products/[handle]'>) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();

  return (
    <article className="grid gap-10 lg:grid-cols-2 lg:gap-16" style={{ padding: 'clamp(24px, 4vw, 56px) var(--gutter) 0' }}>
      <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
        <GarmentViewer product={product} />
      </div>

      <div className="max-w-[56ch]">
        <p className="mono text-mute">
          <Link href="/#shop" className="hover:underline underline-offset-4">
            ← <T s={copy.back.sincere} i={copy.back.ironic} />
          </Link>
          <span className="mx-3 opacity-40">/</span>
          {product.type}
        </p>

        <h1 className="display mt-6 text-[clamp(40px,6vw,88px)]" style={{ ['--wdth' as string]: 118 }}>
          {product.title}
        </h1>
        <p className="text-lg mt-4 text-[clamp(18px,1.6vw,22px)] italic leading-snug text-mute">
          <T s={product.tagline.sincere} i={product.tagline.ironic} />
        </p>
        <p className="mono mt-6 text-[14px] tabular-nums">{money(product.price.amount, product.price.currency)}</p>

        <ProductForm sizes={product.sizes} available={product.available} />

        <THtml s={product.description.sincere} i={product.description.ironic} className="prose mt-10" />

        <p className="text mt-6 text-[16px] text-mute">
          <FlipButton>
            <T s={grid.otherReading.sincere} i={grid.otherReading.ironic} />
          </FlipButton>
        </p>

        <dl className="mono mt-12 grid gap-3 border-t border-line pt-5 text-mute normal-case tracking-normal leading-relaxed">
          <div>
            <T s={copy.fit.sincere} i={copy.fit.ironic} />
          </div>
          <div>
            <T s={copy.details.sincere} i={copy.details.ironic} />
          </div>
        </dl>
      </div>
    </article>
  );
}
