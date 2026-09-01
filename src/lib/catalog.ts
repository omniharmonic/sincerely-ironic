/**
 * The ten garments, in both registers.
 *
 * This file is the local source of truth. It seeded Shopify once (see
 * docs/superpowers/specs), it keys the typographic garment art by handle, and
 * it is the fallback catalogue when the Storefront token is absent, so the
 * site always renders. When Shopify answers, Shopify wins for title, price,
 * variants and images; the art and the print text always come from here.
 */

export type Garment =
  | 'tee'
  | 'longsleeve'
  | 'hoodie'
  | 'crewneck'
  | 'cap'
  | 'sock'
  | 'tote';

export type Colourway = 'bone' | 'ink';

export interface Both {
  sincere: string;
  ironic: string;
}

export interface Print {
  /** Where on the garment. Art places it. */
  place: 'front' | 'back' | 'sleeve' | 'left' | 'right';
  text: string;
  /** Relative size, 1 = the garment's default. */
  scale?: number;
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
  /** One line under the title on the product page. */
  tagline: Both;
}

export const APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export const ONE_SIZE = ['One size'] as const;

export const VENDOR = 'Sincerely Ironic';

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
    tagline: {
      sincere: 'The name, split across the body.',
      ironic: 'The name, on a shirt, which is what names are for.',
    },
    description: {
      sincere:
        'The front says the part you lead with. The back says the part people read after you have walked past. Heavyweight cotton, 6.5 oz, boxy, drops a little past the hip. Printed in the same ink both sides. We mean both.',
      ironic:
        'A shirt with our name on it. That is it. We put the brand on the product, which is what brands do, which we said we would not do. It is a very good shirt. Buy it and help us be wrong.',
    },
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
      { place: 'back', text: 'there were never meant to be', scale: 0.4 },
    ],
    tagline: {
      sincere: 'Position one, printed where other people can see it.',
      ironic: 'A shirt about not watching, made to be looked at.',
    },
    description: {
      sincere:
        'Before the seats went in, everyone at a rite was in it. This is a reminder printed where other people can see it, which means the person wearing it is not the one it is for. Heavyweight cotton, boxy.',
      ironic:
        'A shirt that says there are no spectators, worn to be looked at. We noticed. It is still true. Also it is the softest one we make.',
    },
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
      { place: 'back', text: '(it is merch)', scale: 0.45 },
    ],
    tagline: {
      sincere: 'The souvenir comes first. The event is wherever you wear it.',
      ironic: 'It is merch.',
    },
    description: {
      sincere:
        'Merch is a souvenir of something you attended. This is the other way round: the thing you attend comes after, wherever you wear it. That is what a sixth wall is. The play leaves the building on somebody’s back. Same cotton. Same box cut.',
      ironic:
        'It is merch. We wrote a whole paragraph in the other universe about why it is not, and it is. Fits great though.',
    },
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
    tagline: {
      sincere: 'A plain shirt with nothing on it. The vehicle.',
      ironic: 'A blank t-shirt for thirty-four dollars.',
    },
    description: {
      sincere:
        'A plain, well-made shirt with nothing on it. The most known shape in the world, empty, which is exactly what makes it a good vehicle. Whatever you do while wearing it is the print. Heavyweight cotton, boxy, no label at the neck.',
      ironic:
        'A blank t-shirt for thirty-four dollars. We know. It is the same shirt as the others without the part that costs us money. The difference is you are paying for the idea, which we also know, and which you also know, which is the idea.',
    },
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
    tagline: {
      sincere: 'The sentence the company stands on, finished down the sleeve.',
      ironic: 'Either the wisest thing we have said or a fortune cookie.',
    },
    description: {
      sincere:
        'The sentence the company stands on, finished down the left sleeve so it can only be read by someone standing close. Money was a play. Nation was one. This is a longsleeve. Ribbed cuffs, dropped shoulder, 7 oz.',
      ironic:
        'A longsleeve with a sentence on it that is either the wisest thing we have ever said or a fortune cookie, depending on the light. Runs slightly long in the arm on purpose so the sleeve text is not cut off. That is called design.',
    },
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
    tagline: {
      sincere: 'The instruction every honest teacher gives.',
      ironic: 'We put a koan on a hoodie.',
    },
    description: {
      sincere:
        'If something claims to be it, it is not; if you meet the company on the road, do the obvious thing. Front and back, so the sentence needs a second person to finish it. 12 oz fleece, brushed inside, double-lined hood.',
      ironic:
        'We put a koan on a hoodie. The Buddha said it about himself and we said it about a limited liability company. Extremely warm. Kangaroo pocket.',
    },
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
    tagline: {
      sincere: 'The wall that was a threshold is now a chair.',
      ironic: 'A hat that breaks the fourth wall by talking about it.',
    },
    description: {
      sincere:
        'Every film winks at the camera now, so the wink does nothing. The wall that was a threshold is now a chair. Six-panel unstructured cap, brass buckle, embroidered, one size.',
      ironic:
        'A hat that breaks the fourth wall by talking about how the fourth wall is broken, which is the most fourth-wall thing you can do. Fits most heads.',
    },
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
    tagline: {
      sincere: 'One sock says which is which. Mismatched is the pair.',
      ironic: 'A sentence from the ankle down.',
    },
    description: {
      sincere:
        'A partnership makes a noun; we cultivate verbs. One sock says which is which. Wear them mismatched, that is the pair. Combed cotton, ribbed, mid-calf, one size.',
      ironic:
        'Socks. One says NOUN and one says VERB, so you can be a sentence from the ankle down. Nobody will see them. That is fine. You will know.',
    },
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
    tagline: {
      sincere: 'Position eight, with the name under it so it has something to contradict.',
      ironic: 'The whole company on a tote.',
    },
    description: {
      sincere:
        'Position eight, printed on a bag, with the name underneath so the sentence has something to contradict. Heavy canvas, long handles, holds a week of groceries or one production.',
      ironic:
        'The bag says we build no brand and then has our logo on it. This is the whole company on a tote. Twenty-eight dollars.',
    },
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
    tagline: {
      sincere: 'Around an hour and forty minutes in, a room stops being a crowd.',
      ironic: 'A sweatshirt about group trance, sold individually.',
    },
    description: {
      sincere:
        'Around an hour and forty minutes without a break, a room stops being a crowd and becomes one thing. The back has the number. 10 oz fleece, raglan, ribbed hem.',
      ironic:
        'A sweatshirt about group trance, sold individually. The back says 1:40, which is either the time it takes or a bible verse, and we are not going to tell you.',
    },
  },
] as const;

export const catalogByHandle: Record<string, CatalogItem> = Object.fromEntries(
  catalog.map((item) => [item.handle, item]),
);
