'use client';

import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTime,
  useTransform,
  useVelocity,
} from 'motion/react';
import Link from 'next/link';

import { T } from '@/components/universe/T';
import { hero } from '@/lib/copy';
import { Logo } from './Logo';

const BASE = 118; // resting width, a little wide
const BREATH = 7; // idle sway, bounded
const PULL = 42; // how far fast scrolling compresses the letters

/**
 * The mark, then the statement. The statement's width axis is a pure
 * function of scroll velocity plus a bounded idle sway — never an
 * accumulator, so it cannot wind up.
 */
export function Hero() {
  const reduce = useReducedMotion();

  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { stiffness: 70, damping: 28, mass: 0.6 });
  const time = useTime();

  const wdth = useTransform([smooth, time], ([v, t]: number[]) => {
    if (reduce) return BASE;
    const breath = Math.sin(t / 2600) * BREATH;
    const pull = Math.max(-1, Math.min(1, v / 2600)) * PULL;
    return Math.max(50, Math.min(150, BASE + breath - Math.abs(pull)));
  });
  const fontVariationSettings = useMotionTemplate`"wdth" ${wdth}`;

  return (
    <section className="relative" style={{ padding: 'clamp(40px, 7vw, 96px) var(--gutter) clamp(40px, 6vw, 80px)' }}>
      <Logo className="hero__mark" />

      <motion.h1
        className="display mt-10"
        style={{ fontVariationSettings, fontSize: 'clamp(48px, 7.2vw, 136px)', lineHeight: 0.88, maxWidth: '15ch' }}
      >
        <T s={hero.statement.sincere} i={hero.statement.ironic} />
      </motion.h1>

      <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,52ch)_auto] md:items-end">
        <p className="text-lg text-[clamp(18px,1.7vw,24px)] leading-[1.4] text-mute">
          <T s={hero.sub.sincere} i={hero.sub.ironic} />
        </p>
        <Link href="#shop" className="btn justify-self-start md:justify-self-end">
          <T s={hero.cta.sincere} i={hero.cta.ironic} /> ↓
        </Link>
      </div>
    </section>
  );
}
