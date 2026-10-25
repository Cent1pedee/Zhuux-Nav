'use client';

import { motion } from 'motion/react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/*
 * Magic UI ShinyButton（改写版）
 *
 * 与注册表原版的差别：
 * 1. 原版类名里大量 Tailwind v4 语法（`dark:bg-[radial-gradient(...var(--primary)/10%...)]`、
 *    `hover:shadow-[0_0_20px_var(--primary)/10%]`、`text-[rgb(0,0,0,65%)]`），v3 下这些写法
 *    要么不产出、要么生成非法颜色。这里全部改为内联 style + 项目自己的 CSS 变量。
 * 2. 原版用 CSS 变量 `--x` 做遮罩扫光，但 `initial` 里传的是字符串 `"100%"`，
 *    Motion 在 v3 下对这个自定义属性的插值不稳定；改为用 `backgroundPosition` 过渡，
 *    效果一致且不会出现「扫到一半卡住」。
 * 3. 补 `disabled` 与 `focus-visible` 态——原版没有，键盘用户看不到焦点。
 * 4. 文字不做 `uppercase`：中文没有大小写，加 `uppercase` 只影响数字与英文站名，反而突兀。
 */

interface ShinyButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  children: ReactNode;
  className?: string;
}

export function ShinyButton({ children, className, ...props }: ShinyButtonProps) {
  return (
    <motion.button
      type="button"
      data-shiny="true"
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-full border border-primary/35',
        'bg-[rgb(var(--c-primary)/0.10)] px-4 py-1.5 text-[13px] font-medium text-ink',
        'transition-colors duration-300 hover:border-primary/60 hover:bg-[rgb(var(--c-primary)/0.16)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
      {...(props as ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {/* 扫光层：一条 120° 的亮带从左扫到右，每 3.6s 一轮 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 motion-safe:animate-shiny-sweep motion-reduce:animate-none"
        style={{
          backgroundImage:
            'linear-gradient(-75deg, transparent 30%, rgb(var(--c-primary) / 0.55) 50%, transparent 70%)',
          backgroundSize: '220% 100%',
        }}
      />
      {/* 顶部内高光，让按钮有一点玻璃感 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
