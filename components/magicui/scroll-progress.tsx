'use client';

import { motion, useScroll, type MotionValue } from 'motion/react';

import { cn } from '@/lib/cn';

/**
 * Magic UI `ScrollProgress`（https://magicui.design/docs/components/scroll-progress）
 *
 * 与注册表原版的两处关键差异：
 *
 * 1. **允许外部传入进度值**。原版内部直接用 `useScroll()`，而 `useScroll()` 在首屏
 *    骨架阶段量到的文档高度小于视口，会把进度算成 1，真实内容渲染后再回落，
 *    表现为「刚进页面顶部就有一条满格进度条」。本项目因此用显式 MotionValue
 *    在 `components/header.tsx` 里自己算（`scrollY / (scrollHeight - innerHeight)`，
 *    文档不足一屏时恒为 0）。这里保留 `useScroll()` 作为兜底，但调用方传入
 *    `progress` 时以传入值为准。
 * 2. 渐变与高度改成项目 token（原版写死 `#A97CF8 → #F38CB8 → #FDCC92` 与 `h-px`），
 *    并补 `motion-reduce` 降级：降低动效时不做 spring 追赶，直接跟随滚动。
 */
export function ScrollProgress({
  progress,
  className,
}: {
  progress?: MotionValue<number>;
  className?: string;
}) {
  const { scrollYProgress } = useScroll();
  const value = progress ?? scrollYProgress;

  return (
    <motion.span
      aria-hidden="true"
      data-testid="scroll-progress"
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left rounded-r-full',
        'bg-gradient-to-r from-primary-solid via-secondary to-primary-solid',
        'shadow-[0_0_10px_rgb(var(--c-primary)/0.55)]',
        className,
      )}
      style={{ scaleX: value }}
    />
  );
}
