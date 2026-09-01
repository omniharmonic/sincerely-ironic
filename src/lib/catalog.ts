/**
 * The line. Local source of truth for handle, garment, print and both
 * readings of the description; it seeds Shopify and it is the fallback when
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
  place: 'front' | 'back' | 'chest' | 'sleeve' | 'left' | 'right';
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

const TEE = 'Heavyweight cotton, 6.5 oz. Boxy cut. Printed front.';
const TEE_FB = 'Heavyweight cotton, 6.5 oz. Boxy cut. Printed front and back.';
const LS = '7 oz cotton. Dropped shoulder, ribbed cuffs. Printed front.';
const HOODIE = '12 oz fleece, brushed inside. Double-lined hood, kangaroo pocket.';
const CREW = '10 oz fleece. Raglan sleeve, ribbed hem and cuffs. Printed front.';
const CAP = 'Six-panel unstructured cap. Embroidered. Brass buckle, one size.';
const TOTE = 'Heavy canvas. Long handles. Printed one side.';

const both = (base: string, more: string): Both => ({ sincere: base, ironic: `${base} ${more}` });

const tee = (
  handle: string,
  title: string,
  colourway: Colourway,
  prints: readonly Print[],
  more: string,
  base = prints.length > 1 ? TEE_FB : TEE,
): CatalogItem => ({
  handle,
  title,
  garment: 'tee',
  colourway,
  type: 'Tee',
  price: 38,
  sizes: APPAREL_SIZES,
  prints,
  description: both(base, more),
});

export const catalog: readonly CatalogItem[] = [
  tee('transwoke-tee', 'Transwoke', 'bone', [{ place: 'front', text: 'TRANSWOKE', scale: 1.1 }], 'We hope you love it.'),
  tee(
    'nondualer-than-you-tee',
    'Nondualer Than You',
    'ink',
    [{ place: 'front', text: 'NONDUALER THAN YOU', scale: 0.95 }],
    'One of our favourites.',
  ),
  tee(
    'two-wolves-tee',
    'Inside Me There Are Two Wolves',
    'bone',
    [
      { place: 'front', text: 'INSIDE ME THERE ARE TWO WOLVES.', scale: 0.8 },
      { place: 'back', text: 'one of them is gay.', scale: 0.48, face: 'text' },
    ],
    'A classic.',
  ),
  tee(
    'spiritually-bypass-tee',
    'I Use Non-Duality to Spiritually Bypass',
    'ink',
    [{ place: 'front', text: 'I USE NON-DUALITY TO SPIRITUALLY BYPASS', scale: 0.72 }],
    'Sits well.',
  ),
  tee(
    'got-lore-tee',
    'Got Lore?',
    'ink',
    [{ place: 'front', text: 'got lore?', scale: 1.15 }],
    'Goes with everything.',
  ),
  tee(
    'have-you-tried-suffering-tee',
    'Have You Tried Suffering?',
    'bone',
    [{ place: 'front', text: 'HAVE YOU TRIED SUFFERING?', scale: 0.85 }],
    'Holds up wash after wash.',
  ),
  tee(
    'immanence-supremacist-tee',
    'Immanence Supremacist',
    'ink',
    [{ place: 'front', text: 'IMMANENCE SUPREMACIST', scale: 0.9 }],
    'Wears well.',
  ),
  tee(
    'quietly-disrespectful-tee',
    'Quietly Disrespectful',
    'bone',
    [{ place: 'chest', text: 'quietly disrespectful', scale: 0.34, face: 'text' }],
    'Very soft.',
    'Heavyweight cotton, 6.5 oz. Boxy cut. Small print, left chest.',
  ),
  tee(
    'nonattachment-tee',
    'Nonattachment Is for Wusses',
    'ink',
    [{ place: 'front', text: 'NONATTACHMENT IS FOR WUSSES', scale: 0.85 }],
    'Keep it forever.',
  ),
  tee(
    'bdsm-tee',
    'BDSM',
    'bone',
    [
      { place: 'front', text: 'BDSM', scale: 1.9 },
      { place: 'back', text: 'Buddha · Dharma · Sangha · Mahayana', scale: 0.42, face: 'text' },
    ],
    'Good weight.',
  ),
  tee(
    'living-prophecy-tee',
    'Are You Even a Living Prophecy, Bro?',
    'ink',
    [{ place: 'front', text: 'ARE YOU EVEN A LIVING PROPHECY, BRO?', scale: 0.8 }],
    'People will ask.',
  ),
  tee(
    'embrace-paradox-tee',
    'Do You Embrace Paradox or Naw, Brah?',
    'bone',
    [{ place: 'front', text: 'DO YOU EMBRACE PARADOX OR NAW, BRAH?', scale: 0.8 }],
    'Both answers are fine.',
  ),
  tee(
    'net-zero-trauma-tee',
    'Net Zero Trauma',
    'ink',
    [
      { place: 'front', text: 'NET ZERO TRAUMA', scale: 1 },
      { place: 'back', text: 'ketamine mosquito nets', scale: 0.4, face: 'text' },
    ],
    'Breathable.',
  ),
  tee(
    'bodhisattvas-finish-last-tee',
    'Bodhisattvas Finish Last',
    'bone',
    [{ place: 'front', text: 'BODHISATTVAS FINISH LAST', scale: 0.85 }],
    'Worth the wait.',
  ),
  tee(
    'little-bit-enlightened-tee',
    'I’m Just Gonna Get a Little Bit Enlightened, Stan',
    'ink',
    [{ place: 'front', text: 'I’M JUST GONNA GET A LITTLE BIT ENLIGHTENED, STAN', scale: 0.7 }],
    'Just a little.',
  ),
  {
    handle: 'transcended-and-included-longsleeve',
    title: 'I’ve Already Transcended and Included Your Worldview',
    garment: 'longsleeve',
    colourway: 'bone',
    type: 'Longsleeve',
    price: 52,
    sizes: APPAREL_SIZES,
    prints: [{ place: 'front', text: 'I’VE ALREADY TRANSCENDED AND INCLUDED YOUR WORLDVIEW', scale: 0.72 }],
    description: both(LS, 'Runs a little long in the arm, which we like.'),
  },
  {
    handle: 'transcontextual-crewneck',
    title: 'Transcontextual',
    garment: 'crewneck',
    colourway: 'ink',
    type: 'Crewneck',
    price: 72,
    sizes: APPAREL_SIZES,
    prints: [{ place: 'front', text: 'TRANSCONTEXTUAL', scale: 0.78 }],
    description: both(CREW, 'Warm, but not too warm.'),
  },
  {
    handle: 'vibemancer-hoodie',
    title: 'Vibemancer',
    garment: 'hoodie',
    colourway: 'ink',
    type: 'Hoodie',
    price: 88,
    sizes: APPAREL_SIZES,
    prints: [
      { place: 'front', text: 'VIBEMANCER', scale: 0.95 },
      { place: 'back', text: 'turquoise', scale: 0.5, face: 'text' },
    ],
    description: both(`${HOODIE} Printed front and back.`, 'Very warm.'),
  },
  {
    handle: 'anthroposophical-af-hoodie',
    title: 'Anthroposophical AF',
    garment: 'hoodie',
    colourway: 'bone',
    type: 'Hoodie',
    price: 88,
    sizes: APPAREL_SIZES,
    prints: [{ place: 'front', text: 'ANTHROPOSOPHICAL AF', scale: 0.8 }],
    description: both(`${HOODIE} Printed front.`, 'Cosy.'),
  },
  {
    handle: 'lore-rizz-cap',
    title: 'Lore Rizz',
    garment: 'cap',
    colourway: 'bone',
    type: 'Cap',
    price: 32,
    sizes: ONE_SIZE,
    prints: [{ place: 'front', text: 'LORE RIZZ', scale: 1.3 }],
    description: both(CAP, 'Fits most heads well.'),
  },
  {
    handle: 'indentured-space-holder-tote',
    title: 'Indentured Space Holder',
    garment: 'tote',
    colourway: 'bone',
    type: 'Tote',
    price: 28,
    sizes: ONE_SIZE,
    prints: [{ place: 'front', text: 'INDENTURED SPACE HOLDER', scale: 0.85 }],
    description: both(TOTE, 'Holds a lot.'),
  },
] as const;

export const catalogByHandle: Record<string, CatalogItem> = Object.fromEntries(
  catalog.map((item) => [item.handle, item]),
);
