'use client';

import Image from 'next/image';
import { useState } from 'react';

import { GarmentArt, type Side } from '@/components/GarmentArt';
import type { Product } from '@/lib/shopify/types';

/**
 * Front / back of the drawn garment, or the real photographs once they
 * exist in Shopify. The toggle only appears when there is a back to see.
 */
export function GarmentViewer({ product }: { product: Product }) {
  const [side, setSide] = useState<Side>('front');
  const [index, setIndex] = useState(0);
  const { garment, colourway, prints } = product.art;
  const hasBack = garment !== 'sock' && prints.some((p) => p.place === 'back');

  if (product.images.length > 0) {
    const img = product.images[index];
    return (
      <div>
        <div className="relative aspect-[4/5] overflow-hidden border border-line bg-panel">
          <Image src={img.url} alt={img.alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
        {product.images.length > 1 ? (
          <div className="mt-3 flex gap-2">
            {product.images.map((im, i) => (
              <button
                key={im.url}
                type="button"
                className="chip"
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                aria-label={`Image ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden border border-line bg-panel">
        <GarmentArt garment={garment} colourway={colourway} prints={prints} side={side} title={`${product.title}, ${side}`} />
      </div>
      {hasBack ? (
        <div className="mt-3 flex gap-2" role="group" aria-label="Side">
          <button type="button" className="chip" aria-pressed={side === 'front'} onClick={() => setSide('front')}>
            Front
          </button>
          <button type="button" className="chip" aria-pressed={side === 'back'} onClick={() => setSide('back')}>
            Back
          </button>
        </div>
      ) : null}
    </div>
  );
}
