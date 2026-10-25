'use client';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';

export interface ProgressiveBlurProps {
  className?: string;
  /** 遮罩高度，默认 30% */
  height?: string;
  position?: 'top' | 'bottom' | 'both';
  /** 每一层的模糊半径，层数越多过渡越顺滑（默认 8 层） */
  blurLevels?: number[];
}

/**
 * Magic UI ProgressiveBlur（https://magicui.design/docs/components/progressive-blur）。
 *
 * 用途：列表被容器裁切时，用「逐层加重的背景模糊」代替一条纯色渐隐，
 * 让下面还有内容这件事看起来像光学虚化而不是盖了一块色块。
 *
 * 与注册表原版的差别：
 * 1. 去掉原版未使用的 `children` 与 `gradient-blur` 全局类，样式全部内联，避免依赖外部 CSS。
 * 2. 原版在 `position='both'` 时 height 强制 100%，这里保留，但补了 `top`/`bottom` 的 `inset-y` 逻辑注释。
 * 3. 补 `aria-hidden` + `pointer-events-none`：它纯装饰，不能挡住下面的选项点击。
 */
export function ProgressiveBlur({
  className,
  height = '30%',
  position = 'bottom',
  blurLevels = [0.5, 1, 2, 4, 8, 16, 32, 64],
}: ProgressiveBlurProps) {
  const direction = position === 'top' ? 'to top' : 'to bottom';
  const total = blurLevels.length;

  /** 每一层负责一段很窄的过渡区，叠起来就是连续加深的模糊 */
  const maskFor = (index: number): string => {
    const start = (index / total) * 100;
    const mid = ((index + 1) / total) * 100;
    const end = Math.min(100, ((index + 2) / total) * 100);
    return `linear-gradient(${direction}, rgba(0,0,0,0) ${start}%, rgba(0,0,0,1) ${mid}%, rgba(0,0,0,1) ${end}%, rgba(0,0,0,0) ${Math.min(100, end + 100 / total)}%)`;
  };

  return (
    <div
      aria-hidden="true"
      data-testid="progressive-blur"
      data-layers={total}
      className={cn(
        'pointer-events-none absolute inset-x-0 z-10',
        className,
        position === 'top' ? 'top-0' : position === 'bottom' ? 'bottom-0' : 'inset-y-0',
      )}
      style={{ height: position === 'both' ? '100%' : height }}
    >
      {blurLevels.map((blur, index) => (
        <div
          key={blur}
          className="absolute inset-0"
          style={
            {
              zIndex: index + 1,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: maskFor(index),
              WebkitMaskImage: maskFor(index),
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
