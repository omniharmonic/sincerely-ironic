/**
 * The line.
 *
 * A *design* is a slogan and the type treatments it ships in. A *product* is
 * that design on a garment, so one design can run across a tee, a hoodie and
 * a bucket hat without its copy being written three times.
 *
 * This file is the local source of truth for handles, art and both readings
 * of the description; it seeds Shopify and it is the fallback when the
 * Storefront token is absent. When Shopify answers, Shopify wins for title,
 * price, variants and images. Art always comes from here.
 *
 * The second reading is the first one, a notch more earnest. That is the
 * whole device. Do not explain a print.
 */

import { STYLE_KEYS, type StyleKey } from './typeset.ts';

export type Garment =
  | 'tee'
  | 'longsleeve'
  | 'hoodie'
  | 'crewneck'
  | 'sweatpants'
  | 'cap'
  | 'bucket'
  | 'tote'
  | 'blanket'
  | 'sock';

export type Colourway = 'bone' | 'ink';

export type Place = 'front' | 'back' | 'chest' | 'sleeve' | 'leg' | 'left' | 'right';

export interface Both {
  sincere: string;
  ironic: string;
}

export interface Print {
  place: Place;
  text: string;
  /** Overrides the product's style for this placement. Back asides run gothic. */
  style?: StyleKey;
  /** Fraction of the panel the block fills. 1 fills it. */
  fill?: number;
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
  /** Type treatments, in order. The first is the default. */
  styles: readonly StyleKey[];
  prints: readonly Print[];
  description: Both;
}

export const APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export const ONE_SIZE = ['One size'] as const;

export const VENDOR = 'Sincerely Ironic';

/* ---------------------------------------------------------------- garments */

interface GarmentSpec {
  type: string;
  price: number;
  sizes: readonly string[];
  /** Appended to a design slug to make the handle. */
  suffix: string;
  base: string;
  /** The earnest clause the second reading adds. */
  more: string;
  carriesBack: boolean;
}

const GARMENTS: Record<Garment, GarmentSpec> = {
  tee: {
    type: 'Tee',
    price: 38,
    sizes: APPAREL_SIZES,
    suffix: 'tee',
    base: 'Heavyweight cotton. Boxy cut.',
    more: 'We hope you love it.',
    carriesBack: true,
  },
  longsleeve: {
    type: 'Longsleeve',
    price: 52,
    sizes: APPAREL_SIZES,
    suffix: 'longsleeve',
    base: 'Heavyweight cotton. Dropped shoulder, ribbed cuffs.',
    more: 'Runs a little long in the arm, which we like.',
    carriesBack: true,
  },
  hoodie: {
    type: 'Hoodie',
    price: 88,
    sizes: APPAREL_SIZES,
    suffix: 'hoodie',
    base: 'Heavy fleece, brushed inside. Double-lined hood, kangaroo pocket.',
    more: 'Very warm.',
    carriesBack: true,
  },
  crewneck: {
    type: 'Crewneck',
    price: 72,
    sizes: APPAREL_SIZES,
    suffix: 'crewneck',
    base: 'Heavy fleece. Ribbed hem and cuffs.',
    more: 'Cosy.',
    carriesBack: true,
  },
  sweatpants: {
    type: 'Sweatpants',
    price: 68,
    sizes: APPAREL_SIZES,
    suffix: 'sweatpants',
    base: 'Heavy fleece. Elastic waist, drawcord, cuffed ankle. Printed on the leg.',
    more: 'Wear them with the crewneck.',
    carriesBack: false,
  },
  cap: {
    type: 'Cap',
    price: 32,
    sizes: ONE_SIZE,
    suffix: 'cap',
    base: 'Six-panel unstructured cap. Embroidered front. Brass buckle, one size.',
    more: 'Fits most heads well.',
    carriesBack: false,
  },
  bucket: {
    type: 'Bucket hat',
    price: 36,
    sizes: ONE_SIZE,
    suffix: 'bucket',
    base: 'Cotton twill bucket hat. Embroidered front, one size.',
    more: 'Good in the sun.',
    carriesBack: false,
  },
  tote: {
    type: 'Tote',
    price: 28,
    sizes: ONE_SIZE,
    suffix: 'tote',
    base: 'Heavy canvas. Long handles.',
    more: 'Holds a lot.',
    carriesBack: true,
  },
  blanket: {
    type: 'Blanket',
    price: 78,
    sizes: ONE_SIZE,
    suffix: 'blanket',
    base: 'Plush sherpa-backed blanket, 60 × 80in.',
    more: 'Extremely soft.',
    carriesBack: false,
  },
  sock: {
    type: 'Socks',
    price: 18,
    sizes: ONE_SIZE,
    suffix: 'socks',
    base: 'Combed cotton, ribbed, mid-calf. One size.',
    more: 'They go together.',
    carriesBack: false,
  },
};

/* ----------------------------------------------------------------- designs */

interface Design {
  slug: string;
  title: string;
  prints: readonly Print[];
  /** Type treatments this design ships in. The first is the default. */
  styles?: readonly StyleKey[];
}

const front = (text: string): Print[] => [{ place: 'front', text }];
const frontBack = (text: string, aside: string): Print[] => [
  { place: 'front', text },
  { place: 'back', text: aside, style: 'gothic', fill: 0.44 },
];

/** Every design ships in all three treatments unless it says otherwise. */
const ALL = STYLE_KEYS;
/** The deck was drawn in blackletter, so those designs lead with it. */
const GOTHIC_FIRST: StyleKey[] = ['gothic', 'wide', 'stack'];

const DESIGNS = {
  transwoke: { slug: 'transwoke', title: 'Transwoke', prints: front('Transwoke') },
  nondualer: { slug: 'nondualer-than-you', title: 'Nondualer Than You', prints: front('Nondualer than you') },
  wolves: {
    slug: 'two-wolves',
    title: 'Inside Me There Are Two Wolves',
    prints: frontBack('Inside me there are two wolves', 'one of them is gay'),
  },
  bypass: {
    slug: 'spiritually-bypass',
    title: 'I Use Non-Duality to Spiritually Bypass',
    prints: front('I use non-duality to spiritually bypass'),
  },
  lore: { slug: 'got-lore', title: 'Got Lore?', prints: front('Got lore?') },
  suffering: {
    slug: 'have-you-tried-suffering',
    title: 'Have You Tried Suffering?',
    prints: front('Have you tried suffering?'),
  },
  immanence: { slug: 'immanence-supremacist', title: 'Immanence Supremacist', prints: front('Immanence supremacist') },
  quietly: {
    slug: 'quietly-disrespectful',
    title: 'Quietly Disrespectful',
    prints: [{ place: 'chest', text: 'quietly disrespectful', style: 'gothic' }],
    styles: ['gothic', 'wide'] as StyleKey[],
  },
  nonattachment: {
    slug: 'nonattachment',
    title: 'Nonattachment Is for Wusses',
    prints: front('Nonattachment is for wusses'),
  },
  bdsm: { slug: 'bdsm', title: 'BDSM', prints: frontBack('BDSM', 'buddha · dharma · sangha · mahayana') },
  prophecy: {
    slug: 'living-prophecy',
    title: 'Are You Even a Living Prophecy, Bro?',
    prints: front('Are you even a living prophecy, bro?'),
  },
  paradox: {
    slug: 'embrace-paradox',
    title: 'Do You Embrace Paradox or Naw, Brah?',
    prints: front('Do you embrace paradox or naw, brah?'),
  },
  netzero: { slug: 'net-zero-trauma', title: 'Net Zero Trauma', prints: frontBack('Net zero trauma', 'ketamine mosquito nets') },
  bodhi: { slug: 'bodhisattvas-finish-last', title: 'Bodhisattvas Finish Last', prints: front('Bodhisattvas finish last') },
  stan: {
    slug: 'little-bit-enlightened',
    title: 'I’m Just Gonna Get a Little Bit Enlightened, Stan',
    prints: front('I’m just gonna get a little bit enlightened, Stan'),
  },
  transcended: {
    slug: 'transcended-and-included',
    title: 'I’ve Already Transcended and Included Your Worldview',
    prints: front('I’ve already transcended and included your worldview'),
  },
  transcontextual: { slug: 'transcontextual', title: 'Transcontextual', prints: front('Transcontextual') },
  vibemancer: { slug: 'vibemancer', title: 'Vibemancer', prints: frontBack('Vibemancer', 'turquoise') },
  anthro: { slug: 'anthroposophical-af', title: 'Anthroposophical AF', prints: front('Anthroposophical AF') },
  rizz: { slug: 'lore-rizz', title: 'Lore Rizz', prints: front('Lore rizz') },
  spaceholder: { slug: 'indentured-space-holder', title: 'Indentured Space Holder', prints: front('Indentured space holder') },

  /* ---- from the ideas deck, drawn in blackletter ---- */
  enm: { slug: 'ethical-non-monogamy', title: 'Ethical Non-Monogamy', prints: front('Ethical non-monogamy'), styles: GOTHIC_FIRST },
  buttmolly: { slug: 'butt-molly', title: 'Butt Molly', prints: front('Butt molly'), styles: GOTHIC_FIRST },
  narcissist: { slug: 'spiritual-narcissist', title: 'Spiritual Narcissist', prints: front('Spiritual narcissist'), styles: GOTHIC_FIRST },
  untriggerable: { slug: 'untriggerable', title: 'Untriggerable', prints: front('Untriggerable'), styles: GOTHIC_FIRST },
  securely: { slug: 'securely-non-attached', title: 'Securely Non-Attached', prints: front('Securely non-attached'), styles: GOTHIC_FIRST },
  influencer: { slug: 'spiritual-influencer', title: 'Spiritual Influencer', prints: front('Spiritual influencer'), styles: GOTHIC_FIRST },
  manifested: { slug: 'i-manifested-this', title: 'I Manifested This', prints: front('I manifested this'), styles: GOTHIC_FIRST },
  samadhi: { slug: 'binging-samadhi', title: 'Binging Samadhi', prints: front('Binging samadhi'), styles: GOTHIC_FIRST },
  autism: { slug: 'autism', title: 'Autism', prints: front('AUTISM.') },
  asshole: {
    slug: 'having-the-experience',
    title: 'I’m Having the Experience of You Being an Asshole',
    prints: [
      { place: 'front', text: 'I’m having the experience of you being an asshole' },
      { place: 'back', text: 'I have a story that you suck', style: 'gothic', fill: 0.62 },
    ],
  },
  raisedme: {
    slug: 'wilber-hanzi-gebser',
    title: 'Wilber, Hanzi and Gebser Raised Me',
    prints: front('Wilber, Hanzi and Gebser raised me'),
  },
  slave: {
    slug: 'made-in-china',
    title: 'This Was Made by a Slave in China',
    prints: front('This was made by a slave in China'),
    styles: GOTHIC_FIRST,
  },
} satisfies Record<string, Design>;

/* ---------------------------------------------------------------- products */

function make(design: Design, garment: Garment, colourway: Colourway): CatalogItem {
  const g = GARMENTS[garment];
  const kept = g.carriesBack ? design.prints : design.prints.filter((p) => p.place !== 'back');
  const printed = kept.length > 1 ? `${g.base} Printed front and back.` : `${g.base} Printed front.`;
  const embroideredOrPlain = garment === 'cap' || garment === 'bucket' || garment === 'sock' || garment === 'sweatpants';
  const base = embroideredOrPlain ? g.base : printed;

  // Sweatpants carry the slogan down the leg rather than across a chest.
  const prints: Print[] =
    garment === 'sweatpants'
      ? [{ place: 'leg', text: kept[0].text, style: kept[0].style }]
      : [...kept];

  return {
    handle: `${design.slug}-${g.suffix}`,
    title: design.title,
    garment,
    colourway,
    type: g.type,
    price: g.price,
    sizes: g.sizes,
    styles: design.styles ?? ALL,
    prints,
    description: { sincere: base, ironic: `${base} ${g.more}` },
  };
}

const D = DESIGNS;

export const catalog: readonly CatalogItem[] = [
  /* tees — the spine of the line */
  make(D.transwoke, 'tee', 'bone'),
  make(D.nondualer, 'tee', 'ink'),
  make(D.wolves, 'tee', 'bone'),
  make(D.bypass, 'tee', 'ink'),
  make(D.lore, 'tee', 'ink'),
  make(D.suffering, 'tee', 'bone'),
  make(D.immanence, 'tee', 'ink'),
  make(D.quietly, 'tee', 'bone'),
  make(D.nonattachment, 'tee', 'ink'),
  make(D.bdsm, 'tee', 'bone'),
  make(D.prophecy, 'tee', 'ink'),
  make(D.paradox, 'tee', 'bone'),
  make(D.netzero, 'tee', 'ink'),
  make(D.bodhi, 'tee', 'bone'),
  make(D.stan, 'tee', 'ink'),
  make(D.enm, 'tee', 'bone'),
  make(D.buttmolly, 'tee', 'ink'),
  make(D.narcissist, 'tee', 'bone'),
  make(D.untriggerable, 'tee', 'ink'),
  make(D.securely, 'tee', 'bone'),
  make(D.influencer, 'tee', 'ink'),
  make(D.manifested, 'tee', 'bone'),
  make(D.slave, 'tee', 'ink'),
  make(D.samadhi, 'tee', 'bone'),
  make(D.autism, 'tee', 'ink'),
  make(D.asshole, 'tee', 'bone'),
  make(D.raisedme, 'tee', 'ink'),

  /* longsleeves */
  make(D.transcended, 'longsleeve', 'bone'),
  make(D.untriggerable, 'longsleeve', 'ink'),
  make(D.manifested, 'longsleeve', 'bone'),

  /* hoodies */
  make(D.vibemancer, 'hoodie', 'ink'),
  make(D.anthro, 'hoodie', 'bone'),
  make(D.enm, 'hoodie', 'ink'),
  make(D.narcissist, 'hoodie', 'bone'),

  /* crewnecks, and the pants that match them */
  make(D.transcontextual, 'crewneck', 'ink'),
  make(D.influencer, 'crewneck', 'bone'),
  make(D.securely, 'sweatpants', 'ink'),
  make(D.influencer, 'sweatpants', 'bone'),

  /* headwear */
  make(D.rizz, 'cap', 'bone'),
  make(D.manifested, 'cap', 'ink'),
  make(D.untriggerable, 'bucket', 'bone'),
  make(D.buttmolly, 'bucket', 'ink'),

  /* the rest */
  make(D.spaceholder, 'tote', 'bone'),
  make(D.lore, 'tote', 'ink'),
  make(D.autism, 'blanket', 'bone'),
];

export const catalogByHandle: Record<string, CatalogItem> = Object.fromEntries(
  catalog.map((item) => [item.handle, item]),
);
