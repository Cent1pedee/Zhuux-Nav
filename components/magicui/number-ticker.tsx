'use client';

import { useEffect, useRef } from 'react';
import { animate } from 'motion/react';

import { cn } from '@/lib/cn';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

interface NumberTickerProps extends React.ComponentPropsWithoutRef<'span'> {
  /** 最终显示的数值 */
  value: number;
  /** 动画起始值 */
  startValue?: number;
  /** 动画时长（秒） */
  duration?: number;
  /** 开始前的延迟（秒） */
  delay?: number;
  decimalPlaces?: number;
}

const formatNumber = (value: number, decimalPlaces: number) =>
  Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(value.toFixed(decimalPlaces)));

/**
 * 数字滚动（Magic UI NumberTicker）。
 *
 * 与上游实现的差别（有意为之）：
 * 上游把 `startValue`（默认 0）渲染成初始文本，于是**静态 HTML 里是「0 个站点」**，
 * 禁用 JS 或首屏水合前读到的都是错的。这里让服务端直接渲染最终值，
 * 水合完成后再从 `startValue` 滚到 `value`——数字动画是锦上添花，
 * 不能以牺牲「无 JS 也能读到正确数字」为代价。
 *
 * 另外尊重 `prefers-reduced-motion`：降级时保持最终值，不跑动画。
 */
export function NumberTicker({
  value,
  startValue = 0,
  duration = 0.9,
  delay = 0,
  decimalPlaces = 0,
  className,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  /* 上一次停在的数字：切换分类时从这里接着滚，而不是每次从 0 重来 */
  const fromRef = useRef(startValue);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduceMotion) {
      node.textContent = formatNumber(value, decimalPlaces);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    fromRef.current = value;
    if (from === value) {
      node.textContent = formatNumber(value, decimalPlaces);
      return;
    }

    node.textContent = formatNumber(from, decimalPlaces);
    const controls = animate(from, value, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(latest) {
        node.textContent = formatNumber(latest, decimalPlaces);
      },
      onComplete() {
        node.textContent = formatNumber(value, decimalPlaces);
      },
    });

    return () => controls.stop();
  }, [value, duration, delay, decimalPlaces, reduceMotion]);

  return (
    <span ref={ref} className={cn('inline-block tabular-nums', className)} {...props}>
      {formatNumber(value, decimalPlaces)}
    </span>
  );
}
