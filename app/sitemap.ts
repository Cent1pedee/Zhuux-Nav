import type { MetadataRoute } from 'next';
import { getSiteData } from '@/lib/server-data';
import { siteConfig } from '@/lib/config';

export const dynamic = 'force-static';

/** 静态 sitemap（PRD 4.2）：首页 + 6 个分类页 + 隐私页 */
export default function sitemap(): MetadataRoute.Sitemap {
  const { categories } = getSiteData();
  const now = new Date();

  return [
    {
      url: `${siteConfig.url}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    ...categories.map((category) => ({
      url: `${siteConfig.url}/category/${category.id}/`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    {
      url: `${siteConfig.url}/privacy/`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];
}
