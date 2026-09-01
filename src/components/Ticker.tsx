'use client';

import { useEffect, useState } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { useUniverse } from '@/components/universe/UniverseProvider';
import { ticker } from '@/lib/copy';

function useClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () =>
      setNow(
        new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Denver',
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Store status. What a store status bar says. */
export function Ticker() {
  const { universe } = useUniverse();
  const { count } = useCart();
  const time = useClock();
  const items = [
    ticker.open,
    ticker.imagined,
    `Boulder ${time ?? "--:--"} MT`,
    ticker.returns,
    `Cart: ${count}`,
    ticker.thanks[universe],
  ];
  // Duplicated so the marquee loops seamlessly at -50%.
  const track = [...items, ...items];

  return (
    <div className="ticker mono" role="status" aria-live="off">
      <div className="ticker__track">
        {track.map((t, i) => (
          <span key={i} aria-hidden={i >= items.length}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
