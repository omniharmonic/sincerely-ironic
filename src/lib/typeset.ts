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
