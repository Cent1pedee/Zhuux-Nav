import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ConsentBanner } from '@/components/consent-banner';
import { GridFallback } from '@/components/grid-fallback';
import { HomeView } from '@/components/home-view';
import { getSiteData } from '@/lib/server-data';
import { siteConfig } from '@/lib/config';

interface Params {
  slug: string;
}

/** 分类静态路由：构建期生成 /category/<slug>/（PRD 4.2） */
export function generateStaticParams(): Params[] {
  return getSiteData().categories.map((category) => ({ slug: category.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const { categories } = getSiteData();
  const category = categories.find((c) => c.id === slug);
  if (!category) return { title: '分类不存在' };
  const title = `${category.name}导航`;
  return {
    title,
    description: `${category.description}——精选 ${category.name} 站点合集，支持搜索、收藏与深浅色主题。`,
    alternates: { canonical: `/category/${category.id}/` },
    openGraph: {
      title: `${title} · ${siteConfig.name}`,
      description: category.description,
      url: `${siteConfig.url}/category/${category.id}/`,
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const data = getSiteData();
  const category = data.categories.find((c) => c.id === slug);
  if (!category) notFound();

  const count = data.sites.filter((site) => site.category === category.id).length;

  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-shell px-3 pb-8 pt-5 sm:px-4 sm:pt-6">
        <nav aria-label="面包屑" className="mb-3 flex items-center gap-1.5 text-[13px] text-muted">
          <Link href="/" className="transition-colors hover:text-primary-ink">
            全部站点
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-ink">
            {category.name}
          </span>
        </nav>
        <Suspense fallback={<GridFallback count={6} />}>
          <HomeView
            lockedCategory={category.id}
            heading={`${category.name}导航`}
            intro={`${count} 个精选站点 · ${category.description}`}
          />
        </Suspense>
      </main>
      <div className="mx-auto max-w-shell px-3 sm:px-4">
        <Footer />
      </div>
      <ConsentBanner />
    </>
  );
}
