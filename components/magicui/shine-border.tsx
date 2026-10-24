'use client';

import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 边框宽度（像素） */
  borderWidth?: number;
  /** 一轮扫光时长（秒） */
  duration?: number;
  /** 扫光颜色，可传多个 */
  shineColor?: string | string[];
}

/**
 * 绕边扫光（Magic UI ShineBorder）。
 *
 * 实现要点：用两层 mask 相减（content-box 与 border-box），
 * 只留下「边框那一圈」，再让一条 300% 宽的高光沿对角线扫过。
 * 因此它可以套在任意圆角容器里，不会盖住内容。
 *
 * 与上游的差别：`prefers-reduced-motion` 时降级为静态描边（保留颜色、不移动），
 * 并显式补 `maskClip`，否则两层 mask 的默认裁剪区相同、相减为空 → 整圈不可见。
 */
export function ShineBorder({
  borderWidth = 1,
  duration = 14,
  shineColor = '#8B5CF6',
  className,
  style,
  ...props
}: ShineBorderProps) {
  const reduceMotion = usePrefersReducedMotion();
  const colors = Array.isArray(shineColor) ? shineColor.join(',') : shineColor;

  return (
    <div
      aria-hidden="true"
      style={
        {
          '--border-width': `${borderWidth}px`,
          '--duration': `${duration}s`,
          backgroundImage: reduceMotion
            ? `linear-gradient(${colors}, ${colors})`
            : `radial-gradient(transparent, transparent, ${colors}, transparent, transparent)`,
          backgroundSize: reduceMotion ? '100% 100%' : '300% 300%',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskClip: 'content-box, border-box',
          WebkitMaskClip: 'content-box, border-box',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: 'var(--border-width)',
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full rounded-[inherit]',
        reduceMotion ? 'opacity-60' : 'animate-shine',
        className,
      )}
      {...props}
    />
  );
}
