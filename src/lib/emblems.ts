/**
 * Emblems.
 *
 * Flat, single-colour insignia drawn as primitives in a 100×100 field, so the
 * site and the print files can render the same shapes without either one
 * knowing how to draw. Single colour and no gradients is not a limitation
 * here — it is the embroidery spec: at most six thread colours, auto-matched
 * from the file, and nothing finer than 0.05in of line.
 *
 * The joke is never in the drawing. A unit patch is funny when it is drawn
 * completely straight and the words on it are not.
 */

export type EmblemKey = 'veteran';

export interface EmblemShape {
  /** Outline weight in field units; omitted means a solid fill. */
  stroke?: number;
  d?: string;
  points?: string;
  circle?: { cx: number; cy: number; r: number };
}

export interface Emblem {
  size: number;
  shapes: EmblemShape[];
}

const n = (v: number) => Number(v.toFixed(2));

/** A regular star, first point up. */
function star(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((-90 + (i * 180) / points) * Math.PI) / 180;
    out.push(`${n(cx + r * Math.cos(a))},${n(cy + r * Math.sin(a))}`);
  }
  return out.join(' ');
}

/** A chevron, pointing up. */
function chevron(cx: number, y: number, half: number, drop: number, thick: number): string {
  return (
    `M ${n(cx - half)},${n(y + drop)} L ${n(cx)},${n(y)} L ${n(cx + half)},${n(y + drop)} ` +
    `L ${n(cx + half)},${n(y + drop + thick)} L ${n(cx)},${n(y + thick)} ` +
    `L ${n(cx - half)},${n(y + drop + thick)} Z`
  );
}

/**
 * One laurel branch: leaves set along an arc, each turned to sit tangential
 * and canted outward the way a real wreath is drawn.
 */
function laurel(
  cx: number,
  cy: number,
  radius: number,
  fromDeg: number,
  toDeg: number,
  count: number,
  len: number,
  wide: number,
): string[] {
  const leaves: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const deg = fromDeg + (toDeg - fromDeg) * t;
    const a = (deg * Math.PI) / 180;
    const x = cx + radius * Math.cos(a);
    const y = cy + radius * Math.sin(a);
    // Leaves shorten toward the tip of the branch.
    const l = len * (1 - 0.42 * t);
    const w = wide * (1 - 0.42 * t);
    // Tangent, canted out from the centre.
    const rot = deg + (toDeg > fromDeg ? -118 : 118);
    const c = Math.cos((rot * Math.PI) / 180);
    const s = Math.sin((rot * Math.PI) / 180);
    const p = (dx: number, dy: number) => `${n(x + dx * c - dy * s)},${n(y + dx * s + dy * c)}`;
    // An almond: out along the leaf, back the other side.
    leaves.push(`M ${p(0, 0)} Q ${p(l * 0.5, -w)} ${p(l, 0)} Q ${p(l * 0.5, w)} ${p(0, 0)} Z`);
  }
  return leaves;
}

/**
 * Culture War Veteran. A perfectly ordinary unit patch: ring, star, three
 * service chevrons, laurel either side.
 */
const VETERAN: Emblem = {
  size: 100,
  shapes: [
    { circle: { cx: 50, cy: 50, r: 47 }, stroke: 3.2 },
    { circle: { cx: 50, cy: 50, r: 41 }, stroke: 1.2 },
    { points: star(50, 29, 12, 5) },
    // Narrower and shorter than they were, and lifted as a stack. At the old
    // size the bottom chevron ran out to x=35..65, where the laurel arc
    // (r=33 about 50,52) passes through y~81 with leaves reaching back to
    // y~70 — so chevron and wreath fused into one blob at the foot of the
    // patch. Three rows of 11.5 half-width ending at y=70 clear it.
    { d: chevron(50, 45, 11.5, 5.5, 3.6) },
    { d: chevron(50, 53, 11.5, 5.5, 3.6) },
    { d: chevron(50, 61, 11.5, 5.5, 3.6) },
    // In SVG, 90 degrees is straight down. Each branch starts near the foot
    // of the wreath and sweeps up its own side. They start 40 degrees apart,
    // not 20: at radius 33 a 20-degree gap is 11.5 units, and the leaves are
    // 11 long, so the two branches met in a blob at the bottom of the patch.
    ...laurel(50, 52, 33, 110, 190, 7, 11, 3.4).map((d) => ({ d })),
    ...laurel(50, 52, 33, 70, -10, 7, 11, 3.4).map((d) => ({ d })),
  ],
};

export const EMBLEMS: Record<EmblemKey, Emblem> = {
  veteran: VETERAN,
};
