'use client';

import Link from 'next/link';
import { useState } from 'react';
import { siteConfig, navLinks } from '@/lib/config';
import { useAppStore } from '@/components/providers/app-store';
import { useUi } from '@/components/providers/ui';
import { PrivacyDialog } from '@/components/dialogs';
import { LogoMark } from '@/components/icons';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { InteractiveHoverButton } from '@/components/magicui/interactive-hover-button';

/**
 * 页脚：订阅入口（PRD 3.2.4）、隐私政策（PRD 4.7）、外链声明、分类快捷链接。
 */
export function Footer() {
  const { openSubscribe, openFeedback } = useUi();
  const { sites } = useAppStore();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <footer className="mt-14 border-t border-line/80 pt-8 pb-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <LogoMark size={22} />
              <span className="text-[14px] font-semibold text-ink">{siteConfig.name}</span>
            </div>
            <p className="mt-2 max-w-sm text-[13px] leading-5 text-muted">
              {siteConfig.description}
            </p>
            {/*
             * 站点数只有客户端拿到数据后才准确（数据是运行时 fetch 的）。
             * 服务端渲染 / 无 JS 时不要写「当前收录 0 个站点」这种假信息，改说一句不含数字的话。
             */}
            <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {sites.length > 0 ? (
                <>
                  当前收录{' '}
                  <NumberTicker
                    value={sites.length}
                    startValue={0}
                    duration={1.1}
                    className="mx-0.5 font-medium text-ink"
                  />{' '}
                  个站点 · 数据与代码分离，欢迎通过反馈推荐新站点
                </>
              ) : (
                '精选技术站点 · 数据与代码分离，欢迎通过反馈推荐新站点'
              )}
            </p>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold tracking-wide text-ink">分类</h2>
            <ul className="mt-2 space-y-1.5">
              {navLinks.slice(1).map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-muted transition-colors hover:text-primary-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold tracking-wide text-ink">关于</h2>
            <ul className="mt-2 space-y-1.5">
              <li>
                {/* Magic UI InteractiveHoverButton：悬停时左侧圆点铺满底色、文字右移换成箭头 */}
                <InteractiveHoverButton
                  onClick={openSubscribe}
                  data-testid="footer-subscribe"
                  className="px-3.5 py-1.5 text-[13px]"
                >
                  订阅每周精选
                </InteractiveHoverButton>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openFeedback()}
                  className="text-[13px] text-muted transition-colors hover:text-primary-ink"
                >
                  站点反馈
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  data-testid="footer-privacy"
                  className="text-[13px] text-muted transition-colors hover:text-primary-ink"
                >
                  隐私政策
                </button>
              </li>
              <li>
                <Link
                  href="/privacy/"
                  data-testid="footer-privacy-link"
                  className="text-[13px] text-muted transition-colors hover:text-primary-ink"
                >
                  隐私政策（独立页面）
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line/60 pt-4 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.author} · 仅收录公开可访问的第三方站点</p>
          <p className="text-muted">
            外链声明：本站不控制第三方站点的内容与隐私实践，跳转后请遵循对方条款。
          </p>
        </div>
      </footer>
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
}
