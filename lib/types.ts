/** 全站共享类型定义（PRD 4.5 要求 TypeScript 类型约束） */

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';
export type Consent = 'granted' | 'denied' | null;

export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  subcategories: Subcategory[];
}

export interface Site {
  id: string;
  name: string;
  url: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  featured?: boolean;
  icon?: string;
}

export interface RecentEntry {
  id: string;
  /** 毫秒时间戳 */
  at: number;
}

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone?: 'default' | 'success' | 'error';
  leaving?: boolean;
}

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
}

export interface SearchHit {
  site: Site;
  score: number;
}

export type AnalyticsEventName =
  | 'page_view'
  | 'site_click'
  | 'search'
  | 'favorite_toggle'
  | 'theme_change';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  props: Record<string, string | number | boolean | undefined>;
  at: number;
}
