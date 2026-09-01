/**
 * Site copy that is not a product. Every entry has both readings.
 *
 * Voice: mechanism, not meaning. First person plural. Long sentences land on
 * short flat ones. No hedging. Funny is allowed; cute is not. Never "journey",
 * never "transformational" as an adjective, never "brand partnership".
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
  description:
    'Apparel from Sixth Wall Productions. Every piece is sincere and ironic. The store is real; the universe is unconfirmed.',
  shipsFrom: 'Boulder, Colorado',
} as const;

export const nav = {
  shop: { sincere: 'Shop', ironic: 'Shop' },
  about: { sincere: 'What this is', ironic: 'What this is' },
  cart: { sincere: 'Cart', ironic: 'Cart' },
} satisfies Record<string, Both>;

export const hero = {
  /** Identical in both universes. That is the point. */
  statement: 'WE MEAN IT.',
  sub: {
    sincere:
      'A play leaves the building on somebody’s back. These are the clothes it leaves in. Apparel from Sixth Wall Productions, dressed for the street.',
    ironic:
      'A theatre company that builds no brand has a clothing line. This is it. Every piece is sincere, every piece is ironic, and the store may or may not exist.',
  },
  cta: { sincere: 'See the clothes', ironic: 'Fine, show me' },
} satisfies { statement: string; sub: Both; cta: Both };

export const positions: readonly Both[] = [
  { sincere: 'This is a store.', ironic: 'This is a store. Probably.' },
  { sincere: 'The clothes are real. They ship.', ironic: 'The clothes are real. The universe is unconfirmed.' },
  { sincere: 'Every piece is sincere.', ironic: 'Every piece is sincere, which we say ironically.' },
  { sincere: 'Every piece is ironic.', ironic: 'Every piece is ironic, which we mean.' },
  { sincere: 'It cannot be both.', ironic: 'It cannot be both.' },
  { sincere: 'It is.', ironic: 'Switch and check.' },
];

export const grid = {
  heading: { sincere: 'Everything', ironic: 'Everything (both)' },
  count: (n: number): Both => ({
    sincere: `${n} pieces`,
    ironic: `${n} pieces, allegedly`,
  }),
  otherReading: {
    sincere: 'The other reading is one switch away.',
    ironic: 'The straight version is one switch away.',
  },
} as const;

export const product = {
  size: { sincere: 'Size', ironic: 'Size' },
  add: { sincere: 'Add to cart', ironic: 'Add to cart' },
  adding: { sincere: 'Adding', ironic: 'Adding' },
  added: { sincere: 'Added', ironic: 'Added' },
  soldOut: { sincere: 'Sold out', ironic: 'Gone' },
  unavailable: {
    sincere: 'The register opens when the storefront key is in. Soon.',
    ironic: 'You can buy this in the other universe. This one is waiting on a key.',
  },
  details: {
    sincere: `Ships from ${site.shipsFrom}. Returns within 30 days, unworn. Printed to order.`,
    ironic: `Ships from a real place with a real zip code. Returns within 30 days if you have not worn it to a rite.`,
  },
  fit: {
    sincere: 'Boxy fit. Between sizes, size down.',
    ironic: 'Boxy fit. Between sizes, pick the universe where you are the other one.',
  },
  back: { sincere: 'All pieces', ironic: 'Back to the pile' },
} satisfies Record<string, Both>;

export const cart = {
  title: { sincere: 'Cart', ironic: 'Cart' },
  empty: {
    sincere: 'Nothing here yet. That is a fine place to start.',
    ironic: 'Empty, like most carts, most of the time.',
  },
  subtotal: { sincere: 'Subtotal', ironic: 'Subtotal' },
  note: {
    sincere: 'Shipping and tax are worked out at checkout.',
    ironic: 'Shipping and tax appear at checkout, as is tradition.',
  },
  checkout: { sincere: 'Check out', ironic: 'Check out' },
  keep: { sincere: 'Keep looking', ironic: 'Keep looking' },
  remove: { sincere: 'Remove', ironic: 'Remove' },
  close: { sincere: 'Close', ironic: 'Close' },
} satisfies Record<string, Both>;

export const ticker = {
  store: { sincere: 'Store: open', ironic: 'Store: open, allegedly' },
  exists: { sincere: 'Exists: yes', ironic: 'Exists: unconfirmed' },
  ships: { sincere: `Ships from: ${site.shipsFrom}`, ironic: 'Ships from: here, or the other one' },
  dba: { sincere: 'Sixth Wall Productions DBA', ironic: 'A Sixth Wall Productions production' },
} satisfies Record<string, Both>;

export const about = {
  title: { sincere: 'What this is.', ironic: 'What this is, apparently.' },
  paragraphs: [
    {
      sincere:
        'Sincerely Ironic is the apparel line of Sixth Wall Productions, a company that makes ritual theatre and immersive worlds. Theatre has six walls. The sixth is the exit: the one a play goes through when it leaves the building and becomes the way some people live. Clothes are the simplest thing that walks out of a building. So these are the sixth wall, sold by the piece.',
      ironic:
        'Sincerely Ironic is what happens when a theatre company that says it builds no brand needs to pay for a venue. Theatre has six walls, apparently. We were told the sixth one is the exit. This is the gift shop by the exit.',
    },
    {
      sincere:
        'Everything here is both sincere and ironic. That is not a mood; it is the position. A symbol has to be raised straight to work, and it can never hold the whole of what it points at. We know that. We raise it anyway, and we tell you we know. Held with a straight face and a wink at once.',
      ironic:
        'Every piece is sincere and ironic at once, which is a way of saying we would like to sell you a shirt and also be right about it. The switch at the top of the page changes the universe. It does not change the shirt.',
    },
    {
      sincere:
        'The store is real. Orders ship from Boulder, Colorado. Returns within thirty days, unworn. The company does not build a brand, and this is its brand. If you meet us on the road, you know what to do.',
      ironic:
        'The store exists. We are fairly sure. Orders ship from a real place with a real zip code. Returns within thirty days if you have not worn it to a rite. If you meet us on the road, we will probably be wearing this.',
    },
  ] satisfies Both[],
  questionsHeading: { sincere: 'Questions', ironic: 'Questions, anticipated' },
  questions: [
    {
      q: { sincere: 'Is this real?', ironic: 'Is this real?' },
      a: { sincere: 'Yes. The clothes ship.', ironic: 'The clothes are real. We are not sure about the rest.' },
    },
    {
      q: { sincere: 'Which universe am I in?', ironic: 'Which universe am I in?' },
      a: {
        sincere: 'The one you landed in. The switch in the header moves you. It remembers.',
        ironic: 'Check the ticker. If it says unconfirmed, that is the one.',
      },
    },
    {
      q: { sincere: 'Why is the blank one thirty-four dollars?', ironic: 'Why is the blank one thirty-four dollars?' },
      a: {
        sincere: 'It is the same shirt as the others, without the print. The price is the shirt.',
        ironic: 'Because we knew you would ask.',
      },
    },
    {
      q: { sincere: 'Where does the money go?', ironic: 'Where does the money go?' },
      a: {
        sincere: 'Into the next production. A world is being built, and it costs money to book a room.',
        ironic: 'Into a room with a stage in it. We are not a charity. We are a theatre, which is worse.',
      },
    },
    {
      q: { sincere: 'Do you do collaborations?', ironic: 'Do you do collaborations?' },
      a: {
        sincere: `Story partnerships, never the other kind. Write to ${site.parent.email}.`,
        ironic: 'We do not say the other phrase. We have a whole document about it.',
      },
    },
  ] satisfies { q: Both; a: Both }[],
  sizing: {
    sincere: 'Boxy fit. Between sizes, size down. Cap, socks and tote are one size, which is also a position.',
    ironic: 'Boxy fit. Between sizes, size down. Cap, socks and tote are one size. We did not want to talk about it.',
  },
} as const;

export const notFound = {
  title: { sincere: 'This page exists in the other universe.', ironic: 'This page exists in the other universe.' },
  body: {
    sincere: 'Or it never did. Either way, it is not here. The switch is above; the clothes are below.',
    ironic: 'We checked. It is not there either. Try the clothes.',
  },
  cta: { sincere: 'Back to the store', ironic: 'Back to the store' },
} satisfies Record<string, Both>;

export const footer = {
  line: {
    sincere: 'Sincerely Ironic is Sixth Wall Productions, doing business as.',
    ironic: 'Sincerely Ironic is Sixth Wall Productions in a different shirt.',
  },
  parent: { sincere: 'The company', ironic: 'The people responsible' },
  write: { sincere: 'Write to us', ironic: 'Write to us' },
} satisfies Record<string, Both>;
