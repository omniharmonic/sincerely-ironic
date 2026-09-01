import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Shopify serves its own copy of every mockup, which is what the
    // Storefront API hands us. `images.printify.com` is here because the
    // vendor's originals are what Shopify was seeded from and a product can
    // still be pointed straight at one.
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'images.printify.com' },
    ],
  },
};

export default nextConfig;
