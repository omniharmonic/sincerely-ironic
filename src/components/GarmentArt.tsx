import type { Colourway, Garment, Print } from '@/lib/catalog';

/**
 * Typographic garment art. No photography exists yet, so every piece is
 * drawn: a silhouette and its print, set in the display face. When Shopify
 * has an image the card uses that instead; this is the fallback and the
 * house style.
 *
 * Coordinates live in a 400×500 box. Print areas are `foreignObject`s so the
 * text wraps and can use the variable font.
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
  /** Base font size for scale 1. */
  size: number;
  rotate?: number;
}

const SHAPES: Record<
  Garment,
  {
    body: string;
    extras?: { d: string; stroke?: boolean; width?: number }[];
    areas: Partial<Record<Print['place'], Area>>;
  }
> = {
  tee: {
    body: 'M120,95 L60,120 L30,220 L95,245 L95,470 L305,470 L305,245 L370,220 L340,120 L280,95 Q200,150 120,95 Z',
    extras: [{ d: 'M120,95 Q200,150 280,95 Q200,120 120,95 Z' }],
    areas: {
      chest: { x: 118, y: 196, w: 96, h: 54, size: 17 },
      front: { x: 105, y: 190, w: 190, h: 220, size: 40 },
      back: { x: 105, y: 170, w: 190, h: 250, size: 44 },
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
      chest: { x: 120, y: 196, w: 94, h: 54, size: 17 },
      front: { x: 110, y: 190, w: 180, h: 200, size: 38 },
      back: { x: 110, y: 170, w: 180, h: 240, size: 44 },
      sleeve: { x: -40, y: 275, w: 190, h: 34, size: 20, rotate: -80 },
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
      chest: { x: 120, y: 190, w: 94, h: 54, size: 17 },
      front: { x: 110, y: 185, w: 180, h: 160, size: 34 },
      back: { x: 105, y: 170, w: 190, h: 250, size: 46 },
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
      chest: { x: 120, y: 192, w: 94, h: 54, size: 17 },
      front: { x: 110, y: 185, w: 180, h: 200, size: 38 },
      back: { x: 105, y: 165, w: 190, h: 250, size: 46 },
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
      front: { x: 110, y: 180, w: 180, h: 100, size: 22 },
    },
  },
  sock: {
    body: 'M60,60 L60,320 Q60,372 112,372 L250,372 Q288,372 288,336 Q288,306 250,300 L150,290 L150,60 Z',
    extras: [{ d: 'M60,60 L150,60 L150,110 L60,110 Z' }],
    areas: {
      left: { x: 62, y: 120, w: 86, h: 160, size: 30, rotate: 90 },
      right: { x: 62, y: 120, w: 86, h: 160, size: 30, rotate: 90 },
    },
  },
  tote: {
    body: 'M80,180 L320,180 L320,470 L80,470 Z',
    extras: [{ d: 'M130,180 C130,40 270,40 270,180', stroke: true, width: 10 }],
    areas: {
      front: { x: 100, y: 230, w: 200, h: 200, size: 40 },
      back: { x: 100, y: 230, w: 200, h: 200, size: 40 },
    },
  },
};

function isLower(text: string) {
  return text !== text.toUpperCase();
}

/* Average advance of Anybody at wdth 112, weight 800, uppercase — used to
   shrink the type until the longest word fits on one line. */
const ADVANCE = 0.68;
const ADVANCE_TEXT = 0.5;

function PrintBlock({ print, area, colour }: { print: Print; area: Area; colour: string }) {
  const wanted = area.size * (print.scale ?? 1);
  const longest = Math.max(...print.text.split(/\s+/).map((w) => w.length), 1);
  const size = Math.min(wanted, (area.w * 0.96) / (longest * (print.face === 'text' ? ADVANCE_TEXT : ADVANCE)));
  const transform = area.rotate ? `rotate(${area.rotate} ${area.x + area.w / 2} ${area.y + area.h / 2})` : undefined;
  return (
    <foreignObject x={area.x} y={area.y} width={area.w} height={area.h} transform={transform}>
      <div
        // @ts-expect-error xmlns is required for foreignObject HTML in some engines
        xmlns="http://www.w3.org/1999/xhtml"
        className={[
          'garment__print',
          print.face === 'text' ? 'garment__print--text' : '',
          isLower(print.text) ? 'garment__print--keep' : '',
        ].join(' ')}
        style={{ color: colour, fontSize: size }}
      >
        {print.text}
      </div>
    </foreignObject>
  );
}

export function GarmentArt({
  garment,
  colourway,
  prints,
  side = 'front',
  title,
  className = '',
}: {
  garment: Garment;
  colourway: Colourway;
  prints: readonly Print[];
  side?: Side;
  title?: string;
  className?: string;
}) {
  const shape = SHAPES[garment];
  const fill = FILL[colourway];

  // Socks show as a pair: the left sock and the right sock, side by side.
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
            {p ? <PrintBlock print={p} area={shape.areas[p.place]!} colour={fill.print} /> : null}
          </g>
        ))}
      </svg>
    );
  }

  const visible = prints.filter((p) => {
    if (side === 'front') return p.place === 'front' || p.place === 'chest' || p.place === 'sleeve';
    return p.place === 'back';
  });

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
        return area ? <PrintBlock key={p.place} print={p} area={area} colour={fill.print} /> : null;
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
