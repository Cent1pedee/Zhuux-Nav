'use client';

import { useEffect, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { ToastProvider } from '@/components/providers/toast';
import { ConfirmProvider } from '@/components/providers/confirm';
import { AppStoreProvider } from '@/components/providers/app-store';
import { UiProvider, useUi } from '@/components/providers/ui';
import { SearchCommand } from '@/components/search-command';
import { SettingsDialog } from '@/components/settings-dialog';
import { FeedbackDialog, ShareDialog, SubscribeDialog } from '@/components/dialogs';
import { track } from '@/lib/analytics';
import type { SiteData } from '@/lib/data';

/**
 * 全局弹层挂载点：所有弹窗在此统一挂载一次，
 * 任意页面/组件通过 useUi() 打开，保证「不存在无响应的弹窗」。
 */
function GlobalOverlays() {
  const { searchOpen, searchQuery, openSearch, closeSearch, settingsOpen, closeSettings } = useUi();

  /* 埋点：page_view（PRD 4.6） */
  useEffect(() => {
    track('page_view', { path: window.location.pathname + window.location.search });
  }, []);

  /*
   * 结构化数据（app/layout.tsx 的 SearchAction）声明了 `?q={search_term_string}`，
   * 这里让该深链接真正生效：带 ?q= 打开页面时自动打开搜索面板并预填关键词。
   * 否则 JSON-LD 里声明的是一个死链接。
   */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q && q.trim()) openSearch(q.trim());
  }, [openSearch]);

  return (
    <>
      {/* 搜索结果的跳转由结果项自身的 <a> 完成，这里只负责开合 */}
      <SearchCommand open={searchOpen} onClose={closeSearch} initialQuery={searchQuery} />
      <SettingsDialog open={settingsOpen} onClose={closeSettings} />
      <ShareDialog />
      <SubscribeDialog />
      <FeedbackDialog />
    </>
  );
}

export function Providers({
  children,
  initialData = null,
}: {
  children: ReactNode;
  /** 构建期注入的站点数据：有值时首屏直接渲染真实卡片，禁用 JS 也能看到全部站点 */
  initialData?: SiteData | null;
}) {
  return (
    /*
     * MotionConfig 统一约束动效（PRD 7.6）：
     * - reducedMotion="user"：系统开启「减少动态效果」时，所有 Motion 动画自动降级为瞬时，
     *   与 globals.css 里 CSS 动画的降级保持一致，不需要每个组件各写一遍。
     * - transition：全局默认缓动，避免各处 spring 参数漂移。
     */
    <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      <ToastProvider>
        <ConfirmProvider>
          <AppStoreProvider initialData={initialData}>
            <UiProvider>
              {children}
              <GlobalOverlays />
            </UiProvider>
          </AppStoreProvider>
        </ConfirmProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
