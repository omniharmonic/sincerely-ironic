/**
 * The type engine.
 *
 * One layout function, used by the garment art on the site and by the print
 * files that go to the printer, so what you see and what gets printed cannot
 * drift apart.
 *
 * A slogan is broken into lines and set to fill its panel. In the justified
 * styles every line is stretched to the same measure, which is why the blocks
 * read as one solid mass — the look the whole category is built on. Because
 * the measure is set explicitly with `textLength`, a line can never overrun
 * its panel: the old art guessed an average character width and clipped long
 * words off the sides.
 */

export type StyleKey = 'wide' | 'gothic' | 'stack';

export interface TypeStyle {
  key: StyleKey;
  /** Shown on the product page. */
  label: string;
  /** One line, in the product's own voice. */
  note: string;
  /** CSS font stack for the site. */
  family: string;
  /** Google Fonts family name, for the print renderer. */
  googleFamily: string;
  weight: number;
  case: 'upper' | 'lower' | 'none';
  /** Stretch every line to the full measure. */
  justify: boolean;
  lineHeight: number;
  /** Mean glyph advance as a fraction of the font size. Used only to choose
   *  line breaks; the measure itself is set exactly, so an error here changes
   *  where words wrap, never whether the type fits. */
  advance: number;
  /** Extra width the style wants, as a fraction of the panel. */
  fill: number;
  /** Cap height as a fraction of the font size. Sets the baseline, so lines
   *  sit tight without colliding — a fixed guess collided in the condensed
   *  face, whose caps are much taller than its nominal size suggests. */
  cap: number;
  variation?: string;
  letterSpacing?: number;
  /** Slack above the first cap and below the last baseline, in em, for a
   *  line with nothing below the baseline. A block used to be centred in a
   *  big canvas, so overshoot cost nothing; now the canvas is cut tight, and
   *  anything the metrics under-report gets sheared off. */
  pad: { top: number; bottom: number };
  /** Bottom slack when the last line does carry a descender. Uppercase faces
   *  still need this: a comma descends, and "…OR NAW, BRAH?" lost its comma
   *  to the bottom edge of the file. */
  descender: number;
}

export const STYLES: Record<StyleKey, TypeStyle> = {
  wide: {
    key: 'wide',
    label: 'Wide',
    note: 'Set wide and justified.',
    family: "var(--font-anybody), 'Arial Narrow', Impact, sans-serif",
    googleFamily: 'Anybody:wdth,wght@75..125,800',
    weight: 800,
    case: 'upper',
    justify: true,
    lineHeight: 0.92,
    advance: 0.66,
    fill: 0.94,
    cap: 0.74,
    variation: "'wdth' 112",
    letterSpacing: -0.02,
    pad: { top: 0.03, bottom: 0.06 },
    descender: 0.22,
  },
  gothic: {
    key: 'gothic',
    label: 'Gothic',
    note: 'Set in blackletter, lower case.',
    family: "var(--font-pirata), 'UnifrakturMaguntia', serif",
    googleFamily: 'Pirata+One',
    weight: 400,
    case: 'lower',
    justify: false,
    lineHeight: 1.06,
    advance: 0.46,
    fill: 0.88,
    cap: 0.72,
    // Lower-case blackletter: real ascenders, deep descenders, and a floor
    // well above zero because the face puts decorative strokes below the
    // baseline on letters no descender list would name.
    pad: { top: 0.1, bottom: 0.18 },
    descender: 0.34,
  },
  stack: {
    key: 'stack',
    label: 'Stack',
    note: 'Condensed, stacked tight.',
    family: "var(--font-anton), 'Arial Narrow', sans-serif",
    googleFamily: 'Anton',
    weight: 400,
    case: 'upper',
    justify: true,
    lineHeight: 0.96,
    advance: 0.42,
    fill: 0.96,
    cap: 0.73,
    pad: { top: 0.03, bottom: 0.06 },
    descender: 0.22,
  },
};

export const STYLE_KEYS = Object.keys(STYLES) as StyleKey[];

export interface Line {
  text: string;
  /** Baseline y, in panel units, measured from the top of the block. */
  y: number;
  /** Exact measure for this line, or undefined to set it naturally. */
  measure?: number;
}

export interface Layout {
  lines: Line[];
  fontSize: number;
  /** Height of the whole block, in panel units. */
  height: number;
  style: TypeStyle;
}

const casing = (text: string, style: TypeStyle) =>
  style.case === 'upper' ? text.toUpperCase() : style.case === 'lower' ? text.toLowerCase() : text;

/** Width of a string in em, by the style's mean advance. */
const emWidth = (text: string, style: TypeStyle) => text.length * style.advance;

/**
 * Break `words` into exactly `count` lines with the lines as even as
 * possible.
 *
 * Evenness is the whole point: a justified block is only a solid rectangle if
 * every line carries a similar amount of type. Greedy filling gave blocks like
 * INSIDE / ME / THERE / ARE TWO / WOLVES, where a two-letter line got stretched
 * across the full measure. This minimises the squared deviation from an even
 * share, exactly, which for a slogan of a dozen words is nothing to compute.
 */
function breakInto(words: string[], count: number, style: TypeStyle): string[] | null {
  const n = words.length;
  if (count > n) return null;
  if (count === 1) return [words.join(' ')];

  // width[i][j] = width in em of words i..j-1 set as one line
  const width: number[][] = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j <= n; j += 1) {
      width[i][j] = emWidth(words.slice(i, j).join(' '), style);
    }
  }
  const target = width[0][n] / count;

  // best[k][i] = least cost of setting words i.. in k lines
  const INF = Number.POSITIVE_INFINITY;
  const best: number[][] = Array.from({ length: count + 1 }, () => new Array(n + 1).fill(INF));
  const cut: number[][] = Array.from({ length: count + 1 }, () => new Array(n + 1).fill(-1));
  best[0][n] = 0;

  for (let k = 1; k <= count; k += 1) {
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = i + 1; j <= n; j += 1) {
        const rest = best[k - 1][j];
        if (rest === INF) continue;
        const slack = target - width[i][j];
        const cost = rest + slack * slack;
        if (cost < best[k][i]) {
          best[k][i] = cost;
          cut[k][i] = j;
        }
      }
    }
  }
  if (best[count][0] === INF) return null;

  const lines: string[] = [];
  let i = 0;
  for (let k = count; k > 0; k -= 1) {
    const j = cut[k][i];
    lines.push(words.slice(i, j).join(' '));
    i = j;
  }
  return lines;
}

/**
 * Set `text` into a panel `w` × `h`, choosing the line count that lets the
 * type run largest. `fill` trims the result — a small chest print asks for a
 * fraction of the panel rather than all of it.
 */
export function typeset(
  text: string,
  styleKey: StyleKey,
  w: number,
  h: number,
  fill = 1,
): Layout {
  const style = STYLES[styleKey];
  const cased = casing(text.trim(), style);
  const words = cased.split(/\s+/).filter(Boolean);

  const measure = w * style.fill;
  const maxLines = Math.min(words.length, 5);

  let best: { lines: string[]; size: number; score: number } | null = null;
  for (let count = 1; count <= maxLines; count += 1) {
    const lines = breakInto(words, count, style);
    if (!lines) continue;
    const widths = lines.map((l) => emWidth(l, style));
    const widest = Math.max(...widths);
    const narrowest = Math.min(...widths);
    // The type can grow until either the widest line fills the measure or the
    // stack fills the panel height.
    const size = Math.min(measure / widest, h / ((count - 1) * style.lineHeight + style.cap));
    // A block that sets larger but rags badly is the wrong trade: a line
    // stretched from two letters to the full measure looks like a mistake.
    // Weight the size by how even the lines are.
    const balance = narrowest / widest;
    const score = size * (0.45 + 0.55 * balance);
    if (!best || score > best.score) best = { lines, size, score };
  }

  const chosen = best ?? { lines: [cased], size: Math.min(measure / emWidth(cased, style), h) };
  const fontSize = chosen.size * fill;
  const step = fontSize * style.lineHeight;
  // The block runs from the first line's cap top to the last line's baseline,
  // so centring it centres what you actually see rather than the leading.
  const height = step * (chosen.lines.length - 1) + fontSize * style.cap;

  return {
    style,
    fontSize,
    height,
    lines: chosen.lines.map((line, i) => ({
      text: line,
      y: step * i + fontSize * style.cap,
      measure: style.justify ? measure * fill : undefined,
    })),
  };
}

/* ------------------------------------------------------------------ panels */

export interface PanelSplit {
  /** Square box for the emblem, in panel units. */
  emblem?: { x: number; y: number; size: number };
  /** Box the type is set into. */
  text?: { x: number; y: number; w: number; h: number };
}

/**
 * Divide a print panel between an emblem and its wordmark. Both renderers
 * call this, so a patch sits the same on the drawn garment and on the file
 * that goes to the printer.
 */
export function splitPanel(hasEmblem: boolean, hasText: boolean, w: number, h: number): PanelSplit {
  if (hasEmblem && hasText) {
    // The badge takes the upper field, the words sit under it.
    const band = h * 0.6;
    const size = Math.min(w * 0.62, band * 0.94);
    return {
      emblem: { x: (w - size) / 2, y: (band - size) / 2, size },
      text: { x: 0, y: band, w, h: h - band },
    };
  }
  if (hasEmblem) {
    const size = Math.min(w, h) * 0.92;
    return { emblem: { x: (w - size) / 2, y: (h - size) / 2, size } };
  }
  return { text: { x: 0, y: 0, w, h } };
}

/* --------------------------------------------------------------- placement */

/**
 * Where a print sits inside its print area, in fractions of that area.
 *
 * This is the number that was missing. Before, every file was rendered at the
 * full size of the print area and handed to the vendor as "centre it, scale
 * to fit" — so a slogan landed wherever the centre of a 17-inch panel happens
 * to fall on a body, which is the navel. Naming the box makes the placement a
 * decision instead of a side effect, and both renderers read the same one.
 */
export interface PrintBox {
  /** Block width, as a fraction of the area's width. */
  w: number;
  /** Greatest block height, as a fraction of the area's height.
   *  Load-bearing. Without it the engine always prefers more lines — more
   *  lines mean a shorter longest line, which lets the type set bigger and
   *  score higher — so a slogan builds a tall tower down the belly instead of
   *  a block across the chest. Capping the height is what chooses three even
   *  lines over four ragged ones. */
  h: number;
  /** Block top, as a fraction of the area's height. */
  top: number;
  /** Centre of the block across the area. */
  x: number;
  /** Space between an emblem and the wordmark under it, as a share of the
   *  box width. */
  gap?: number;
  /** Centre the artwork in the panel and ignore `top`. This is what a print
   *  did before boxes existed — fill the panel, centre it — and it is still
   *  right for a small fixed panel like a cap front, where the artwork has
   *  nowhere to move to. */
  center?: boolean;
  /** An emblem's share of the box width, when one sits above a wordmark.
   *  A cap panel is nearly three times wider than it is tall, so a lockup
   *  built for a chest fills it top to bottom and then cannot be moved at
   *  all; shrinking the emblem is what buys the headroom. */
  emblem?: number;
}

/** A quieter second line, set under the main block in its own treatment. */
export interface Aside {
  text: string;
  style?: StyleKey;
  /** Size relative to the main block's type. */
  scale?: number;
}

export interface Block {
  main: Layout;
  aside?: Layout;
  /** Baseline offset of the main block from the top of the canvas. */
  mainTop: number;
  /** Baseline offset of the aside block from the top of the canvas. */
  asideTop: number;
  /** The canvas, cut tight to the ink, in the units `width` was given in. */
  width: number;
  height: number;
}

/** Glyphs that drop below the baseline, in any of the three faces. */
const BELOW_BASELINE = /[,;gjpqy()[\]{}@_âˆ«]/;

/** How much room the last line of a block needs beneath its baseline. */
const dropOf = (line: string, style: TypeStyle) =>
  BELOW_BASELINE.test(line) ? style.descender : style.pad.bottom;

/** Space between a block and its aside, as a fraction of the main type size. */
const ASIDE_GAP = 0.62;
/** How much smaller an aside sets than the block it hangs under. */
const ASIDE_SCALE = 0.34;

/**
 * Lay a print out as one tight block: a slogan, optionally with a quieter
 * line beneath it.
 *
 * The canvas comes back cut to the ink plus each face's own padding, so the
 * file a vendor receives has no dead margin to guess about — its size *is*
 * the artwork's size, and the placement maths downstream is exact.
 */
export function layoutBlock(
  text: string,
  styleKey: StyleKey,
  width: number,
  height: number,
  fill = 1,
  aside?: Aside,
): Block {
  const main = typeset(text, styleKey, width, height, fill);
  const style = main.style;

  const mainTop = main.fontSize * style.pad.top;
  let total = mainTop + main.height;
  let asideTop = 0;
  let asideLayout: Layout | undefined;

  if (aside) {
    const as = STYLES[aside.style ?? 'gothic'];
    const cased = casing(aside.text.trim(), as);
    // Set as one line, deliberately. Run through `typeset` it would discover
    // that breaking in two lets the type set larger and score better — which
    // is right for a slogan and wrong for an aside, whose whole job is to be
    // quieter than the thing above it.
    let size = main.fontSize * (aside.scale ?? ASIDE_SCALE);
    const natural = emWidth(cased, as) * size;
    if (natural > width) size *= width / natural;

    asideLayout = {
      style: as,
      fontSize: size,
      height: size * as.cap,
      lines: [{ text: cased, y: size * as.cap }],
    };
    asideTop = total + main.fontSize * ASIDE_GAP + size * as.pad.top;
    total = asideTop + asideLayout.height + size * dropOf(cased, as);
  } else {
    total += main.fontSize * dropOf(main.lines[main.lines.length - 1].text, style);
  }

  return { main, aside: asideLayout, mainTop, asideTop, width, height: total };
}

/**
 * The default box for a placement.
 *
 * Front prints hang from a constant drop rather than centring, because that
 * is how a garment graphic actually works: the top of the artwork sits a
 * fixed distance below the collar and a longer slogan grows downward. The
 * width steps with the length of the line, so a single word reads as a mark
 * and a four-line block still reads as a block — the wide ones are allowed to
 * be bigger, but they start from the same place.
 */
export function defaultBox(place: string, text?: string): PrintBox {
  if (place === 'chest') return { w: 0.28, h: 0.1, top: 0.185, x: 0.31 };
  if (place === 'leg') return { w: 0.62, h: 0.22, top: 0.16, x: 0.5 };
  if (place === 'sleeve') return { w: 0.85, h: 0.5, top: 0.2, x: 0.5 };
  if (place === 'left' || place === 'right') return { w: 0.9, h: 0.7, top: 0.1, x: 0.5 };

  // Longer slogans earn a wider box and a taller one, but they all hang from
  // the same drop, so the tops line up across the whole rail.
  const n = (text ?? '').trim().length;
  const [w, h] =
    n <= 10 ? [0.46, 0.14] : n <= 20 ? [0.56, 0.2] : n <= 34 ? [0.66, 0.3] : [0.76, 0.36];
  return { w, h, top: place === 'back' ? 0.1 : 0.12, x: 0.5 };
}

/**
 * A print, described without reference to the catalogue, so the engine stays
 * below it in the import graph.
 */
export interface PrintSpec {
  place: string;
  text?: string;
  style: StyleKey;
  fill?: number;
  box?: Partial<PrintBox>;
  aside?: Aside;
  /** Width ÷ height of the emblem, if there is one. */
  emblemAspect?: number;
}

export interface Placed {
  box: PrintBox;
  /** The file, cut tight, in the units the print area was given in. */
  width: number;
  height: number;
  emblem?: { x: number; y: number; w: number; h: number };
  block?: Block;
  /** Where the type block starts inside the canvas. */
  blockTop: number;
  /** What the vendor needs: fractions of the print area. */
  vendor: { x: number; y: number; scale: number };
}

/** An emblem's share of the canvas width when it sits above a wordmark. */
const EMBLEM_SHARE = 0.62;

/**
 * Resolve a print into a tight canvas and a position on the garment.
 *
 * Everything downstream — the drawn art, the PNG that goes to the printer,
 * and the x/y/scale handed to the vendor — is derived from this one call, so
 * a change of mind about placement moves all three together or none of them.
 */
export function resolvePrint(spec: PrintSpec, areaW: number, areaH: number): Placed {
  const box: PrintBox = { ...defaultBox(spec.place, spec.text), ...spec.box };
  const width = areaW * box.w;

  let emblem: Placed['emblem'];
  let block: Block | undefined;
  let blockTop = 0;
  let height = 0;

  const aspect = spec.emblemAspect;
  if (aspect) {
    const w = spec.text ? width * (box.emblem ?? EMBLEM_SHARE) : width;
    const h = w / aspect;
    emblem = { x: (width - w) / 2, y: 0, w, h };
    height = h;
    if (spec.text) blockTop = h + width * (box.gap ?? 0.06);
  }

  if (spec.text) {
    block = layoutBlock(spec.text, spec.style, width, areaH * box.h, spec.fill ?? 1, spec.aside);
    height = blockTop + block.height;
  }

  // The vendor scales the file to a fraction of the panel's WIDTH and then
  // centres it, so the height that matters is the scaled one. Deriving `y`
  // from the unscaled canvas put anything the vendor had to shrink — the cap
  // lockup — clean off the panel.
  const ratio = height / width;
  let scale = box.w;
  const room = areaH * (1 - box.top);
  if (scale * areaW * ratio > room) scale = room / (areaW * ratio);
  const drawnH = scale * areaW * ratio;

  return {
    box,
    width,
    height,
    emblem,
    block,
    blockTop,
    vendor: {
      x: box.x,
      y: box.center ? 0.5 : (box.top * areaH + drawnH / 2) / areaH,
      scale,
    },
  };
}
