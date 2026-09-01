import type { Both, Colourway, Garment, Print } from '@/lib/catalog';

export interface Money {
  amount: number;
  currency: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface Size {
  /** Variant GID. Prefixed `catalog:` when the storefront is not live. */
  id: string;
  label: string;
  available: boolean;
}

/** What the pages render. Shopify or catalogue, the shape is the same. */
export interface Product {
  id: string;
  handle: string;
  title: string;
  type: string;
  tags: string[];
  available: boolean;
  price: Money;
  images: ProductImage[];
  sizes: Size[];
  description: Both;
  tagline: Both;
  art: {
    garment: Garment;
    colourway: Colourway;
    prints: readonly Print[];
  };
  source: 'shopify' | 'catalog';
}

export interface CartLine {
  id: string;
  quantity: number;
  total: Money;
  variantId: string;
  size: string;
  product: {
    handle: string;
    title: string;
    image?: ProductImage;
  };
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  quantity: number;
  subtotal: Money;
  total: Money;
  lines: CartLine[];
}

/* ---- raw Storefront shapes, only what the fragments ask for ---- */

export interface RawMoney {
  amount: string;
  currencyCode: string;
}

export interface RawImage {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
}

export interface RawProduct {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  featuredImage: RawImage | null;
  images: { nodes: RawImage[] };
  priceRange: { minVariantPrice: RawMoney };
  variants: {
    nodes: {
      id: string;
      title: string;
      availableForSale: boolean;
      price: RawMoney;
      selectedOptions: { name: string; value: string }[];
    }[];
  };
  ironic: { value: string } | null;
}

export interface RawCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: RawMoney; totalAmount: RawMoney };
  lines: {
    nodes: {
      id: string;
      quantity: number;
      cost: { totalAmount: RawMoney };
      merchandise: {
        id: string;
        title: string;
        price: RawMoney;
        selectedOptions: { name: string; value: string }[];
        product: { handle: string; title: string; featuredImage: RawImage | null };
      };
    }[];
  };
}
