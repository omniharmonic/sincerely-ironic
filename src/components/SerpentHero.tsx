'use client';

import { useAnimationFrame, useReducedMotion, useScroll } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * The serpent.
 *
 * One face from the mark, repeated all the way around a closed lemniscate,
 * each instance mirrored to look the way it travels and filled with a
 * hue-rotated slick. The instances overlap, so the body mixes its own colour.
 *
 * The loop is genuinely closed. There is no head and no tail: segments are
 * spaced `i / N` of the way round, so the last one is exactly one step behind
 * the first with nothing between them, and size and opacity come from a
 * periodic function of position, which necessarily agrees at the seam. An
 * earlier version left a gap and tapered by index, which put a full-size face
 * next to a vanishing one — the discontinuity swept round the loop and read
 * as faces popping in and out.
 *
 * Everything is a pure function of (scroll, elapsed, pointer) through sin and
 * cos, so the motion is bounded by construction — no accumulator to unwind.
 */

const TAU = Math.PI * 2;

/** Radians of phase per pixel scrolled. */
const SCROLL_GAIN = TAU / 2400;

/** Radians of phase per millisecond idle. One lap every ~30 seconds. */
const DRIFT = TAU / 30000;

/** How far the body swings off the curve, in viewBox units. */
const SWIM = 30;

/** Reach of the pointer, in viewBox units, and how hard it shoves. */
const POINTER_REACH = 250;
const POINTER_PUSH = 78;
/** How much a face swells as the pointer nears it. */
const POINTER_SWELL = 0.42;
/** Per-frame approach of the smoothed pointer to the real one. */
const POINTER_EASE = 0.12;

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

const WIDE: Shape = { w: 1000, h: 540, ax: 356, ay: 150, upright: false, segments: 26, size: 250 };
const TALL: Shape = { w: 620, h: 940, ax: 158, ay: 330, upright: true, segments: 22, size: 226 };

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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groups = useRef<(SVGGElement | null)[]>([]);
  const [shape, setShape] = useState<Shape>(WIDE);

  /** Pointer in viewBox units: where it is, and where the body thinks it is. */
  const pointer = useRef({ tx: 0, ty: 0, x: 0, y: 0, tOn: 0, on: 0 });

  useEffect(() => {
    const mq = window.matchMedia('(max-aspect-ratio: 4/5)');
    const apply = () => setShape(mq.matches ? TALL : WIDE);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    // The pointer is tracked across the whole page, not just the drawing, so
    // the body reacts as you approach it rather than only once you are on it.
    const onMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      // Undo preserveAspectRatio="xMidYMid meet" to get viewBox units.
      const s = Math.min(r.width / shape.w, r.height / shape.h);
      pointer.current.tx = (e.clientX - r.left - (r.width - shape.w * s) / 2) / s;
      pointer.current.ty = (e.clientY - r.top - (r.height - shape.h * s) / 2) / s;
      pointer.current.tOn = 1;
    };
    const onLeave = () => {
      pointer.current.tOn = 0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [shape]);

  useAnimationFrame((elapsed) => {
    const phase = scrollY.get() * SCROLL_GAIN + (reduce ? 0 : elapsed * DRIFT);
    const wobble = reduce ? 0 : elapsed * 0.0012;

    // Ease the pointer so a flick of the mouse does not snap the body.
    const p = pointer.current;
    p.x += (p.tx - p.x) * POINTER_EASE;
    p.y += (p.ty - p.y) * POINTER_EASE;
    p.on += (p.tOn - p.on) * POINTER_EASE;

    for (let i = 0; i < shape.segments; i += 1) {
      const g = groups.current[i];
      if (!g) continue;

      // i / N, not i / (N - 1): the last segment sits one step short of the
      // first rather than on top of it, which is what closes the loop.
      const along = i / shape.segments;
      const t = phase + along * TAU;

      const [bx, by] = curve(t, shape);
      const [bx2, by2] = curve(t + 0.012, shape);
      const dx = bx2 - bx;
      const dy = by2 - by;
      const len = Math.hypot(dx, dy) || 1;

      // Swing the body off the curve along its normal, so it slithers rather
      // than merely bobbing.
      const swim = Math.sin(3.2 * t + wobble) * SWIM;
      let x = bx - (dy / len) * swim;
      let y = by + (dx / len) * swim;

      // A swell travelling round the body. Both terms are periodic in `along`,
      // so segment N-1 and segment 0 agree and the seam is invisible.
      const u = along * TAU - phase * 0.35;
      const wave = 0.5 + 0.5 * Math.cos(u);
      let scale = 0.62 + 0.38 * wave;
      const alpha = 0.5 + 0.42 * wave;

      // The pointer shoves nearby faces aside and makes them swell.
      if (p.on > 0.001) {
        const px = x - p.x;
        const py = y - p.y;
        const dist = Math.hypot(px, py) || 1;
        const near = Math.exp(-((dist / POINTER_REACH) ** 2)) * p.on;
        const shove = (near * POINTER_PUSH) / dist;
        x += px * shove;
        y += py * shove;
        scale *= 1 + near * POINTER_SWELL;
      }

      // The face is a profile. Turning it through the full tangent would stand
      // it on its head halfway round the loop, so it is mirrored to face the
      // way it travels and only banked a little.
      const facing = dx >= 0 ? 1 : -1;
      const bank = Math.max(-24, Math.min(24, ((Math.atan2(dy, dx * facing) * 180) / Math.PI) * 0.5));

      g.setAttribute(
        'transform',
        `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${bank.toFixed(2)}) scale(${(facing * scale).toFixed(4)} ${scale.toFixed(4)})`,
      );
      g.setAttribute('opacity', alpha.toFixed(3));
    }
  });

  const w = shape.size;
  const h = w * FACE_RATIO;

  return (
    <svg
      ref={svgRef}
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

      {Array.from({ length: shape.segments }, (_, i) => (
        <g
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
          className="serpent__seg"
          fill={`url(#${GRADIENTS[i % GRADIENTS.length].id})`}
        >
          <use href="#si-serpent-face" x={-w / 2} y={-h / 2} width={w} height={h} />
        </g>
      ))}
    </svg>
  );
}
