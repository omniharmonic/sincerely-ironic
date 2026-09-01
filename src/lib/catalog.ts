/**
 * The line. Local source of truth for handle, garment, print and both
 * readings of the description; it seeded Shopify and it is the fallback when
 * the Storefront token is absent. When Shopify answers, Shopify wins for
 * title, price, variants and images. Art always comes from here.
 *
 * The second reading is the first one, a notch more earnest. That is the
 * whole device. Do not explain a print.
 */

export type Garment = 'tee' | 'longsleeve' | 'hoodie' | 'crewneck' | 'cap' | 'sock' | 'tote';

export type Colourway = 'bone' | 'ink';

export interface Both {
  sincere: string;
  ironic: string;
}

export interface Print {
  place: 'front' | 'back' | 'sleeve' | 'left' | 'right';
  text: string;
  /** Relative size, 1 = the garment's default. */
  scale?: number;
  /** Display is Anybody, uppercase unless the text has lowercase. Text is Fraunces italic. */
  face?: 'display' | 'text';
}

export interface CatalogItem {
  handle: string;
  title: string;
  garment: Garment;
  colourway: Colourway;
  /** Shopify productType. */
  type: string;
  price: number;
  sizes: readonly string[];
  prints: readonly Print[];
  description: Both;
}

export const APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export const ONE_SIZE = ['One size'] as const;

export const VENDOR = 'Sincerely Ironic';

const TEE_FB = 'Heavyweight cotton, 6.5 oz. Boxy cut. Printed front and back.';
const HOODIE = '12 oz fleece, brushed inside. Double-lined hood, kangaroo pocket. Printed front and back.';
const CREW = '10 oz fleece. Raglan sleeve, ribbed hem and cuffs. Printed chest and back.';
const CAP = 'Six-panel unstructured cap. Embroidered. Brass buckle, one size.';
const TOTE = 'Heavy canvas. Long handles. Printed both sides.';

const both = (base: string, more: string): Both => ({ sincere: base, ironic: `${base} ${more}` });

export const catalog: readonly CatalogItem[] = [
  {
    handle: 'sincerely-ironic-tee',
    title: 'Sincerely Ironic Tee',
    garment: 'tee',
    colourway: 'bone',
    type: 'Tee',
    price: 38,
    sizes: APPAREL_SIZES,
    prints: [
      { place: 'front', text: 'SINCERELY', scale: 0.55 },
      { place: 'back', text: 'IRONIC', scale: 1.4 },
    ],
    description: both(TEE_FB, 'We hope you love it.'),
  },
  {
    handle: 'no-spectators-tee',
    title: 'There Are No Spectators',
    garment: 'tee',
    colourway: 'ink',
    type: 'Tee',
    price: 38,
    sizes: APPAREL_SIZES,
    prints: [
      { place: 'front', text: 'THERE ARE NO SPECTATORS', scale: 1 },
      { place: 'back', text: 'there were never meant to be', scale: 0.4, face: 'text' },
    ],
    description: both(TEE_FB, 'One of our favourites.'),
  },
  {
    handle: 'this-is-not-merch-tee',
    title: 'This Is Not Merch',
    garment: 'tee',
    colourway: 'bone',
    type: 'Tee',
    price: 38,
    sizes: APPAREL_SIZES,
    prints: [
      { place: 'front', text: 'THIS IS NOT MERCH.', scale: 1 },
      { place: 'back', text: '(it is merch)', scale: 0.45, face: 'text' },
    ],
    description: both(TEE_FB, 'A classic.'),
  },
  {
    handle: 'hollow-form-tee',
    title: 'Hollow Form',
    garment: 'tee',
    colourway: 'bone',
    type: 'Tee',
    price: 34,
    sizes: APPAREL_SIZES,
    prints: [],
    description: both('Heavyweight cotton, 6.5 oz. Boxy cut. No print, no neck label.', 'Sometimes that’s the one.'),
  },
  {
    handle: 'a-world-is-a-play-longsleeve',
    title: 'A World Is a Play',
    garment: 'longsleeve',
    colourway: 'ink',
    type: 'Longsleeve',
    price: 52,
    sizes: APPAREL_SIZES,
    prints: [
      { place: 'front', text: 'A WORLD IS A PLAY', scale: 0.55 },
      { place: 'sleeve', text: 'THAT ENOUGH PEOPLE KEPT PERFORMING', scale: 1 },
    ],
    description: both('7 oz cotton. Dropped shoulder, ribbed cuffs. Printed chest and left sleeve.', 'Runs a little long in the arm, which we like.'),
  },
  {
    handle: 'road-hoodie',
    title: 'If You Meet Us on the Road',
    garment: 'hoodie',
    colourway: 'ink',
    type: 'Hoodie',
    price: 92,
    sizes: APPAREL_SIZES,
    prints: [
      { place: 'front', text: 'IF YOU MEET US ON THE ROAD,', scale: 0.6 },
      { place: 'back', text: 'KILL US.', scale: 1.5 },
    ],
    description: both(HOODIE, 'Very warm.'),
  },
  {
    handle: 'fourth-wall-cap',
    title: 'The Fourth Wall Is Furniture',
    garment: 'cap',
    colourway: 'bone',
    type: 'Cap',
    price: 32,
    sizes: ONE_SIZE,
    prints: [{ place: 'front', text: 'THE FOURTH WALL IS FURNITURE', scale: 1 }],
    description: both(CAP, 'Fits most heads well.'),
  },
  {
    handle: 'noun-verb-socks',
    title: 'Noun / Verb',
    garment: 'sock',
    colourway: 'bone',
    type: 'Socks',
    price: 18,
    sizes: ONE_SIZE,
    prints: [
      { place: 'left', text: 'NOUN', scale: 1 },
      { place: 'right', text: 'VERB', scale: 1 },
    ],
    description: both('Combed cotton, ribbed, mid-calf. One says one, one says the other. One size.', 'They go together.'),
  },
  {
    handle: 'we-build-no-brand-tote',
    title: 'We Build No Brand',
    garment: 'tote',
    colourway: 'bone',
    type: 'Tote',
    price: 28,
    sizes: ONE_SIZE,
    prints: [
      { place: 'front', text: 'WE BUILD NO BRAND', scale: 1 },
      { place: 'back', text: 'SINCERELY IRONIC', scale: 0.45 },
    ],
    description: both(TOTE, 'Holds a lot.'),
  },
  {
    handle: 'one-organism-crewneck',
    title: 'One Organism',
    garment: 'crewneck',
    colourway: 'bone',
    type: 'Crewneck',
    price: 78,
    sizes: APPAREL_SIZES,
    prints: [
      { place: 'front', text: 'ONE ORGANISM', scale: 0.55 },
      { place: 'back', text: '1:40', scale: 1.6 },
    ],
    description: both(CREW, 'Cosy.'),
  },
] as const;

export const catalogByHandle: Record<string, CatalogItem> = Object.fromEntries(
  catalog.map((item) => [item.handle, item]),
);
