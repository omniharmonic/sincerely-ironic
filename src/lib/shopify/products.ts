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
    sizes: item.sizes.map((label) => ({
      id: `catalog:${item.handle}:${label}`,
      label,
      available: true,
    })),
    description: {
      sincere: paragraph(item.description.sincere),
      ironic: paragraph(item.description.ironic),
    },
    art: { garment: item.garment, colourway: item.colourway, prints: item.prints },
    source: 'catalog',
  };
}

function fromShopify(raw: RawProduct): Product | null {
  const item = catalogByHandle[raw.handle];
  // A product we have no art or second reading for is not shown. Add it to
  // the catalogue first; that is the contract.
  if (!item) return null;

  const images = (raw.images.nodes.length ? raw.images.nodes : raw.featuredImage ? [raw.featuredImage] : []).map(
    (img) => ({ url: img.url, alt: img.altText ?? raw.title, width: img.width, height: img.height }),
  );

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
    sizes: raw.variants.nodes.map((v) => ({
      id: v.id,
      label: v.selectedOptions.find((o) => o.name === 'Size')?.value ?? v.title,
      available: v.availableForSale,
    })),
    description: { sincere: raw.descriptionHtml || paragraph(item.description.sincere), ironic },
    art: { garment: item.garment, colourway: item.colourway, prints: item.prints },
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
