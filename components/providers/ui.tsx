'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Site } from '@/lib/types';

interface UiState {
  search: boolean;
  /** 打开搜索时预填的关键词（来自 ?q= 深链接，或「无结果」页的推荐入口） */
  searchQuery: string;
  settings: boolean;
  share: boolean;
  subscribe: boolean;
  /** null = 关闭；{ site } = 针对某站点反馈 */
  feedback: { site: Site | null } | null;
}

interface UiContextValue {
  searchOpen: boolean;
  searchQuery: string;
  settingsOpen: boolean;
  shareOpen: boolean;
  subscribeOpen: boolean;
  feedbackTarget: Site | null;
  feedbackOpen: boolean;
  openSearch: (query?: string) => void;
  openSettings: () => void;
  openShare: () => void;
  openSubscribe: () => void;
  openFeedback: (site?: Site) => void;
  closeSearch: () => void;
  closeSettings: () => void;
  closeShare: () => void;
  closeSubscribe: () => void;
  closeFeedback: () => void;
}

const UiContext = createContext<UiContextValue | null>(null);

/**
 * 全局弹层编排：Header / Footer / 卡片菜单都通过这里打开弹窗，
 * 保证每个入口都绑定到真实可交互的弹层（不存在无响应按钮）。
 */
export function UiProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UiState>({
    search: false,
    searchQuery: '',
    settings: false,
    share: false,
    subscribe: false,
    feedback: null,
  });

  const openSearch = useCallback(
    (query?: string) => setState((s) => ({ ...s, search: true, searchQuery: query ?? '' })),
    [],
  );
  const openSettings = useCallback(() => setState((s) => ({ ...s, settings: true })), []);
  const openShare = useCallback(() => setState((s) => ({ ...s, share: true })), []);
  const openSubscribe = useCallback(() => setState((s) => ({ ...s, subscribe: true })), []);
  const openFeedback = useCallback(
    (site?: Site) => setState((s) => ({ ...s, feedback: { site: site ?? null } })),
    [],
  );

  const closeSearch = useCallback(() => setState((s) => ({ ...s, search: false })), []);
  const closeSettings = useCallback(() => setState((s) => ({ ...s, settings: false })), []);
  const closeShare = useCallback(() => setState((s) => ({ ...s, share: false })), []);
  const closeSubscribe = useCallback(() => setState((s) => ({ ...s, subscribe: false })), []);
  const closeFeedback = useCallback(() => setState((s) => ({ ...s, feedback: null })), []);

  const value = useMemo<UiContextValue>(
    () => ({
      searchOpen: state.search,
      searchQuery: state.searchQuery,
      settingsOpen: state.settings,
      shareOpen: state.share,
      subscribeOpen: state.subscribe,
      feedbackTarget: state.feedback?.site ?? null,
      feedbackOpen: state.feedback !== null,
      openSearch,
      openSettings,
      openShare,
      openSubscribe,
      openFeedback,
      closeSearch,
      closeSettings,
      closeShare,
      closeSubscribe,
      closeFeedback,
    }),
    [
      state,
      openSearch,
      openSettings,
      openShare,
      openSubscribe,
      openFeedback,
      closeSearch,
      closeSettings,
      closeShare,
      closeSubscribe,
      closeFeedback,
    ],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi 必须在 UiProvider 内使用');
  return ctx;
}
