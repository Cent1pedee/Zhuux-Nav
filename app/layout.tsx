import type { Metadata, Viewport } from 'next';
import './globals.css';
import { siteConfig } from '@/lib/config';
import { Providers } from '@/components/providers';
import { PageBackdrop } from '@/components/page-backdrop';
import { getSiteData } from '@/lib/server-data';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} · ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.author }],
  applicationName: siteConfig.name,
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} · ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} · ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0F' },
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
  ],
  colorScheme: 'dark light',
};

/**
 * 防 FOUC：在 HTML 解析阶段就把主题 class 写到 <html> 上（PRD 7.4）。
 * 与 lib/theme.ts 的 key（nav.theme）保持一致。
 */
const themeScript = `(function(){try{var m=localStorage.getItem('nav.theme');var d=m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');}})();`;

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: siteConfig.locale,
      publisher: { '@type': 'Organization', name: siteConfig.author },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteConfig.url}/?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'CollectionPage',
      '@id': `${siteConfig.url}/#collection`,
      url: siteConfig.url,
      name: `${siteConfig.name} · 站点合集`,
      isPartOf: { '@id': `${siteConfig.url}/#website` },
      about: { '@type': 'Thing', name: '开发者工具与资源导航' },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  /*
   * 构建期把站点数据灌进 Provider：
   * 首屏 HTML 里就带真实卡片（不再依赖运行时 fetch），因此禁用 JS 时
   * 卡片、分类、收藏入口全都可读可点，满足「无 JS 仍可访问」的底线。
   * 运行时仍有 /data/sites.json 可重新拉取（reload），两者共用同一份校验逻辑。
   */
  const initialData = getSiteData();
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-ink antialiased">
        {/* 动态渐变光斑 + 网格底纹（PRD 7.1）：视差变量写在它自己身上，避免整页样式重算 */}
        <PageBackdrop />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary-solid focus:px-3 focus:py-2 focus:text-[13px] focus:text-white"
        >
          跳到主要内容
        </a>
        <Providers initialData={initialData}>{children}</Providers>
      </body>
    </html>
  );
}
