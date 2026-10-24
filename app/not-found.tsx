import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { LogoMark } from '@/components/icons';

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto flex max-w-shell flex-col items-center px-4 pb-10 pt-20 text-center">
        <LogoMark size={40} />
        <p className="mt-4 font-mono text-[13px] text-muted">404</p>
        <h1 className="mt-1 text-page-title text-ink">页面不存在</h1>
        <p className="mt-2 max-w-md text-meta leading-6 text-muted">
          你访问的页面可能已被移动或删除。返回首页继续浏览精选站点，或使用 ⌘K 直接搜索。
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="btn-primary px-4 py-2"
          >
            返回首页
          </Link>
          <Link
            href="/privacy/"
            className="btn-ghost px-4 py-2"
          >
            查看隐私政策
          </Link>
        </div>
      </main>
      <div className="mx-auto max-w-shell px-3 sm:px-4">
        <Footer />
      </div>
    </>
  );
}
