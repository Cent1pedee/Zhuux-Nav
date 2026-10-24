'use client';

import { useEffect, useState } from 'react';

/**
 * 订阅 `prefers-reduced-motion`。
 * 首帧一律返回 true（当作「降级」），避免服务端渲染与客户端首帧不一致时
 * 先播放动画再突然停掉；挂载后立刻读真实值并持续监听系统设置变化。
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return reduced;
}
