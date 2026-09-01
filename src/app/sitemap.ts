import type { MetadataRoute } from 'next';

import { catalog } from '@/lib/catalog';
import { site } from '@/lib/copy';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${site.url}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...catalog.map((c) => ({
      url: `${site.url}/products/${c.handle}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
