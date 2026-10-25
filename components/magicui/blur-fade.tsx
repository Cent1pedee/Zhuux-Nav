'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

import { cn } from '@/lib/cn';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

type Direction = 'up' | 'down' | 'left' | 'right';

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  /** 动画时长（秒） */
  duration?: number;
  /** 开始前的延迟（秒） */
  delay?: number;
  /** 位移距离（像素） */
  offset?: number;
  direction?: Direction;
  /** 是否等到进入视口再播放 */
  inView?: boolean;
  blur?: string;
}

/**
 * 模糊淡入（Magic UI BlurFade）。
 *
 * 与上游实现的差别：
 * 1. `prefers-reduced-motion` 时**不切换组件结构**，只把 variants 换成「原样」，
 *    否则首帧静态、挂载后换成 motion 组件会重播一遍，视觉上闪一下。
 * 2. 首帧（服务端与客户端水合前）一律按降级渲染，保证无 JS 时内容直接可读。
 */
export function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = 'down',
  inView = false,
  blur = '6px',
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const inViewResult = useInView(ref, { once: true, margin: '-50px' });
  const visible = !inView || inViewResult;

  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const sign = direction === 'right' || direction === 'down' ? -1 : 1;

  const variants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { [axis]: offset * sign, opacity: 0, filter: `blur(${blur})` },
        visible: { [axis]: 0, opacity: 1, filter: 'blur(0px)' },
      };

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial="hidden"
      animate={visible ? 'visible' : 'hidden'}
      variants={variants}
      transition={{
        delay: reduceMotion ? 0 : 0.04 + delay,
        duration: reduceMotion ? 0 : duration,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
