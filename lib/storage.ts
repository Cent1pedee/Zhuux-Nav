import type { Consent, CursorStyle, Density, RecentEntry, ThemeMode } from './types';

/**
 * localStorage 安全封装：隐私模式 / 禁用 Cookie / 配额超限时静默降级为内存存储，
 * 不抛错、不打断交互（PRD 4.4「localStorage 不可用时静默降级」）。
 */
export const STORAGE_KEYS = {
  theme: 'nav.theme',
  density: 'nav.density',
  favorites: 'nav.favorites',
  recent: 'nav.recent',
  consent: 'nav.consent',
  feedback: 'nav.feedback',
  cursor: 'nav.cursor',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const memory = new Map<string, string>();
let available: boolean | null = null;

function detect(): boolean {
  if (available !== null) return available;
  if (typeof window === 'undefined') return false;
  try {
    const probe = '__nav_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

export const storage = {
  get available(): boolean {
    return detect();
  },
  get(key: StorageKey): string | null {
    if (detect()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        /* fallthrough */
      }
    }
    return memory.get(key) ?? null;
  },
  set(key: StorageKey, value: string): void {
    memory.set(key, value);
    if (detect()) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* 配额超限等：内存副本仍然生效 */
      }
    }
  },
  remove(key: StorageKey): void {
    memory.delete(key);
    if (detect()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  },
  /** 「清除所有本地数据」入口使用（PRD 4.7） */
  clearAll(): string[] {
    const cleared: string[] = [];
    for (const key of Object.values(STORAGE_KEYS)) {
      if (this.get(key) !== null) cleared.push(key);
      this.remove(key);
    }
    return cleared;
  },
};

export function readJSON<T>(key: StorageKey, guard: (v: unknown) => v is T, fallback: T): T {
  const raw = storage.get(key);
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/* ---------- 各字段的类型守卫 ---------- */

export const isThemeMode = (v: unknown): v is ThemeMode =>
  v === 'light' || v === 'dark' || v === 'auto';

export const isDensity = (v: unknown): v is Density => v === 'comfortable' || v === 'compact';

export const isCursorStyle = (v: unknown): v is CursorStyle => v === 'default' || v === 'smooth';

export const isConsent = (v: unknown): v is Exclude<Consent, null> =>
  v === 'granted' || v === 'denied';

export const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

export const isRecentArray = (v: unknown): v is RecentEntry[] =>
  Array.isArray(v) &&
  v.every(
    (x) =>
      typeof x === 'object' &&
      x !== null &&
      typeof (x as RecentEntry).id === 'string' &&
      typeof (x as RecentEntry).at === 'number',
  );
