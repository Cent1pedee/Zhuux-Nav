import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<'button'> {
  shimmerColor?: string;
  shimmerDuration?: string;
  borderRadius?: string;
  background?: string;
  children?: ReactNode;
}

/**
 * Magic UI ShimmerButton（https://magicui.design/docs/components/shimmer-button）。
 *
 * 相比注册表原版的三处改写：
 * 1. 原版用 Tailwind v4 的 `@container-[size]` + `h-[100cqh]` 让光斑跟随按钮尺寸，
 *    v3 没有容器查询插件，`cqh` 会退化成视口单位，光斑尺寸会明显错位。
 *    这里改成「光斑容器 `inset-0` + 光斑 `-inset-full` 用 conic-gradient 旋转」，
 *    视觉一致且不依赖容器查询。
 * 2. 原版的 `animate-shimmer-slide` / `animate-spin-around` 需要额外 keyframes，
 *    这里只保留 `spin-around`（已写进 tailwind.config.ts），并用 `motion-safe:` 前缀，
 *    让 `prefers-reduced-motion` 下自动停掉扫光。
 * 3. 补了 `disabled:` 态——项目里的提交按钮会在请求中禁用。
 */
/** 光斑扫光用的变量，`<button>` 与 `<a>` 都能用 */
export function shimmerStyle({
  shimmerColor = '#ffffff',
  shimmerDuration = '3s',
  borderRadius = '0.6rem',
  background = 'rgb(var(--c-primary-solid))',
}: Pick<ShimmerButtonProps, 'shimmerColor' | 'shimmerDuration' | 'borderRadius' | 'background'> = {}): CSSProperties {
  return {
    '--spread': '90deg',
    '--shimmer-color': shimmerColor,
    '--radius': borderRadius,
    '--speed': shimmerDuration,
    '--bg': background,
  } as CSSProperties;
}

/**
 * 主按钮的公共类名。抽出来是为了让 `next/link` 这类必须渲染成 `<a>` 的入口
 * （例如 404 页的「返回首页」）也能拿到完全一样的外观，而不是再复制一份样式。
 */
export function shimmerButtonClass(className?: string): string {
  return cn(
    'group relative z-0 inline-flex cursor-pointer items-center justify-center gap-1.5 overflow-hidden',
    // 内边距不写进基础类：Tailwind 的 px-3 与 px-4 谁生效取决于产出顺序而非书写顺序，
    // 交给调用方显式指定，避免「传了 px-3 却被 px-4 覆盖」的隐性样式 bug。
    'rounded-[var(--radius)] border border-white/15 whitespace-nowrap',
    'text-[13px] font-medium text-white [background:var(--bg)]',
    'transition-[filter,box-shadow,transform] duration-200 ease-silk',
    'hover:brightness-110 active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-60',
    className,
  );
}

/**
 * 按钮内部的扫光层 + 内容层。单独导出，让必须渲染成 `<a>` 的入口
 * （例如 404 页用 `next/link` 的「返回首页」）复用同一套结构，不必把标记复制一遍。
 */
export function ShimmerLayers({ children }: { children: ReactNode }) {
  return (
    <>
      {/* 扫光：一圈 conic-gradient 在按钮内部缓慢旋转（渐变用内联样式，避免任意值类名转义问题） */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-30 overflow-hidden rounded-[inherit]">
        <span
          className="motion-safe:animate-spin-around absolute -inset-full opacity-45"
          style={{
            background:
              'conic-gradient(from calc(270deg - (var(--spread) * 0.5)), transparent 0, var(--shimmer-color) var(--spread), transparent var(--spread))',
          }}
        />
      </span>
      {/* 内高光：悬停时略亮，给按下前的「可点」暗示 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_-6px_10px_#ffffff1f] transition-shadow duration-300 ease-silk group-hover:shadow-[inset_0_-6px_12px_#ffffff33]"
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">{children}</span>
    </>
  );
}

export function ShimmerButton({
  shimmerColor = '#ffffff',
  shimmerDuration = '3s',
  borderRadius = '0.6rem',
  background = 'rgb(var(--c-primary-solid))',
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      data-shimmer="true"
      style={shimmerStyle({ shimmerColor, shimmerDuration, borderRadius, background })}
      className={shimmerButtonClass(className)}
      {...props}
    >
      <ShimmerLayers>{children}</ShimmerLayers>
    </button>
  );
}
