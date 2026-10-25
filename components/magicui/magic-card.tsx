'use client';

import { useCallback, useEffect, useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import { cn } from '@/lib/cn';

/*
 * Magic UI MagicCard（https://magicui.design/docs/components/magic-card）。
 *
 * 相对注册表原版的改写：
 *
 * 1. 去掉 next-themes 依赖。原版用 useTheme() 判断深浅色，只为决定 orb 模式的
 *    mix-blend-mode；本项目已有自己的主题系统（html.dark + CSS 变量），
 *    引入 next-themes 等于为一行三元表达式多背一个包。
 * 2. 去掉 orb 模式。它的光斑与本项目卡片上的主色光晕重复，只保留 gradient 模式。
 * 3. 颜色改用项目 token。原版依赖 shadcn 的 --color-background / --color-border，
 *    这里换成 rgb(var(--card-bg) / var(--card-alpha)) 与 rgb(var(--c-border))，
 *    顺带保住卡片的半透明「玻璃感」。
 * 4. **不写死圆角与 overflow**。原版用 rounded-[inherit] + overflow-hidden，
 *    但本项目卡片要同时容纳「绕边流光的半颗光点」与「更多菜单的浮层」，
 *    两者都需要溢出可见；圆角由调用方通过 className 指定（rounded-card）。
 * 5. 透传 ref 与其余 div 属性，让它能直接当卡片表面用（承接 hover / focus 事件）。
 *
 * 效果：指针在卡片上移动时，描边与内层柔光会跟着走（radial-gradient 的圆心
 * 绑定到 motionValue），指针离开后回到普通描边。这替代了原先手写的两层
 * `--mx/--my` 光晕 span，且描边渐变是原版没有的。
 */
export function MagicCard({
  children,
  className,
  gradientSize = 220,
  gradientFrom = 'rgb(var(--c-primary) / 0.85)',
  gradientTo = 'rgb(var(--c-secondary) / 0.55)',
  gradientColor = 'rgb(var(--c-primary) / 0.14)',
  ref,
  ...rest
}: {
  children?: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientFrom?: string;
  gradientTo?: string;
  gradientColor?: string;
  ref?: React.Ref<HTMLDivElement>;
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'ref' | 'children' | 'className'>) {
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);
  const sizeRef = useRef(gradientSize);

  useEffect(() => {
    sizeRef.current = gradientSize;
  }, [gradientSize]);

  const reset = useCallback(() => {
    mouseX.set(-sizeRef.current);
    mouseY.set(-sizeRef.current);
  }, [mouseX, mouseY]);

  useEffect(() => {
    reset();
  }, [reset]);

  /* 指针移出窗口 / 切走标签页时也要复位，否则描边会冻在最后一帧 */
  useEffect(() => {
    const handleGlobalPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) reset();
    };
    const handleBlur = () => reset();
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') reset();
    };

    window.addEventListener('pointerout', handleGlobalPointerOut);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pointerout', handleGlobalPointerOut);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [reset]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      mouseX.set(event.clientX - rect.left);
      mouseY.set(event.clientY - rect.top);
    },
    [mouseX, mouseY],
  );

  const background = useMotionTemplate`
    linear-gradient(rgb(var(--card-bg) / var(--card-alpha)) 0 0) padding-box,
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientFrom},
      ${gradientTo},
      rgb(var(--c-border) / 0.9) 100%
    ) border-box
  `;

  const overlay = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientColor},
      transparent 100%
    )
  `;

  return (
    <motion.div
      {...(rest as React.ComponentPropsWithoutRef<typeof motion.div>)}
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      className={cn('relative isolate border border-transparent', className)}
      style={{ background }}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-px z-30 rounded-[inherit] opacity-0 transition-opacity duration-300 ease-silk group-hover:opacity-100 group-focus-within:opacity-100"
        style={{ background: overlay }}
      />
      <div className="relative z-40 h-full">{children}</div>
    </motion.div>
  );
}
