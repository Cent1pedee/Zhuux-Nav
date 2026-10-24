import type { ResolvedTheme, ThemeMode } from './types';

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
}

function applyClass(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  root.dataset.theme = resolved;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

/**
 * 应用主题（PRD 7.4）：优先使用 View Transition 的 clip-path 圆形扩散，
 * 不支持时退回 300ms 全局颜色过渡；prefers-reduced-motion 下瞬时切换。
 *
 * `animate: false` 用于「水合时把内存状态同步到 DOM」这类非用户触发的场景。
 * 原因：`document.startViewTransition()` 执行期间浏览器会冻结整页的命中测试
 * （实测首屏约 270ms 内 `document.elementFromPoint()` 只能返回 <html>），
 * 用户在此时点击会直接落空，表现为「第一次点分类没反应，点第二次才行」。
 * 首屏主题已由 layout 的 inline script 写好，水合时只需要静默同步，无需动画。
 */
export function applyTheme(
  mode: ThemeMode,
  origin?: { x: number; y: number },
  options: { animate?: boolean } = {},
): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  const reduce = prefersReducedMotion() || options.animate === false;

  const point = origin ?? {
    x: Math.round(window.innerWidth / 2),
    y: Math.round(window.innerHeight / 2),
  };
  root.style.setProperty('--tx', `${point.x}px`);
  root.style.setProperty('--ty', `${point.y}px`);

  if (reduce) {
    applyClass(resolved);
    return;
  }

  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition === 'function') {
    try {
      doc.startViewTransition(() => applyClass(resolved));
      return;
    } catch {
      /* 落到兼容分支 */
    }
  }

  root.classList.add('theme-transition');
  applyClass(resolved);
  window.setTimeout(() => root.classList.remove('theme-transition'), 320);
}

/** 供 E2E 断言：当前实际生效的主题 */
export function currentResolvedTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
