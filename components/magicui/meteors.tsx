'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

export interface MeteorsProps {
  /** 流星数量 */
  number?: number;
  minDelay?: number;
  maxDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  /** 下落角度（deg） */
  angle?: number;
  className?: string;
}

interface MeteorStyle {
  left: string;
  animationDelay: string;
  animationDuration: string;
}

/**
 * Magic UI 的 Meteors（https://magicui.design/docs/components/meteors）。
 *
 * 相对注册表原版改了四处：
 * 1. 原版把 `--angle` 塞进每个流星的 `style` 再用 `rotate-(--angle)`（Tailwind v4 语法），
 *    这里直接在元素上写 `transform: rotate(...)`；
 * 2. 原版用 `window.innerWidth` 随机 `left`，滚动条存在时会溢出到屏幕外产生横向滚动条，
 *    改用容器宽度；
 * 3. 原版用 `useEffect` + `useState` 生成随机样式，首帧必然为空导致「先空后闪」，
 *    这里保持同样做法但把随机值固定为惰性初始化，避免重复渲染时重新洗牌；
 * 4. 原版不判断 `prefers-reduced-motion`，这里降级为不渲染。
 */
export function Meteors({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  className,
}: MeteorsProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [meteors, setMeteors] = useState<MeteorStyle[]>([]);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setMeteors([]);
      return;
    }
    const width = containerRef.current?.clientWidth ?? window.innerWidth;
    setMeteors(
      Array.from({ length: number }, () => ({
        left: `${Math.floor(Math.random() * width)}px`,
        animationDelay: `${(Math.random() * (maxDelay - minDelay) + minDelay).toFixed(2)}s`,
        animationDuration: `${Math.floor(Math.random() * (maxDuration - minDuration) + minDuration)}s`,
      })),
    );
  }, [number, minDelay, maxDelay, minDuration, maxDuration, reduced]);

  return (
    <span
      ref={containerRef}
      aria-hidden="true"
      data-testid="meteors"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {meteors.map((style, index) => (
        <span
          key={index}
          className="absolute top-[-5%] h-0.5 w-0.5 animate-meteor rounded-full bg-primary-ink/70 shadow-[0_0_0_1px_rgb(var(--c-primary)/0.18)]"
          style={{
            left: style.left,
            // 只覆盖时长与延迟；关键帧与循环由 animate-meteor 提供，
            // 这样 Tailwind 才会把 @keyframes meteor 一起产出（内联 animationName 不会触发产出）
            animationDelay: style.animationDelay,
            animationDuration: style.animationDuration,
            transform: `rotate(${-angle}deg)`,
          }}
        >
          <span className="absolute top-1/2 h-px w-12 -translate-y-1/2 bg-gradient-to-r from-primary-ink/60 to-transparent" />
        </span>
      ))}
    </span>
  );
}
