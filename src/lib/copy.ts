/**
 * Site copy. Two readings of everything; the second is the first, a notch
 * more earnest. Short. Nothing on this site explains itself.
 */
import type { Both } from './catalog';

export const site = {
  name: 'Sincerely Ironic',
  url: 'https://sincerelyironic.com',
  parent: {
    name: 'Sixth Wall Productions',
    url: 'https://sixthwall.productions',
    email: 'hello@sixthwall.productions',
  },
  description: 'Apparel. Small runs, imagined in Colorado.',
  /** Where the line is made up. Printing and shipping happen elsewhere. */
  imaginedIn: 'Boulder, Colorado',
} as const;

export const nav = {
  shop: 'Shop',
  about: 'About',
  cart: 'Cart',
} as const;

export const hero = {
  /** The OG image has room for a sentence; the page does not. */
  statement: 'Thank you for your support.',
  caption: {
    sincere: 'Thank you for your support.',
    ironic: 'Thank you so much for your support.',
  } satisfies Both,
  cta: 'Shop',
} as const;

/** Care instructions, set large. */
export const care: readonly Both[] = [
  { sincere: 'Machine wash cold.', ironic: 'Machine wash cold.' },
  { sincere: 'Tumble dry low.', ironic: 'Tumble dry low.' },
  { sincere: 'Do not bleach.', ironic: 'Do not bleach.' },
  { sincere: 'Iron inside out.', ironic: 'Iron inside out.' },
  { sincere: 'Wear often.', ironic: 'Wear often.' },
  { sincere: 'Thank you.', ironic: 'Thank you so much.' },
];

export const grid = {
  heading: { sincere: 'Everything', ironic: 'Everything' },
  count: (n: number): Both => ({ sincere: `${n} items`, ironic: `${n} items, all good` }),
} as const;

export const product = {
  size: { sincere: 'Size', ironic: 'Size' },
  add: { sincere: 'Add to cart', ironic: 'Add to cart' },
  adding: { sincere: 'Adding', ironic: 'Adding' },
  added: { sincere: 'Added', ironic: 'Added!' },
  soldOut: { sincere: 'Sold out', ironic: 'Sold out, sorry' },
  unavailable: { sincere: 'Not available right now.', ironic: 'Not available right now. Sorry.' },
  pick: { sincere: 'Pick a size.', ironic: 'Pick a size.' },
  details: {
    sincere: `Imagined in ${site.imaginedIn}. Printed to order. Returns within 30 days, unworn.`,
    ironic: `Imagined in ${site.imaginedIn}. Printed to order. Returns within 30 days, unworn. No questions asked.`,
  },
  fit: {
    sincere: 'Boxy fit. Between sizes, size down.',
    ironic: 'Boxy fit. Between sizes, size down. You’ll be fine.',
  },
  back: { sincere: 'All items', ironic: 'All items' },
} satisfies Record<string, Both>;

export const cart = {
  title: { sincere: 'Cart', ironic: 'Cart' },
  empty: { sincere: 'Your cart is empty.', ironic: 'Your cart is empty. No pressure.' },
  subtotal: { sincere: 'Subtotal', ironic: 'Subtotal' },
  note: { sincere: 'Shipping and tax at checkout.', ironic: 'Shipping and tax at checkout.' },
  checkout: { sincere: 'Check out', ironic: 'Check out' },
  keep: { sincere: 'Keep shopping', ironic: 'Keep shopping' },
  remove: { sincere: 'Remove', ironic: 'Remove' },
  close: { sincere: 'Close', ironic: 'Close' },
} satisfies Record<string, Both>;

export const ticker = {
  open: 'Open',
  imagined: `Imagined in ${site.imaginedIn}`,
  returns: 'Returns within 30 days',
  thanks: { sincere: 'Thank you for your support', ironic: 'Thank you so much for your support' },
} as const;

export const about = {
  title: { sincere: 'About', ironic: 'About us' },
  /**
   * Written copy, verbatim. Both readings are identical here on purpose: the
   * device adds a notch of earnestness to the store's own voice, and this
   * page is not the store talking — it is the statement, and it says what it
   * says in either universe. `care` does the same.
   */
  paragraphs: [
    {
      sincere: 'We do not make clothes. We imagine them.',
      ironic: 'We do not make clothes. We imagine them.',
    },
    {
      sincere:
        'You do not buy them because of their artisanal intrinsic meaning, the kind of meaning woven by generations of grandmothers, a craft passed by way of immanent embeddedness in reality.',
      ironic:
        'You do not buy them because of their artisanal intrinsic meaning, the kind of meaning woven by generations of grandmothers, a craft passed by way of immanent embeddedness in reality.',
    },
    {
      sincere: 'You buy them because they are transcontextual, transgressive, transpersonal.',
      ironic: 'You buy them because they are transcontextual, transgressive, transpersonal.',
    },
    {
      sincere: 'You buy them because they are a statement to the world: I am self-aware and I am free.',
      ironic: 'You buy them because they are a statement to the world: I am self-aware and I am free.',
    },
    {
      sincere: 'They are post-cringe. They are what they say they are.',
      ironic: 'They are post-cringe. They are what they say they are.',
    },
    {
      sincere: 'Sincerely Ironic Apparel is a project of Sixth Wall Productions.',
      ironic: 'Sincerely Ironic Apparel is a project of Sixth Wall Productions.',
    },
  ] satisfies Both[],
  questionsHeading: { sincere: 'Questions', ironic: 'Questions' },
  questions: [
    { q: 'Chat, is this real?', a: { sincere: 'Yes.', ironic: 'Yes.' } },
    { q: 'Are we all going to die?', a: { sincere: 'Yes.', ironic: 'Yes.' } },
    { q: 'What is your return policy?', a: { sincere: 'No.', ironic: 'No.' } },
  ] satisfies { q: string; a: Both }[],
} as const;

/**
 * Labels for the shop filter. `all` leads and doubles as the clear — a
 * separate Clear button would just be a second way to press it.
 */
export const filters = {
  label: { sincere: 'Filter', ironic: 'Filter' },
  all: { sincere: 'Everything', ironic: 'Everything' },
  none: {
    sincere: 'Nothing in that category yet.',
    ironic: 'Nothing in that category yet. Try another.',
  },
} as const;

export const notFound = {
  title: { sincere: 'Nothing here.', ironic: 'Nothing here. Sorry!' },
  body: { sincere: 'The page may have moved. The clothes have not.', ironic: 'The page may have moved. The clothes have not.' },
  cta: { sincere: 'Back to the shop', ironic: 'Back to the shop' },
} satisfies Record<string, Both>;
