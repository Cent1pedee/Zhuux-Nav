import { siteConfig } from './config';
import type { AnalyticsEvent, AnalyticsEventName } from './types';

/**
 * 埋点（PRD 4.6）：隐私友好、异步、同意后才上报。
 * - 未授权 / DNT 开启时只计数不发送，绝不写入任何持久化标识。
 * - 不采集 URL 查询参数、不采集跨站标识、不写 Cookie。
 * - 本地调试缓冲区 window.__NAV_ANALYTICS__ 供 E2E 断言使用（无个人信息）。
 */
declare global {
  interface Window {
    __NAV_ANALYTICS__?: AnalyticsEvent[];
    __NAV_ANALYTICS_BLOCKED__?: number;
  }
}

let allowed = false;
let initialized = false;

export function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const dnt =
    navigator.doNotTrack ??
    (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack ??
    (window as Window & { doNotTrack?: string }).doNotTrack;
  return dnt === '1' || dnt === 'yes';
}

export function setAnalyticsConsent(consent: 'granted' | 'denied' | null): void {
  allowed = consent === 'granted' && !isDoNotTrackEnabled();
  if (allowed && !initialized) {
    initialized = true;
    track('page_view', { path: window.location.pathname });
  }
}

export function analyticsAllowed(): boolean {
  return allowed;
}

export function track(
  name: AnalyticsEventName,
  props: Record<string, string | number | boolean | undefined> = {},
): void {
  if (!allowed) {
    if (typeof window !== 'undefined') {
      window.__NAV_ANALYTICS_BLOCKED__ = (window.__NAV_ANALYTICS_BLOCKED__ ?? 0) + 1;
    }
    return;
  }
  const event: AnalyticsEvent = { name, props, at: Date.now() };
  if (typeof window !== 'undefined') {
    window.__NAV_ANALYTICS__ = [...(window.__NAV_ANALYTICS__ ?? []), event].slice(-100);
  }
  const endpoint = siteConfig.analytics.endpoint;
  if (!endpoint) return; // 未配置服务端时仅保留本地调试缓冲区
  try {
    void fetch(endpoint, {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'event', name, props, url: window.location.pathname }),
    }).catch(() => {
      /* 埋点失败不得影响交互 */
    });
  } catch {
    /* ignore */
  }
}
