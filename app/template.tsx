/**
 * 路由切换时的页面入场（PRD 7.4）。
 *
 * template.tsx 与 layout.tsx 的区别：template 会在每次导航时重新挂载，
 * 因此入场动画天然只在该页首次进入时播放一次，不会因状态更新反复触发。
 *
 * 这里刻意用 **CSS 动画**而不是 Motion 的 `initial`：
 * Motion 会把 `initial` 的内联样式写进 SSR 产物（`opacity: 0`），
 * 一旦 JS 未加载或执行失败，整页就是不可见的，违反 PRD 4.4「无 JS 时内容仍可访问」。
 * CSS keyframes 的终态由样式表决定，脚本缺失时元素依然可见。
 * `prefers-reduced-motion` 的降级统一在 globals.css 里处理。
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
