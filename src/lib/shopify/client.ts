import 'server-only';

/**
 * Thin Storefront API client. Plain fetch so Next can cache it; no SDK.
 *
 * The token is the one thing Shopify would not let an automated tool mint.
 * Without it the site still renders from the local catalogue (see
 * products.ts) and the register stays closed.
 */

export const API_VERSION = '2026-07';

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export function isStorefrontConfigured(): boolean {
  return Boolean(domain && token);
}

export class StorefrontError extends Error {
  constructor(
    message: string,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = 'StorefrontError';
  }
}

interface FetchOptions {
  variables?: Record<string, unknown>;
  /** Passed straight to fetch; products are cached, carts are not. */
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}

export async function storefront<T>(
  query: string,
  { variables, cache, next }: FetchOptions = {},
): Promise<T> {
  if (!domain || !token) {
    throw new StorefrontError('Storefront API is not configured');
  }

  const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
    cache,
    next,
  });

  if (!res.ok) {
    throw new StorefrontError(`Storefront API ${res.status}`);
  }

  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new StorefrontError('Storefront API returned errors', json.errors);
  }
  if (!json.data) {
    throw new StorefrontError('Storefront API returned no data');
  }
  return json.data;
}
