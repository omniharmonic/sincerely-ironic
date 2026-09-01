import type { Colourway, Garment, Place, Print } from '@/lib/catalog';
import { typeset, type StyleKey } from '@/lib/typeset';

/**
 * Typographic garment art.
 *
 * No photography exists yet, so every piece is drawn: a silhouette and its
 * print, set by the same engine that makes the files sent to the printer.
 * The type is real SVG `<text>` with an explicit `textLength`, so each line is
 * stretched to a measure rather than guessed at — the guessing is what used to
 * push long words off the sides of the panel.
 *
 * Coordinates live in a 400×500 box.
 */

export type Side = 'front' | 'back';

/* Each colourway sits on its opposite, so the art reads in both universes
   and the grid checkers on its own. */
const FILL: Record<Colourway, { ground: string; cloth: string; print: string; seam: string }> = {
  bone: { ground: '#1c1c1c', cloth: '#e9e6dd', print: '#0d0d0d', seam: 'rgba(13,13,13,0.28)' },
  ink: { ground: '#e4e2db', cloth: '#161616', print: '#f3f3f0', seam: 'rgba(243,243,240,0.22)' },
};

interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
}

interface Shape {
  body: string;
  extras?: { d: string; stroke?: boolean; width?: number }[];
  areas: Partial<Record<Place, Area>>;
}

const SHAPES: Record<Garment, Shape> = {
  tee: {
    body: 'M120,95 L60,120 L30,220 L95,245 L95,470 L305,470 L305,245 L370,220 L340,120 L280,95 Q200,150 120,95 Z',
    extras: [{ d: 'M120,95 Q200,150 280,95 Q200,120 120,95 Z' }],
    areas: {
      front: { x: 108, y: 200, w: 184, h: 150 },
      back: { x: 106, y: 185, w: 188, h: 180 },
      chest: { x: 120, y: 198, w: 78, h: 42 },
    },
  },
  longsleeve: {
    body: 'M120,95 L70,115 L95,245 L95,470 L305,470 L305,245 L330,115 L280,95 Q200,150 120,95 Z',
    extras: [
      { d: 'M70,115 L18,430 L82,442 L112,250 Z' },
      { d: 'M330,115 L382,430 L318,442 L288,250 Z' },
      { d: 'M120,95 Q200,150 280,95 Q200,120 120,95 Z' },
    ],
    areas: {
      front: { x: 112, y: 200, w: 176, h: 145 },
      back: { x: 110, y: 185, w: 180, h: 175 },
      chest: { x: 122, y: 198, w: 76, h: 42 },
      sleeve: { x: -34, y: 276, w: 184, h: 32, rotate: -80 },
    },
  },
  hoodie: {
    body: 'M120,105 L60,130 L28,240 L95,262 L95,470 L305,470 L305,262 L372,240 L340,130 L280,105 Q200,150 120,105 Z',
    extras: [
      { d: 'M118,108 C120,20 280,20 282,108 C250,80 150,80 118,108 Z' },
      { d: 'M60,130 L20,420 L84,432 L108,262 Z' },
      { d: 'M340,130 L380,420 L316,432 L292,262 Z' },
      { d: 'M135,355 L265,355 L280,440 L120,440 Z', stroke: true },
    ],
    areas: {
      front: { x: 112, y: 208, w: 176, h: 128 },
      back: { x: 108, y: 190, w: 184, h: 176 },
      chest: { x: 122, y: 206, w: 76, h: 40 },
    },
  },
  crewneck: {
    body: 'M120,100 L68,120 L95,250 L95,470 L305,470 L305,250 L332,120 L280,100 Q200,140 120,100 Z',
    extras: [
      { d: 'M68,120 L22,425 L86,438 L112,255 Z' },
      { d: 'M332,120 L378,425 L314,438 L288,255 Z' },
      { d: 'M120,100 Q200,140 280,100 Q200,122 120,100 Z' },
      { d: 'M95,445 L305,445', stroke: true },
    ],
    areas: {
      front: { x: 112, y: 200, w: 176, h: 148 },
      back: { x: 110, y: 182, w: 180, h: 180 },
      chest: { x: 122, y: 198, w: 76, h: 42 },
    },
  },
  sweatpants: {
    body: 'M118,92 L282,92 L296,470 L214,470 L200,300 L186,470 L104,470 Z',
    extras: [
      { d: 'M118,128 L282,128', stroke: true },
      { d: 'M200,128 L200,170', stroke: true },
      { d: 'M186,152 C192,164 208,164 214,152', stroke: true },
    ],
    areas: {
      // Down the left leg, the way a track pant carries a wordmark.
      leg: { x: 112, y: 316, w: 74, h: 126 },
    },
  },
  cap: {
    body: 'M80,290 C80,150 140,110 210,110 C300,110 340,180 340,290 Z',
    extras: [
      { d: 'M338,290 L392,300 C400,312 392,322 378,322 L80,322 L80,290 Z' },
      { d: 'M210,110 L210,290', stroke: true },
      { d: 'M140,290 C150,200 190,150 210,140', stroke: true },
    ],
    areas: {
      front: { x: 112, y: 198, w: 176, h: 76 },
    },
  },
  bucket: {
    body: 'M126,296 C126,186 158,148 200,148 C242,148 274,186 274,296 Z',
    extras: [
      { d: 'M92,294 L308,294 C308,344 262,370 200,370 C138,370 92,344 92,294 Z' },
      { d: 'M126,256 L274,256', stroke: true },
    ],
    areas: {
      front: { x: 140, y: 188, w: 120, h: 60 },
    },
  },
  tote: {
    body: 'M80,180 L320,180 L320,470 L80,470 Z',
    extras: [{ d: 'M130,180 C130,40 270,40 270,180', stroke: true, width: 10 }],
    areas: {
      front: { x: 100, y: 232, w: 200, h: 176 },
      back: { x: 100, y: 232, w: 200, h: 176 },
    },
  },
  blanket: {
    body: 'M52,120 L348,120 L348,436 L52,436 Z',
    extras: [
      { d: 'M52,120 L348,120 L348,150 L52,150 Z' },
      { d: 'M68,136 L332,136', stroke: true },
      // A turned-back corner, so it reads as a blanket rather than a poster.
      { d: 'M348,436 L268,436 L348,368 Z' },
    ],
    areas: {
      front: { x: 84, y: 194, w: 232, h: 180 },
    },
  },
  sock: {
    body: 'M60,60 L60,320 Q60,372 112,372 L250,372 Q288,372 288,336 Q288,306 250,300 L150,290 L150,60 Z',
    extras: [{ d: 'M60,60 L150,60 L150,110 L60,110 Z' }],
    areas: {
      left: { x: 62, y: 126, w: 86, h: 150, rotate: 90 },
      right: { x: 62, y: 126, w: 86, h: 150, rotate: 90 },
    },
  },
};

function PrintBlock({
  print,
  area,
  colour,
  style,
}: {
  print: Print;
  area: Area;
  colour: string;
  style: StyleKey;
}) {
  const layout = typeset(print.text, print.style ?? style, area.w, area.h, print.fill ?? 1);
  const top = area.y + (area.h - layout.height) / 2;
  const cx = area.x + area.w / 2;
  const transform = area.rotate ? `rotate(${area.rotate} ${cx} ${area.y + area.h / 2})` : undefined;

  return (
    <g transform={transform} fill={colour}>
      {layout.lines.map((line, i) => (
        <text
          key={i}
          x={cx}
          y={top + line.y}
          textAnchor="middle"
          textLength={line.measure}
          lengthAdjust={line.measure ? 'spacingAndGlyphs' : undefined}
          style={{
            fontFamily: layout.style.family,
            fontWeight: layout.style.weight,
            fontSize: layout.fontSize,
            fontVariationSettings: layout.style.variation,
            letterSpacing: layout.style.letterSpacing ? `${layout.style.letterSpacing}em` : undefined,
          }}
        >
          {line.text}
        </text>
      ))}
    </g>
  );
}

export function GarmentArt({
  garment,
  colourway,
  prints,
  style,
  side = 'front',
  title,
  className = '',
}: {
  garment: Garment;
  colourway: Colourway;
  prints: readonly Print[];
  style: StyleKey;
  side?: Side;
  title?: string;
  className?: string;
}) {
  const shape = SHAPES[garment];
  const fill = FILL[colourway];

  // Socks show as a pair: one says one thing, one says the other.
  if (garment === 'sock') {
    const left = prints.find((p) => p.place === 'left');
    const right = prints.find((p) => p.place === 'right');
    return (
      <svg viewBox="0 0 400 500" className={`garment ${className}`} role="img" aria-label={title}>
        {title ? <title>{title}</title> : null}
        <rect width="400" height="500" fill={fill.ground} />
        {[left, right].map((p, i) => (
          <g key={i} transform={`translate(${30 + i * 190}, 70) scale(0.62)`}>
            <path d={shape.body} fill={fill.cloth} stroke={fill.seam} strokeWidth={2} strokeLinejoin="round" />
            {shape.extras?.map((e, j) => (
              <path key={j} d={e.d} fill="none" stroke={fill.seam} strokeWidth={2} />
            ))}
            {p ? <PrintBlock print={p} area={shape.areas[p.place]!} colour={fill.print} style={style} /> : null}
          </g>
        ))}
      </svg>
    );
  }

  const visible = prints.filter((p) => (side === 'front' ? p.place !== 'back' : p.place === 'back'));

  return (
    <svg viewBox="0 0 400 500" className={`garment ${className}`} role="img" aria-label={title}>
      {title ? <title>{title}</title> : null}
      <rect width="400" height="500" fill={fill.ground} />
      <path d={shape.body} fill={fill.cloth} stroke={fill.seam} strokeWidth={2} strokeLinejoin="round" />
      {shape.extras?.map((e, i) =>
        e.stroke ? (
          <path key={i} d={e.d} fill="none" stroke={fill.seam} strokeWidth={e.width ?? 2} strokeLinecap="round" />
        ) : (
          <path key={i} d={e.d} fill={fill.cloth} stroke={fill.seam} strokeWidth={2} strokeLinejoin="round" />
        ),
      )}
      {visible.map((p) => {
        const area = shape.areas[p.place];
        return area ? <PrintBlock key={p.place} print={p} area={area} colour={fill.print} style={style} /> : null;
      })}
      <text
        x={200}
        y={492}
        textAnchor="middle"
        fill={fill.cloth}
        opacity={0.55}
        style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em' }}
      >
        {side.toUpperCase()}
      </text>
    </svg>
  );
}
