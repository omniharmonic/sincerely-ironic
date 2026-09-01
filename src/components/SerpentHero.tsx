'use client';

import { useAnimationFrame, useReducedMotion, useScroll } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * The serpent.
 *
 * One face from the mark, repeated along a closed lemniscate, each instance
 * mirrored to look the way it travels and filled with a hue-rotated slick.
 * The instances overlap, so the body mixes its own colour; the largest is the
 * head, and the chain tapers away from it into the gap at its own tail.
 *
 * Everything is a pure function of (scroll, elapsed) through sin/cos, so the
 * motion is bounded by construction — there is no accumulator to unwind, the
 * rule the parent company's site learned the hard way.
 */

const TAU = Math.PI * 2;

/** How much of the loop the body occupies. The rest is the gap it never closes. */
const SPAN = 0.93;

/** Radians of phase per pixel scrolled. */
const SCROLL_GAIN = TAU / 2400;

/** Radians of phase per millisecond idle. One lap every ~30 seconds. */
const DRIFT = TAU / 30000;

/** How far the body swings off the curve, in viewBox units. */
const SWIM = 30;

interface Shape {
  w: number;
  h: number;
  /** lemniscate amplitudes */
  ax: number;
  ay: number;
  /** true = tall screens, where the figure stands up */
  upright: boolean;
  segments: number;
  /** face width in viewBox units */
  size: number;
}

const WIDE: Shape = { w: 1000, h: 540, ax: 356, ay: 150, upright: false, segments: 22, size: 282 };
const TALL: Shape = { w: 620, h: 940, ax: 158, ay: 330, upright: true, segments: 18, size: 250 };

/** Six rotations of the slick, so the body runs a spectrum without a filter. */
const STOPS = ['#ff2e9e', '#ffb52e', '#1fcfee', '#7c3aed', '#ff5ac8', '#4dffc3'];
const GRADIENTS = Array.from({ length: 6 }, (_, k) => ({
  id: `si-slick-${k}`,
  angle: 30 + k * 24,
  stops: [STOPS[k % 6], STOPS[(k + 2) % 6], STOPS[(k + 4) % 6]],
}));

/** The face, lifted from the mark. The full lockup at this density reads as noise. */
const FACE =
  'M 89.26758,-6.93e-5 H 148.9691 L 198.40466,111.34812 H 176.6736 v 32.99105 c -0.13735,12.03845 -8.88383,20.57637 -21.83507,21.79872 h -11.08729 v 57.0348 H 64.010498 V 163.83265 C 25.697809,158.00406 6e-6,127.55381 6e-6,84.900524 6e-6,34.175831 40.310752,-6.93e-5 89.26758,-6.93e-5 Z m 44.03701,55.4687443 c -11.35899,0 -20.5758,9.190289 -20.5758,20.550281 0,11.39366 9.21681,20.583128 20.5758,20.583128 11.35896,0 20.54838,-9.189468 20.54838,-20.583128 0,-11.35719 -9.18942,-20.550281 -20.54838,-20.550281 z';

const FACE_RATIO = 223.17815 / 264.58336;

/** The bare curve, before the body swings off it. */
function curve(t: number, s: Shape): [number, number] {
  if (s.upright) return [s.w / 2 + s.ax * Math.sin(2 * t), s.h / 2 + s.ay * Math.cos(t)];
  return [s.w / 2 + s.ax * Math.cos(t), s.h / 2 + s.ay * Math.sin(2 * t)];
}

export function SerpentHero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const groups = useRef<(SVGGElement | null)[]>([]);
  const [shape, setShape] = useState<Shape>(WIDE);

  useEffect(() => {
    const mq = window.matchMedia('(max-aspect-ratio: 4/5)');
    const apply = () => setShape(mq.matches ? TALL : WIDE);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useAnimationFrame((elapsed) => {
    const phase = scrollY.get() * SCROLL_GAIN + (reduce ? 0 : elapsed * DRIFT);
    const wobble = reduce ? 0 : elapsed * 0.0012;

    for (let i = 0; i < shape.segments; i += 1) {
      const g = groups.current[i];
      if (!g) continue;

      const along = i / (shape.segments - 1);
      const t = phase + along * SPAN * TAU;

      const [bx, by] = curve(t, shape);
      const [bx2, by2] = curve(t + 0.012, shape);
      const dx = bx2 - bx;
      const dy = by2 - by;
      const len = Math.hypot(dx, dy) || 1;

      // Swing the body off the curve along its normal, so it slithers rather
      // than merely bobbing.
      const swim = Math.sin(3.2 * t + wobble) * SWIM;
      const x = bx - (dy / len) * swim;
      const y = by + (dx / len) * swim;

      // The face is a profile. Turning it through the full tangent would stand
      // it on its head halfway round the loop, so it is mirrored to face the
      // way it travels and only banked a little.
      const facing = dx >= 0 ? 1 : -1;
      const bank = Math.max(-24, Math.min(24, ((Math.atan2(dy, dx * facing) * 180) / Math.PI) * 0.5));
      const scale = 1 - 0.44 * along ** 0.7;

      g.setAttribute(
        'transform',
        `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${bank.toFixed(2)}) scale(${(facing * scale).toFixed(4)} ${scale.toFixed(4)})`,
      );
    }
  });

  const w = shape.size;
  const h = w * FACE_RATIO;

  return (
    <svg
      className="serpent"
      viewBox={`0 0 ${shape.w} ${shape.h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <symbol id="si-serpent-face" viewBox="0 0 264.58336 223.17815">
          <path d={FACE} />
        </symbol>
        {GRADIENTS.map((g) => (
          <linearGradient key={g.id} id={g.id} gradientTransform={`rotate(${g.angle} 0.5 0.5)`}>
            {g.stops.map((c, i) => (
              <stop key={c + i} offset={i / (g.stops.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        ))}
      </defs>

      {/* Painted tail first, so the head lands on top of its own body. */}
      {Array.from({ length: shape.segments }, (_, n) => shape.segments - 1 - n).map((i) => {
        const along = i / (shape.segments - 1);
        return (
          <g
            key={i}
            ref={(el) => {
              groups.current[i] = el;
            }}
            className="serpent__seg"
            fill={`url(#${GRADIENTS[i % GRADIENTS.length].id})`}
            opacity={0.92 - 0.42 * along}
          >
            <use href="#si-serpent-face" x={-w / 2} y={-h / 2} width={w} height={h} />
          </g>
        );
      })}
    </svg>
  );
}
