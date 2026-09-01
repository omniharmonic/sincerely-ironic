'use client';

import Image from 'next/image';
import { useState } from 'react';

import { GarmentArt, type Side } from '@/components/GarmentArt';
import { T } from '@/components/universe/T';
import { product as copy } from '@/lib/copy';
import type { Product } from '@/lib/shopify/types';
import { STYLES } from '@/lib/typeset';

/**
 * Front and back of the drawn garment, and the type treatments the design
 * ships in. Real photographs replace the drawing the moment Shopify has any.
 */
export function GarmentViewer({ product }: { product: Product }) {
  const [side, setSide] = useState<Side>('front');
  const [index, setIndex] = useState(0);
  const { garment, colourway, prints, styles } = product.art;
  const [style, setStyle] = useState(styles[0]);
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
              <button key={im.url} type="button" className="chip" aria-pressed={i === index} onClick={() => setIndex(i)} aria-label={`Image ${i + 1}`}>
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
        <GarmentArt
          garment={garment}
          colourway={colourway}
          prints={prints}
          style={style}
          side={side}
          title={`${product.title}, ${side}`}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {hasBack ? (
          <div className="flex gap-2" role="group" aria-label="Side">
            <button type="button" className="chip" aria-pressed={side === 'front'} onClick={() => setSide('front')}>
              Front
            </button>
            <button type="button" className="chip" aria-pressed={side === 'back'} onClick={() => setSide('back')}>
              Back
            </button>
          </div>
        ) : null}

        {styles.length > 1 ? (
          <div className="ml-auto flex gap-2" role="group" aria-label="Type treatment">
            {styles.map((key) => (
              <button
                key={key}
                type="button"
                className="chip"
                aria-pressed={style === key}
                onClick={() => setStyle(key)}
                title={STYLES[key].note}
              >
                {STYLES[key].label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {styles.length > 1 ? (
        <p className="mono mt-3 text-mute">
          <T s={copy.styleNote.sincere} i={copy.styleNote.ironic} />
        </p>
      ) : null}
    </div>
  );
}
