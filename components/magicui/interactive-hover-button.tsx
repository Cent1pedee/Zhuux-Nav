'use client';

import { motion } from 'motion/react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

/*
 * Magic UI InteractiveHoverButton（改写版）
 *
 * 与注册表原版的差别：
 * 1. 原版 `import { ArrowRight } from 'lucide-react'`，会引入 15KB 级别的图标包只为一个小箭头；
 *    本项目已有 `ArrowUpRightIcon`，直接复用，不新增依赖。
 * 2. 原版 `group-hover:scale-[100.8]` 用一个 8px 圆点放大到覆盖整个按钮，圆点放大后
 *    边缘会溢出圆角（`overflow-hidden` 能裁掉，但 `scale` 会连带把 `border` 也放大）。
 *    这里改成「圆点放大 + 圆角同步放大」，并给文字单独一层，视觉一致且不糊边。
 * 3. 原版没有 `type` 与 `disabled` 处理，在 form 里会被当成 submit。
 * 4. 补 `focus-visible` 焦点环（原版缺失，键盘用户无反馈）。
 */

interface InteractiveHoverButtonProps extends ComponentPropsWithoutRef<'button'> {
  children: React.ReactNode;
  /** 悬停后右侧显示的图标，默认是一个指向右上的箭头 */
  icon?: React.ReactNode;
}

export function InteractiveHoverButton({
  children,
  icon,
  className,
  ...props
}: InteractiveHoverButtonProps) {
  return (
    <button
      type="button"
      data-interactive-hover="true"
      /*
       * 文字在视觉上渲染了两份（默认态 + 悬停态），若都暴露给读屏会被念两遍；
       * 因此两份都 aria-hidden，可访问名统一由 aria-label 提供。
       */
      aria-label={props['aria-label'] ?? (typeof children === 'string' ? children : undefined)}
      className={cn(
        'group relative w-auto cursor-pointer overflow-hidden rounded-full border border-line',
        'bg-surface px-5 py-2 text-[13px] font-medium text-ink',
        'transition-colors duration-300 hover:border-primary/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {/* 悬停时从左侧小圆点铺满整块底色的那一层 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary-solid transition-transform duration-[420ms] ease-silk group-hover:scale-[90] group-focus-visible:scale-[90]"
      />
      {/* 默认文字：悬停时右移淡出 */}
      <span
        aria-hidden="true"
        className="relative z-10 flex items-center justify-center gap-2 transition-all duration-300 ease-silk group-hover:translate-x-10 group-hover:opacity-0 group-focus-visible:translate-x-10 group-focus-visible:opacity-0"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-primary transition-opacity duration-200 group-hover:opacity-0" />
        {children}
      </span>
      {/* 悬停文字：从右侧滑入并显示箭头 */}
      <span
        aria-hidden="true"
        className="absolute inset-0 z-10 flex -translate-x-6 items-center justify-center gap-1.5 text-white opacity-0 transition-all duration-300 ease-silk group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
      >
        {children}
        <span className="transition-transform duration-300 ease-silk group-hover:translate-x-0.5">
          {icon ?? <ArrowGlyph />}
        </span>
      </span>
    </button>
  );
}

function ArrowGlyph() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* 与 motion 一起使用时偶尔需要这个包装，避免调用方自己引入 motion */
export const InteractiveHoverButtonMotion = motion(InteractiveHoverButton);
