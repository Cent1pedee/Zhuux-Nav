'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadSiteData, type SiteData } from '@/lib/data';
import {
  isConsent,
  isCursorStyle,
  isDensity,
  isRecentArray,
  isStringArray,
  isThemeMode,
  readJSON,
  STORAGE_KEYS,
  storage,
} from '@/lib/storage';
import { applyTheme, resolveTheme, systemPrefersDark } from '@/lib/theme';
import { setAnalyticsConsent, track } from '@/lib/analytics';
import type { Consent, CursorStyle, Density, RecentEntry, ResolvedTheme, ThemeMode } from '@/lib/types';
import { useToast } from './toast';

const MAX_RECENT = 10;

interface AppStore {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  sites: SiteData['sites'];
  categories: SiteData['categories'];
  reload: () => void;
  /** 本地偏好是否已完成水合（用于收藏/最近浏览的骨架态，避免闪烁） */
  hydrated: boolean;

  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  mergeFavorites: (ids: string[]) => void;
  clearFavorites: () => void;

  recent: RecentEntry[];
  pushRecent: (id: string) => void;
  clearRecent: () => void;

  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode, origin?: { x: number; y: number }) => void;

  density: Density;
  setDensity: (density: Density) => void;

  cursorStyle: CursorStyle;
  setCursorStyle: (style: CursorStyle) => void;

  consent: Consent;
  setConsent: (consent: 'granted' | 'denied') => void;

  clearAllLocalData: () => number;
}

const StoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({
  children,
  initialData = null,
}: {
  children: ReactNode;
  initialData?: SiteData | null;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<AppStore['status']>(initialData ? 'ready' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteData['sites']>(initialData?.sites ?? []);
  const [categories, setCategories] = useState<SiteData['categories']>(initialData?.categories ?? []);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [density, setDensityState] = useState<Density>('comfortable');
  const [cursorStyle, setCursorStyleState] = useState<CursorStyle>('smooth');
  const [consent, setConsentState] = useState<Consent>(null);
  const [hydrated, setHydrated] = useState(false);
  const requestId = useRef(0);

  /* ---------- 数据加载：骨架屏 → 就绪 / 失败空态（PRD 3.1.5） ---------- */
  /*
   * `revalidate` 用于「构建期已注入数据」时的后台校验：
   * 不切到 loading —— 否则首屏会把已经渲染好的卡片换成骨架，白白闪一下。
   * 但失败仍然要进 error：PRD 3.1.5 明确要求「加载失败空态 + 重试按钮」，
   * 这个状态必须真实可达，不能因为内嵌了数据就把它藏起来。
   * 只有「手上没有任何数据」时才走完整的 骨架 → 就绪 / 失败 流程。
   */
  const load = useCallback(async (options?: { revalidate?: boolean }) => {
    const revalidate = options?.revalidate === true;
    const id = ++requestId.current;
    if (!revalidate) {
      setStatus('loading');
    }
    setError(null);
    try {
      const [sitesRes, catsRes] = await Promise.all([
        fetch('/data/sites.json', { cache: 'no-cache' }),
        fetch('/data/categories.json', { cache: 'no-cache' }),
      ]);
      if (!sitesRes.ok || !catsRes.ok) {
        throw new Error(`数据请求失败（HTTP ${sitesRes.status} / ${catsRes.status}）`);
      }
      const [rawSites, rawCats] = await Promise.all([sitesRes.json(), catsRes.json()]);
      if (id !== requestId.current) return;
      const result = loadSiteData(rawSites, rawCats);
      if (!result.ok) throw new Error(result.error);
      setSites(result.data.sites);
      setCategories(result.data.categories);
      setStatus('ready');
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setStatus('error');
      setError(err instanceof Error ? err.message : '未知错误');
    }
  }, []);

  const reload = useCallback(() => {
    void load();
  }, [load]);

  /* ---------- 首屏：读取本地偏好（水合后执行，避免 SSR/CSR 不一致） ---------- */
  useEffect(() => {
    const storedTheme = readJSON<ThemeMode>(STORAGE_KEYS.theme, isThemeMode, 'auto');
    setThemeModeState(storedTheme);
    setResolvedTheme(resolveTheme(storedTheme));
    // 水合时静默同步即可：首屏主题已由 layout 的 inline script 写好，
    // 这里再跑 View Transition 会冻结整页命中测试约 270ms，导致首点丢失。
    applyTheme(storedTheme, undefined, { animate: false });

    setDensityState(readJSON<Density>(STORAGE_KEYS.density, isDensity, 'comfortable'));
    setCursorStyleState(readJSON<CursorStyle>(STORAGE_KEYS.cursor, isCursorStyle, 'smooth'));
    setFavorites(readJSON<string[]>(STORAGE_KEYS.favorites, isStringArray, []));
    setRecent(readJSON<RecentEntry[]>(STORAGE_KEYS.recent, isRecentArray, []));

    const rawConsent = storage.get(STORAGE_KEYS.consent);
    const storedConsent: Consent = rawConsent === null ? null : readJSON(STORAGE_KEYS.consent, isConsent, 'denied');
    setConsentState(storedConsent);
    setAnalyticsConsent(storedConsent);

    setHydrated(true);
    // 有构建期数据时只做校验（不闪骨架），没有时走完整加载流程
    void load({ revalidate: Boolean(initialData) });
  }, [load, initialData]);

  /* ---------- auto 模式跟随系统（PRD 3.3） ---------- */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (themeMode !== 'auto') return;
      setResolvedTheme(systemPrefersDark() ? 'dark' : 'light');
      applyTheme('auto', undefined, { animate: false });
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [themeMode]);

  /* ---------- 多标签页同步 ---------- */
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;
      switch (event.key) {
        case STORAGE_KEYS.favorites:
          setFavorites(readJSON<string[]>(STORAGE_KEYS.favorites, isStringArray, []));
          break;
        case STORAGE_KEYS.recent:
          setRecent(readJSON<RecentEntry[]>(STORAGE_KEYS.recent, isRecentArray, []));
          break;
        case STORAGE_KEYS.theme: {
          const next = readJSON<ThemeMode>(STORAGE_KEYS.theme, isThemeMode, 'auto');
          setThemeModeState(next);
          setResolvedTheme(resolveTheme(next));
          applyTheme(next, undefined, { animate: false });
          break;
        }
        case STORAGE_KEYS.density:
          setDensityState(readJSON<Density>(STORAGE_KEYS.density, isDensity, 'comfortable'));
          break;
        case STORAGE_KEYS.cursor:
          setCursorStyleState(readJSON<CursorStyle>(STORAGE_KEYS.cursor, isCursorStyle, 'smooth'));
          break;
        default:
          break;
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* ---------- 动作 ---------- */
  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      storage.set(STORAGE_KEYS.favorites, JSON.stringify(next));
      track('favorite_toggle', { site_id: id, action: exists ? 'remove' : 'add' });
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    storage.set(STORAGE_KEYS.favorites, JSON.stringify([]));
  }, []);

  /** 导入收藏：与现有集合合并去重 */
  const mergeFavorites = useCallback((ids: string[]) => {
    setFavorites((prev) => {
      const next = Array.from(new Set([...prev, ...ids]));
      storage.set(STORAGE_KEYS.favorites, JSON.stringify(next));
      return next;
    });
  }, []);

  const pushRecent = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [{ id, at: Date.now() }, ...prev.filter((r) => r.id !== id)].slice(0, MAX_RECENT);
      storage.set(STORAGE_KEYS.recent, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    storage.set(STORAGE_KEYS.recent, JSON.stringify([]));
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode, origin?: { x: number; y: number }) => {
    setThemeModeState(mode);
    setResolvedTheme(resolveTheme(mode));
    storage.set(STORAGE_KEYS.theme, JSON.stringify(mode));
    applyTheme(mode, origin);
    track('theme_change', { theme: mode });
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    storage.set(STORAGE_KEYS.density, JSON.stringify(next));
  }, []);

  const setCursorStyle = useCallback((next: CursorStyle) => {
    setCursorStyleState(next);
    storage.set(STORAGE_KEYS.cursor, JSON.stringify(next));
  }, []);

  const setConsent = useCallback(
    (next: 'granted' | 'denied') => {
      setConsentState(next);
      storage.set(STORAGE_KEYS.consent, JSON.stringify(next));
      setAnalyticsConsent(next);
      toast({
        title: next === 'granted' ? '已允许匿名统计' : '已拒绝统计',
        description:
          next === 'granted'
            ? '仅记录页面访问、点击等聚合事件，不采集任何个人身份信息。'
            : '站点功能不受影响，只是不再发送统计事件。',
        tone: next === 'granted' ? 'success' : 'default',
      });
    },
    [toast],
  );

  const clearAllLocalData = useCallback(() => {
    const cleared = storage.clearAll();
    setFavorites([]);
    setRecent([]);
    setThemeModeState('auto');
    setDensityState('comfortable');
    setCursorStyleState('smooth');
    setConsentState(null);
    setAnalyticsConsent(null);
    applyTheme('auto', undefined, { animate: false });
    return cleared.length;
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      status,
      error,
      sites,
      categories,
      reload,
      hydrated,
      favorites,
      isFavorite,
      toggleFavorite,
      mergeFavorites,
      clearFavorites,
      recent,
      pushRecent,
      clearRecent,
      themeMode,
      resolvedTheme,
      setThemeMode,
      density,
      setDensity,
      cursorStyle,
      setCursorStyle,
      consent,
      setConsent,
      clearAllLocalData,
    }),
    [
      status,
      error,
      sites,
      categories,
      reload,
      hydrated,
      favorites,
      isFavorite,
      toggleFavorite,
      mergeFavorites,
      clearFavorites,
      recent,
      pushRecent,
      clearRecent,
      themeMode,
      resolvedTheme,
      setThemeMode,
      density,
      setDensity,
      cursorStyle,
      setCursorStyle,
      consent,
      setConsent,
      clearAllLocalData,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useAppStore 必须在 AppStoreProvider 内使用');
  return ctx;
}
