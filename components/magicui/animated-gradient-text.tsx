import type { ComponentPropsWithoutRef, CSSProperties } from 'react';

import { cn } from '@/lib/cn';

export interface AnimatedGradientTextProps extends ComponentPropsWithoutRef<'span'> {
  /** 渐变底色滚动一轮的秒数，越大越慢 */
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
}

/**
 * Magic UI AnimatedGradientText（https://magicui.design/docs/components/animated-gradient-text）。
 *
 * 与注册表原版的差别：
 * 1. 原版是 Tailwind v4 语法（`bg-linear-to-r`、`from-(--color-from)`、`bg-size-[...]`），
 *    v3 下这些类名不会产出任何样式，文字会直接变成透明不可见。这里改用 v3 的
 *    `bg-gradient-to-r` + `bg-[length:var(--bg-size)_100%]`，颜色走内联 `linear-gradient`。
 * 2. 原版没有降级：`prefers-reduced-motion` 下动画仍在跑。这里加 `motion-reduce:animate-none`，
 *    并且把 `--gradient-speed` 挂成变量，方便按场景调快慢。
 */
export function AnimatedGradientText({
  children,
  className,
  speed = 1,
  colorFrom = 'rgb(var(--c-primary))',
  colorTo = 'rgb(var(--c-secondary))',
  ...props
}: AnimatedGradientTextProps) {
  return (
    <span
      style={
        {
          '--bg-size': `${speed * 300}%`,
          '--gradient-speed': `${Math.max(1, 4 / Math.max(speed, 0.1))}s`,
          backgroundImage: `linear-gradient(90deg, ${colorFrom}, ${colorTo}, ${colorFrom})`,
          backgroundSize: `var(--bg-size) 100%`,
        } as CSSProperties
      }
      className={cn(
        'inline-block bg-clip-text text-transparent',
        'motion-safe:animate-gradient motion-reduce:animate-none',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
