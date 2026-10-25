'use client';

/**
 * 统一的「地址栏变化」订阅。
 *
 * 为什么不直接用 next/navigation 的 useSearchParams：
 * 该 hook 在 `output: 'export'` 的静态页面里会把整棵子树推进 Suspense 边界，
 * 构建产物 out/index.html 里只剩骨架（实测卡片数为 0），
 * 「禁用 JS 也能看到站点」这条就彻底失效了。
 *
 * 但只用 popstate 又不够：Next 的 <Link> 客户端跳转走的是 history.pushState，
 * 浏览器不会派发 popstate。典型症状是从 `/?c=design` 点 Logo 回 `/` 时
 * pathname 没变、查询串变了，状态却停在旧分类。
 *
 * 所以这里在模块加载时给 pushState / replaceState 包一层，额外派发一个
 * 自定义事件。只包一次（用 Symbol 打标记），重复 import 也不会叠加。
 */

export const LOCATION_CHANGE_EVENT = 'nav:locationchange';

const PATCHED = Symbol.for('nav.historyPatched');

type PatchableHistory = History & { [PATCHED]?: boolean };

function patchHistory() {
  if (typeof window === 'undefined') return;
  const history = window.history as PatchableHistory;
  if (history[PATCHED]) return;

  const notify = () => window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));

  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method].bind(history);
    history[method] = ((...args: Parameters<History['pushState']>) => {
      const result = original(...args);
      notify();
      return result;
    }) as History['pushState'];
  }

  history[PATCHED] = true;
}

/** 订阅地址栏变化，返回取消订阅函数 */
export function subscribeLocationChange(listener: () => void): () => void {
  patchHistory();
  window.addEventListener('popstate', listener);
  window.addEventListener(LOCATION_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(LOCATION_CHANGE_EVENT, listener);
  };
}
