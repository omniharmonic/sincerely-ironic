'use client';

import Image from 'next/image';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import { ArtFallback } from '@/components/ArtFallback';
import { noColour, readColour, subscribeColour } from '@/lib/product/colour';
import type { Product } from '@/lib/shopify/types';

/** How far the image lifts under the cursor. */
const ZOOM = 2.4;

/**
 * Every photograph the vendor made of this product, and nothing drawn.
 *
 * There is no type-treatment picker here. The treatment is fixed when the
 * product is built, so a chip offering another one was a choice the cart, the
 * order and the printer never heard about.
 */
export function GarmentViewer({ product }: { product: Product }) {
  const images = product.images;
  const colour = useSyncExternalStore(subscribeColour, () => readColour(product.handle), noColour);

  // Where the chosen colour is photographed, if one has been picked.
  const wanted = colour ? product.colourImages[colour] : undefined;
  const forColour = wanted ? images.findIndex((im) => im.url === wanted) : -1;

  // A thumbnail choice is remembered against the colour it was made under, so
  // picking a colour moves the gallery to that colour's own shot and going
  // back to a thumbnail still works — and neither needs an effect to write
  // state, which this repo's lint rules forbid anyway.
  const [pick, setPick] = useState<{ colour: string | null; index: number } | null>(null);
  const index = pick && pick.colour === colour ? pick.index : forColour >= 0 ? forColour : 0;
  const current = images[Math.min(index, images.length - 1)];

  const lens = useRef<HTMLDivElement | null>(null);

  // Written straight to the DOM rather than through state: a pointer moves
  // far more often than a component should re-render, which is the same
  // reason the hero writes its transforms by hand.
  const track = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = lens.current;
    // Touch has no hover, and a finger dragging the page should not zoom it.
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.transformOrigin = `${x.toFixed(2)}% ${y.toFixed(2)}%`;
    el.style.transform = `scale(${ZOOM})`;
  }, []);

  const release = useCallback(() => {
    const el = lens.current;
    if (!el) return;
    el.style.transform = '';
    el.style.transformOrigin = '';
  }, []);

  return (
    <div>
      {/* Fitted, not filled: a vendor mockup arrives at whatever aspect it
          likes — Printify's are square — and cropping one to this frame cut
          the ends off the yard sign's own words. */}
      <div className="relative aspect-[4/5] overflow-hidden border border-line bg-panel">
        {current ? (
          <div
            ref={lens}
            className="lens absolute inset-0"
            onPointerMove={track}
            onPointerLeave={release}
            onPointerCancel={release}
          >
            <Image
              src={current.url}
              alt={current.alt}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain p-[4%]"
            />
          </div>
        ) : (
          <ArtFallback title={product.title} />
        )}
      </div>

      {images.length > 1 ? (
        /* The thumbnail is the label. A row of numbers made the customer click
           to find out what they were picking. */
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Views">
          {images.map((im, i) => (
            <button
              key={im.url}
              type="button"
              className="thumb"
              aria-pressed={i === index}
              aria-label={`View image ${i + 1} of ${images.length}`}
              onClick={() => setPick({ colour, index: i })}
            >
              <Image src={im.url} alt="" fill sizes="64px" className="object-contain p-[6%]" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
