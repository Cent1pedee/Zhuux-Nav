'use client';

import { useRef } from 'react';
import { motion, useInView, type Transition } from 'motion/react';
import { cn } from '@/lib/cn';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

export interface BorderBeamProps {
  /** 光束长度（px） */
  size?: number;
  /** 绕边框一圈的时长（秒） */
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  className?: string;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
  /**
   * 光束两端渐隐，呈现「彗星」质感。
   * 对应官方「2 Border Beams」示例里 `from-transparent via-X to-transparent` 的写法。
   */
  fade?: boolean;
}

/**
 * Magic UI 的 BorderBeam（https://magicui.design/docs/components/border-beam）。
 * 仅用于「推荐位」卡片（PRD 7.6：Magic UI 效果仅推荐位使用）。
 *
 * 相对注册表原版改了五处：
 * 1. 原版用了 Tailwind v4 的 `bg-linear-to-l` / `from-(--color-from)` / `mask-intersect` /
 *    `border-(length:--x)`，本项目是 Tailwind 3.4，这些类名不存在，改用内联样式表达；
 * 2. 原版不判断 `prefers-reduced-motion`，本项目要求降级为 0ms，这里只渲染静态描边；
 * 3. 原版无条件无限动画：每个推荐位都要跑两条光束，持续占用合成器会拖慢滚动。
 *    这里用 `useInView` 把动画限制在进入视口的卡片上；
 * 4. 新增 `fade`：把光束两端做成透明，复刻官方「2 Border Beams」示例里
 *    `from-transparent via-X to-transparent` 的彗星尾巴质感；
 * 5. 导出接口与注册表保持一致，方便日后升级。
 */
export function BorderBeam({
  className,
  size = 110,
  delay = 0,
  duration = 6,
  colorFrom = '#8B5CF6',
  colorTo = '#3B82F6',
  transition,
  reverse = false,
  initialOffset = 0,
  borderWidth = 2,
  fade = false,
}: BorderBeamProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { margin: '160px' });
  const animate = !reduced && inView;

  // 官方示例的渐变方向是 `to left`：起点 colorFrom → 中段 colorTo → 末端透明。
  // fade 时把起点也换成透明，于是只剩中间一段实色，两端自然淡出成拖尾。
  const beamGradient = fade
    ? `linear-gradient(to left, transparent, ${colorFrom} 28%, ${colorTo} 62%, transparent)`
    : `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`;

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-testid="border-beam"
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit]',
        className,
      )}
      style={{
        padding: borderWidth,
        // 双层遮罩：内容区透明 + 边框区可见，只在边框那一圈露出发光光束
        background: animate
          ? undefined
          : `linear-gradient(120deg, ${colorFrom}55, ${colorTo}44 45%, transparent 75%)`,
        // 两层遮罩必须显式指定 clip：第一层只盖内容区、第二层盖整个盒子，
        // 再用 exclude 相减，才剩下那一圈 1px 的边框。
        // 若两层都用默认的 border-box，相减结果为空 —— 整圈光束会完全不可见。
        maskImage: 'linear-gradient(#000, #000), linear-gradient(#000, #000)',
        WebkitMaskImage: 'linear-gradient(#000, #000), linear-gradient(#000, #000)',
        maskClip: 'content-box, border-box',
        WebkitMaskClip: 'content-box, border-box',
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
        borderRadius: 'inherit',
      }}
    >
      {animate ? (
        <motion.span
          className="absolute aspect-square rounded-full"
          style={{
            width: size,
            offsetPath: 'rect(0 auto auto 0 round 12px)',
            // 光束本身是 size×size 的方块，但被父级遮罩裁成只有边框那一圈可见，
            // 于是呈现为「一段贴着边框滑动的亮线」。加模糊让它更像光而不是色块。
            backgroundImage: beamGradient,
            filter: 'blur(1px)',
            boxShadow: `0 0 10px 1px ${colorTo}66`,
          }}
          initial={{ offsetDistance: `${initialOffset}%` }}
          animate={{
            offsetDistance: reverse
              ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
              : [`${initialOffset}%`, `${100 + initialOffset}%`],
          }}
          transition={{ repeat: Infinity, ease: 'linear', duration, delay: -delay, ...transition }}
        />
      ) : null}
    </span>
  );
}
