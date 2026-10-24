'use client';

import { useCallback, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia(QUERY).matches;
}

/** 服务端（以及无 JS 场景）一律按「降级」处理，保证首屏内容直接可读。 */
function getServerSnapshot() {
  return true;
}

/**
 * 订阅 `prefers-reduced-motion`。
 *
 * 用 `useSyncExternalStore` 而不是 `useState` + `useEffect`：后者首帧返回 true、
 * 挂载后再 setState，等于「先按降级画一遍 → 再切回动画」，观感上会闪一下。
 * 这里注水阶段直接用真实值重算，不额外多画一帧。
 */
export function usePrefersReducedMotion(): boolean {
  const getSnapshotStable = useCallback(getSnapshot, []);
  return useSyncExternalStore(subscribe, getSnapshotStable, getServerSnapshot);
}
