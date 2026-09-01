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

import type { EmblemKey } from './emblems.ts';
import type { Aside, PrintBox, StyleKey } from './typeset.ts';

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
  | 'robe'
  | 'sign'
  | 'fannypack'
  | 'sock';

export type Colourway = 'bone' | 'ink';

export type Place = 'front' | 'back' | 'chest' | 'sleeve' | 'leg' | 'left' | 'right';

export interface Both {
  sincere: string;
  ironic: string;
}

export interface Print {
  place: Place;
  /** Omit for an emblem on its own. */
  text?: string;
  /** Drawn above the text, or alone. */
  emblem?: EmblemKey;
  /** Overrides the product's style for this placement. Back asides run gothic. */
  style?: StyleKey;
  /** Fraction of the panel the block fills. 1 fills it. */
  fill?: number;
  /** Overrides the placement's default box. See `defaultBox` in typeset.ts. */
  box?: Partial<PrintBox>;
  /** A quieter line set under the block, in the same file and placement. */
  aside?: Aside;
  /** A ready-made brand asset from `public/brand`, used instead of type.
   *  `{tone}` is filled with `black` or `white` to suit the garment. */
  asset?: string;
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
  /** Overrides the blank's default [natural, black] colour pair. */
  colours?: readonly [string, string];
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
  /** Default boxes for this blank's panels. A cap front is 4 x 2.25in and a
   *  tee front is 15 x 17in, so the fractions that read well on one are wrong
   *  on the other. A print's own `box` still wins. */
  boxes?: Partial<Record<Place, Partial<PrintBox>>>;
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
    // Above the pocket, which otherwise swallows the bottom of a block.
    boxes: { front: { top: 0.1, h: 0.26 } },
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
    // Hats were not part of the placement redesign, so this is what it always
    // was: fill the 4 x 2.25in panel, centred. The one cap that does move is
    // re-boxed explicitly where it is made.
    boxes: { front: { w: 1, h: 1, top: 0, x: 0.5, center: true } },
  },
  bucket: {
    type: 'Bucket hat',
    price: 36,
    sizes: ONE_SIZE,
    suffix: 'bucket',
    base: 'Cotton twill bucket hat. Embroidered front, one size.',
    more: 'Good in the sun.',
    carriesBack: false,
    // Unchanged as well: fill the panel, centre it.
    boxes: { front: { w: 1, h: 1, top: 0, x: 0.5, center: true } },
  },
  tote: {
    type: 'Tote',
    price: 28,
    sizes: ONE_SIZE,
    suffix: 'tote',
    base: 'Heavy canvas. Long handles.',
    more: 'Holds a lot.',
    carriesBack: true,
    boxes: { front: { w: 0.72, h: 0.34, top: 0.2, x: 0.5 }, back: { w: 0.72, h: 0.34, top: 0.2, x: 0.5 } },
  },
  blanket: {
    type: 'Blanket',
    price: 78,
    sizes: ONE_SIZE,
    suffix: 'blanket',
    base: 'Plush sherpa-backed blanket, 60 × 80in.',
    more: 'Extremely soft.',
    carriesBack: false,
    boxes: { front: { w: 0.56, h: 0.26, top: 0.16, x: 0.5 } },
  },
  robe: {
    type: 'Robe',
    price: 59,
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    suffix: 'robe',
    base: 'Mid-length robe. Bell sleeves, belted. Light polyester, all-over print.',
    more: 'For after.',
    carriesBack: false,
  },
  sign: {
    type: 'Yard sign',
    price: 43,
    sizes: ONE_SIZE,
    suffix: 'sign',
    base: 'Corrugated plastic yard sign, 18 × 24in. Printed one side. Stake included.',
    more: 'Put it on the lawn.',
    carriesBack: false,
  },
  fannypack: {
    type: 'Fanny pack',
    price: 40,
    sizes: ONE_SIZE,
    suffix: 'fannypack',
    base: 'Fanny pack. Adjustable strap, zip closure.',
    more: 'Holds the essentials.',
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
// A patch is a patch: it reads as an insignia because it is small and high,
// not because it is large. Left to the default box the badge ran eight inches
// tall and finished at the navel.
const badge = (text: string, emblem: EmblemKey): Print[] => [
  { place: 'front', emblem, text, box: { w: 0.38, h: 0.14, top: 0.1 } },
];
const frontBack = (text: string, aside: string): Print[] => [
  { place: 'front', text },
  { place: 'back', text: aside, style: 'gothic', fill: 0.44 },
];

/**
 * One treatment per design — the one that actually ships.
 *
 * `styles` used to list two or three, and the product page offered them as
 * chips. They were a lie: the chips redrew the local SVG, the cart carries a
 * size variant and nothing else, and Printify only ever built `styles[0]`.
 * Pick "Gothic" and a "Wide" shirt arrived. Printify cannot carry a treatment
 * as a variant either — a blueprint fixes its options at colour and size — so
 * a second treatment has to be a second product. Adding one is one entry here
 * and one `make(...)` line; until then the site must not offer a choice it
 * cannot honour.
 */
const ALL: StyleKey[] = ['wide'];
/** The deck was drawn in blackletter, so those designs ship in it. */
const GOTHIC_FIRST: StyleKey[] = ['gothic'];

const DESIGNS = {
  transwoke: { slug: 'transwoke', title: 'Transwoke', prints: front('Transwoke') },
  nondualer: { slug: 'nondualer-than-you', title: 'Nondualer Than You', prints: front('Nondualer than you') },
  wolves: {
    slug: 'two-wolves',
    title: 'Inside Me There Are Two Wolves',
    // The punchline used to be on the back, where nobody stood long enough to
    // read it. As an aside under the block it lands in one look.
    prints: [{ place: 'front', text: 'Inside me there are two wolves', aside: { text: 'one of them is gay' } }],
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
    styles: ['gothic'] as StyleKey[],
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
  bodhi: { slug: 'bodhisattvas-finish-last', title: 'Bodhisattvas Finish Last', prints: front('Bodhisattvas finish last') },
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
  autism: { slug: 'autism', title: 'Autism', prints: front('AUTISM.') },
  asshole: {
    slug: 'having-the-experience',
    title: 'I’m Having the Experience of You Being an Asshole',
    prints: [
      { place: 'front', text: 'I’m having the experience of you being an asshole' },
      { place: 'back', text: 'I have a story that you suck', style: 'gothic', fill: 0.62 },
    ],
  },
  rizztism: {
    slug: 'rizz-em-with-the-tism',
    title: 'Rizz ’em With the ’tism',
    prints: front('Rizz ’em with the ’tism'),
  },
  ketamine: {
    slug: 'trauma-informed-ketamine-shaman',
    title: 'Trauma-Informed Ketamine Shaman',
    // Whispered on the chest, said out loud on the back.
    prints: [
      { place: 'chest', text: 'Trauma-informed ketamine shaman', style: 'gothic' },
      { place: 'back', text: 'Trauma-informed ketamine shaman' },
    ],
  },
  veteran: {
    slug: 'culture-war-veteran',
    title: 'Culture War Veteran',
    prints: badge('Culture war veteran', 'veteran'),
  },
  // No insignia on this one: the patch is the Culture War Veteran's joke, and
  // repeating it here made the two shirts read as one product.
  tier2: { slug: 'im-tier-2', title: 'I’m Tier 2', prints: front('I’m tier 2') },
  escaped: {
    slug: 'escaped-samsara',
    title: 'I Already Escaped Samsara but I Had to Come Back to Save Ur Ass',
    prints: front('I already escaped samsara but I had to come back to save ur ass'),
  },
  sorry: {
    slug: 'samsara-is-never',
    title: 'Samsara Is Never Having to Say You’re Sorry',
    prints: front('Samsara is never having to say you’re sorry'),
  },
  // Handle stays `your-memeplex`; only the words on the garment changed.
  memeplex: {
    slug: 'your-memeplex',
    title: 'I Deconstructed Your Memeplex',
    prints: front('I deconstructed your memeplex'),
    styles: GOTHIC_FIRST,
  },
  joincults: { slug: 'join-cults', title: 'Join Cults!', prints: front('Join cults!'), styles: GOTHIC_FIRST },
  mamo: {
    slug: 'my-other-shaman',
    title: 'My Other Shaman Is a Mamo',
    prints: front('My other shaman is a mamo'),
  },
  raisedme: {
    slug: 'wilber-hanzi-gebser',
    title: 'Wilber, Hanzi and Gebser Raised Me',
    prints: front('Wilber, Hanzi and Gebser raised me'),
  },
  /* ---- the house lockup ---- */
  // The lockup runs across, not down: the row is the house layout, and on a
  // chest it reads as a label rather than a badge.
  mark: {
    slug: 'sincerely-ironic',
    title: 'Sincerely Ironic',
    prints: [{ place: 'front', asset: 'lockup-row-{tone}', box: { w: 0.38, top: 0.14 } }],
  },
  markRainbow: {
    slug: 'sincerely-ironic-rainbow',
    title: 'Sincerely Ironic, In Colour',
    // Mark and name both on the slick, so one file serves both garments.
    prints: [{ place: 'front', asset: 'lockup-row-rainbow', box: { w: 0.38, top: 0.14 } }],
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
  // The garment wins. A design's box is written for a chest-sized panel, and
  // a cap front is 4 x 2.25in — letting the design's fractions through put a
  // patch sized for a shirt onto the front of a hat. Where a garment states
  // only part of a box (the hoodie moves the top, to clear the pocket) the
  // rest of the design's box still stands.
  const withBox = (p: Print): Print => {
    const d = g.boxes?.[p.place];
    return d ? { ...p, box: { ...p.box, ...d } } : p;
  };

  const prints: Print[] = (
    garment === 'sweatpants'
      ? [{ place: 'leg' as Place, text: kept[0].text, emblem: kept[0].emblem, style: kept[0].style }]
      : [...kept]
  ).map(withBox);

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

/**
 * Made in Printify rather than here, so their Shopify handles came from their
 * titles and do not follow `<slug>-<garment>`.
 *
 * The catalogue matched theirs on the belief that a Shopify handle is fixed
 * at creation. It is not: `ProductInput.handle` is settable on
 * `productUpdate`, and `redirectNewHandle` will even leave a redirect behind.
 * That matters well beyond these three — it is what lets Printify create
 * every listing (the only way an order reaches fulfilment) while we still
 * choose the URLs. These handles are left alone only because the store they
 * live on is being replaced; on the new one they take proper slugs.
 */
export const printifyMade: readonly CatalogItem[] = [
  {
    handle: 'yard-sign',
    title: 'In This House',
    garment: 'sign',
    colourway: 'ink',
    type: 'Yard sign',
    price: 43,
    sizes: ONE_SIZE,
    styles: ['wide'],
    prints: [{ place: 'front', text: 'In this house' }],
    description: {
      sincere: 'Corrugated plastic yard sign, 18 × 24in. Printed one side. Stake included.',
      ironic: 'Corrugated plastic yard sign, 18 × 24in. Printed one side. Stake included. Put it on the lawn.',
    },
  },
  {
    handle: 'robe',
    title: 'Robe',
    garment: 'robe',
    colourway: 'bone',
    type: 'Robe',
    price: 59,
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    styles: ['slab'],
    // Rebuilt from the design made in Printify's editor, which reported its
    // own text, face and geometry: two centred lines on the back panel, at
    // 0.5264 of its width with the block's middle at y 0.2641.
    prints: [{ place: 'front', text: 'Sex Party', style: 'slab', box: { w: 0.5427, h: 0.22, top: 0.182, x: 0.5 } }],
    description: {
      sincere: 'Mid-length robe. Bell sleeves, belted. Light polyester, all-over print.',
      ironic: 'Mid-length robe. Bell sleeves, belted. Light polyester, all-over print. For after.',
    },
  },
  {
    handle: 'fanny-pack',
    title: 'Fanny Pack',
    garment: 'fannypack',
    // Black type on the bag, as drawn.
    colourway: 'bone',
    type: 'Fanny pack',
    price: 40,
    sizes: ONE_SIZE,
    styles: ['slab'],
    // Likewise: one centred line at 0.4346 of the panel width.
    prints: [{ place: 'front', text: 'DRUGS', style: 'slab', box: { w: 0.4481, h: 0.62, x: 0.5, center: true } }],
    description: {
      sincere: 'Fanny pack. Adjustable strap, zip closure.',
      ironic: 'Fanny pack. Adjustable strap, zip closure. Holds the essentials.',
    },
  },
];

const D = DESIGNS;

/**
 * Override a product's box after `make` has applied the garment's default.
 *
 * The garment normally wins, because it knows its own panel. This is the
 * escape hatch for the one case where a particular product wants something
 * else — used here so the Culture War Veteran cap can sit higher without
 * moving every other hat with it.
 */
function rebox(item: CatalogItem, place: Place, box: Partial<PrintBox>): CatalogItem {
  return {
    ...item,
    prints: item.prints.map((p) => (p.place === place ? { ...p, box: { ...p.box, ...box } } : p)),
  };
}

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
  make(D.bodhi, 'tee', 'bone'),
  make(D.enm, 'tee', 'bone'),
  make(D.buttmolly, 'tee', 'ink'),
  make(D.narcissist, 'tee', 'bone'),
  make(D.untriggerable, 'tee', 'ink'),
  make(D.securely, 'tee', 'bone'),
  make(D.influencer, 'tee', 'ink'),
  make(D.manifested, 'tee', 'bone'),
  make(D.slave, 'tee', 'ink'),
  make(D.autism, 'tee', 'ink'),
  make(D.asshole, 'tee', 'bone'),
  make(D.raisedme, 'tee', 'ink'),
  make(D.rizztism, 'tee', 'bone'),
  make(D.ketamine, 'tee', 'ink'),
  make(D.veteran, 'tee', 'bone'),
  make(D.tier2, 'tee', 'ink'),
  make(D.escaped, 'tee', 'bone'),
  make(D.sorry, 'tee', 'ink'),
  make(D.memeplex, 'tee', 'bone'),
  make(D.joincults, 'tee', 'ink'),
  make(D.mamo, 'tee', 'bone'),

  /* longsleeves */
  make(D.transcended, 'longsleeve', 'bone'),
  make(D.untriggerable, 'longsleeve', 'ink'),
  make(D.manifested, 'longsleeve', 'bone'),

  /* hoodies */
  make(D.vibemancer, 'hoodie', 'ink'),
  make(D.anthro, 'hoodie', 'bone'),
  make(D.enm, 'hoodie', 'ink'),
  make(D.narcissist, 'hoodie', 'bone'),
  make(D.veteran, 'hoodie', 'ink'),

  /* crewnecks, and the pants that match them */
  // The house sweatshirt, on white and black rather than the line's ivory:
  // a logo piece should sit on a plain ground.
  { ...make(D.mark, 'crewneck', 'bone'), colours: ['White', 'Black'] as const },
  { ...make(D.markRainbow, 'crewneck', 'bone'), colours: ['White', 'Black'] as const },
  make(D.transcontextual, 'crewneck', 'ink'),
  make(D.influencer, 'crewneck', 'bone'),
  make(D.securely, 'sweatpants', 'ink'),
  make(D.influencer, 'sweatpants', 'bone'),

  /* headwear */
  make(D.rizz, 'cap', 'bone'),
  make(D.manifested, 'cap', 'ink'),
  make(D.untriggerable, 'bucket', 'bone'),
  make(D.buttmolly, 'bucket', 'ink'),
  // Lifted off the brim seam and given headroom on the crown. This is the
  // only hat whose placement changed.
  rebox(make(D.veteran, 'cap', 'ink'), 'front', {
    w: 0.86,
    h: 0.4,
    top: 0.02,
    emblem: 0.3,
    center: false,
  }),
  make(D.rizztism, 'cap', 'ink'),
  make(D.joincults, 'bucket', 'bone'),

  /* the rest */
  make(D.spaceholder, 'tote', 'bone'),
  make(D.lore, 'tote', 'ink'),
  make(D.autism, 'blanket', 'bone'),
  ...printifyMade,
];

export const catalogByHandle: Record<string, CatalogItem> = Object.fromEntries(
  [...catalog, ...printifyMade].map((item) => [item.handle, item]),
);
