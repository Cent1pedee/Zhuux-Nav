import { HomeView } from '@/components/home-view';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ConsentBanner } from '@/components/consent-banner';

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-shell px-3 pb-8 pt-5 sm:px-4 sm:pt-6">
        {/* 不再套 Suspense：首屏数据在构建期注入，套 Suspense 会把内容塞进
            <div hidden id="S:0"> 占位里，禁用 JS 时这段内容永远替换不出来 */}
        <HomeView heading="全部站点" />
      </main>
      <div className="mx-auto max-w-shell px-3 sm:px-4">
        <Footer />
      </div>
      <ConsentBanner />
    </>
  );
}
