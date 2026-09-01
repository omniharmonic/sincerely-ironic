import 'server-only';

import { catalog, catalogByHandle, type CatalogItem } from '@/lib/catalog';
import { isStorefrontConfigured, storefront, StorefrontError } from './client';
import { PRODUCT_QUERY, PRODUCTS_QUERY } from './queries';
import type { Money, Product, RawMoney, RawProduct } from './types';

const money = (m: RawMoney): Money => ({ amount: Number(m.amount), currency: m.currencyCode });

const CACHE: { next: NextFetchRequestConfig } = { next: { revalidate: 300, tags: ['products'] } };

/** Escape once; the description goes out as HTML in both registers. */
function paragraph(text: string): string {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<p>${safe}</p>`;
}

function fromCatalog(item: CatalogItem): Product {
  return {
    id: `catalog:${item.handle}`,
    handle: item.handle,
    title: item.title,
    type: item.type,
    tags: [],
    available: true,
    price: { amount: item.price, currency: 'USD' },
    images: [],
    options: [{ name: 'Size', values: [...item.sizes] }],
    colourImages: {},
    variants: item.sizes.map((label) => ({
      id: `catalog:${item.handle}:${label}`,
      options: { Size: label },
      available: true,
    })),
    description: {
      sincere: paragraph(item.description.sincere),
      ironic: paragraph(item.description.ironic),
    },
    art: { garment: item.garment, colourway: item.colourway, prints: item.prints, styles: item.styles },
    source: 'catalog',
  };
}

function fromShopify(raw: RawProduct): Product | null {
  const item = catalogByHandle[raw.handle];
  // A product we have no art or second reading for is not shown. Add it to
  // the catalogue first; that is the contract.
  if (!item) return null;

  const all = (raw.images.nodes.length ? raw.images.nodes : raw.featuredImage ? [raw.featuredImage] : []).map(
    (img) => ({ url: img.url, alt: img.altText ?? raw.title, width: img.width, height: img.height }),
  );

  // Lead with the colourway the catalogue drew this design on.
  //
  // Every listing carries both colours, and the vendor always pushes the
  // natural one first, so a whole grid of ivory garments came back however
  // the line was designed. The mockups carry no alt text and their file names
  // are hashes, but each VARIANT points at its own image — so the colour is
  // recoverable from the variant that owns it, and the catalogue already
  // alternates bone and ink down the rail.
  const colourOf = (v: RawProduct['variants']['nodes'][number]) =>
    v.selectedOptions.find((o) => /colou?r/i.test(o.name))?.value ?? '';
  const wantBlack = (item.lead ?? item.colourway) === 'ink';
  const wanted = new Set(
    raw.variants.nodes
      .filter((v) => v.image?.url && /black/i.test(colourOf(v)) === wantBlack)
      .map((v) => v.image!.url),
  );
  const images = wanted.size
    ? [...all.filter((i) => wanted.has(i.url)), ...all.filter((i) => !wanted.has(i.url))]
    : all;

  const ironic = raw.ironic?.value ? paragraph(raw.ironic.value) : paragraph(item.description.ironic);

  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    type: raw.productType,
    tags: raw.tags,
    available: raw.availableForSale,
    price: money(raw.priceRange.minVariantPrice),
    images,
    // Every axis the store defines, not just Size. A Printify blueprint
    // carries Colour AND Size, so listing one chip per variant produced
    // "S S M M L L" — ten chips, five labels, and no way to say which colour
    // you meant. The chosen variant has to be pinned on every axis or the
    // wrong garment ships.
    options: (raw.options ?? [])
      .map((o) => ({ name: o.name, values: (o.optionValues ?? []).map((v) => v.name) }))
      .filter((o) => o.values.length > 0),
    variants: raw.variants.nodes.map((v) => ({
      id: v.id,
      options: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
      available: v.availableForSale,
    })),
    // Every variant of a colour points at the same shot, so this collapses to
    // one photograph per colour — which is what the gallery jumps to.
    colourImages: Object.fromEntries(
      raw.variants.nodes
        .filter((v) => v.image?.url && colourOf(v))
        .map((v) => [colourOf(v), v.image!.url]),
    ),
    description: { sincere: raw.descriptionHtml || paragraph(item.description.sincere), ironic },
    art: { garment: item.garment, colourway: item.colourway, prints: item.prints, styles: item.styles },
    source: 'shopify',
  };
}

const catalogOrder = new Map(catalog.map((c, i) => [c.handle, i]));

export async function getProducts(): Promise<Product[]> {
  if (!isStorefrontConfigured()) return catalog.map(fromCatalog);

  try {
    const data = await storefront<{ products: { nodes: RawProduct[] } }>(PRODUCTS_QUERY, CACHE);
    const live = data.products.nodes.map(fromShopify).filter((p): p is Product => p !== null);
    if (live.length === 0) return catalog.map(fromCatalog);
    return live.sort(
      (a, b) => (catalogOrder.get(a.handle) ?? 99) - (catalogOrder.get(b.handle) ?? 99),
    );
  } catch (err) {
    if (err instanceof StorefrontError) {
      console.error('[storefront] products fell back to catalogue:', err.message, err.errors ?? '');
      return catalog.map(fromCatalog);
    }
    throw err;
  }
}

export async function getProduct(handle: string): Promise<Product | null> {
  const item = catalogByHandle[handle];
  if (!item) return null;
  if (!isStorefrontConfigured()) return fromCatalog(item);

  try {
    const data = await storefront<{ product: RawProduct | null }>(PRODUCT_QUERY, {
      variables: { handle },
      ...CACHE,
    });
    return data.product ? (fromShopify(data.product) ?? fromCatalog(item)) : fromCatalog(item);
  } catch (err) {
    if (err instanceof StorefrontError) {
      console.error('[storefront] product fell back to catalogue:', err.message, err.errors ?? '');
      return fromCatalog(item);
    }
    throw err;
  }
}
