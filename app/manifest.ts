import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';

export const dynamic = 'force-static';

/**
 * PWA manifest（PRD 4.2 / 4.4）。
 *
 * 为什么用 app/manifest.ts 而不是 public/manifest.webmanifest：
 * 静态文件里的站名、标语、描述与 lib/config.ts 是两份拷贝，改了配置不会同步，
 * 曾出现 manifest 里写「3 秒找到技术站点」而页面写「3 秒找到你要的技术站点」的漂移。
 * 由这里统一从 siteConfig 生成后，只有一个数据源。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} · ${siteConfig.tagline}`,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0A0A0F',
    theme_color: '#0A0A0F',
    lang: siteConfig.locale,
    dir: 'ltr',
    categories: ['developer', 'productivity', 'utilities'],
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
