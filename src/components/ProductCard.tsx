import Image from 'next/image';
import Link from 'next/link';

import { GarmentArt } from '@/components/GarmentArt';
import type { Product } from '@/lib/shopify/types';

export const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const image = product.images[0];
  return (
    <Link href={`/products/${product.handle}`} className="card group">
      <div className="card__art">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 33vw, 50vw"
            priority={priority}
            className="object-cover"
          />
        ) : (
          <GarmentArt garment={product.art.garment} colourway={product.art.colourway} prints={product.art.prints} title={product.title} />
        )}
        {!product.available ? <span className="mono absolute left-3 top-3 border border-line bg-bg px-2 py-1">Sold out</span> : null}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <h3 className="display card__name">{product.title}</h3>
        <span className="mono mt-2 shrink-0 tabular-nums">{money(product.price.amount, product.price.currency)}</span>
      </div>
      <p className="mono mt-2 text-mute">{product.type}</p>
    </Link>
  );
}
