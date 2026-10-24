'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/components/providers/app-store';
import { isDoNotTrackEnabled } from '@/lib/analytics';
import { PrivacyDialog } from '@/components/dialogs';
import { cn } from '@/lib/cn';
import { CloseIcon } from '@/components/icons';

/**
 * Cookie / 统计同意横幅（PRD 4.7）：
 * - 未做出选择前不加载任何统计脚本
 * - 「允许」→ granted，「仅必要」→ denied
 * - 记住选择；可在设置面板重新打开
 */
export function ConsentBanner() {
  const { consent, setConsent, hydrated } = useAppStore();
  const [dismissed, setDismissed] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [dnt, setDnt] = useState(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDnt(isDoNotTrackEnabled());
  }, []);

  const visible = hydrated && consent === null && !dismissed;

  /*
   * 横幅与右下角的 Toast 区都贴底，小屏上会互相遮挡。
   * 这里把横幅高度写进 CSS 变量 `--consent-h`，Toast 区据此上移（见 app/globals.css）。
   */
  useEffect(() => {
    const root = document.documentElement;
    if (!visible || !bannerRef.current) {
      root.style.removeProperty('--consent-h');
      return;
    }
    const node = bannerRef.current;
    const sync = () => {
      root.style.setProperty('--consent-h', `${Math.ceil(node.getBoundingClientRect().height) + 12}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--consent-h');
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <div
        ref={bannerRef}
        data-testid="consent-banner"
        role="region"
        aria-label="统计与隐私选择"
        className={cn(
          'fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-2xl animate-fade-up',
          'glass-panel flex flex-col gap-2.5 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4',
        )}
      >
        <p className="flex-1 text-[13px] leading-5 text-muted">
          我们使用隐私友好的统计工具（不采集个人身份信息、不做跨站追踪）来了解哪些站点更有用。
          你可以在
          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            data-testid="consent-privacy"
            className="mx-1 text-primary-ink underline underline-offset-2 hover:opacity-80"
          >
            隐私政策
          </button>
          中查看细节。{dnt ? '检测到浏览器已开启「请勿追踪」，默认不启用统计。' : ''}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setConsent('denied')}
            data-testid="consent-deny"
            className="btn-ghost px-3 py-1.5"
          >
            仅必要
          </button>
          <button
            type="button"
            onClick={() => setConsent('granted')}
            data-testid="consent-accept"
            className="btn-primary px-3 py-1.5"
          >
            允许统计
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="暂不选择，关闭横幅"
            className="grid h-7 w-7 place-items-center rounded-md text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <CloseIcon size={13} />
          </button>
        </div>
      </div>
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
}
