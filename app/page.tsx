import { Suspense } from 'react';
import { HomeView } from '@/components/home-view';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ConsentBanner } from '@/components/consent-banner';
import { GridFallback } from '@/components/grid-fallback';

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-shell px-3 pb-8 pt-5 sm:px-4 sm:pt-6">
        <Suspense fallback={<GridFallback />}>
          <HomeView heading="全部站点" />
        </Suspense>
      </main>
      <div className="mx-auto max-w-shell px-3 sm:px-4">
        <Footer />
      </div>
      <ConsentBanner />
    </>
  );
}
