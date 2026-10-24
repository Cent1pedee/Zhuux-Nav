'use client';

import { useEffect, useRef } from 'react';

import { GridPattern } from '@/components/magicui/grid-pattern';

/**
 * 页面背景：动态渐变光斑 + 网格底纹（PRD 7.1 / 7.4 Glow 光晕 15%）。
 *
 * 为什么单独做成客户端组件：网格有一层极轻的滚动视差（比内容慢 6%），
 * 需要把滚动位置写进 CSS 变量 `--scroll-y`。
 *
 * 关键点——变量写在**这个元素自己身上**，而不是 `<html>`。
 * 自定义属性会沿 DOM 继承，写在根元素上时，每次赋值都会让整棵文档树的样式失效重算：
 * 实测（1440x900、76 张卡片、CPU 6 倍降速）滚动 2.4 秒，
 * 写在 documentElement 上要花 821ms 做样式重算，改成写在背景层自己身上后降到 380ms 以下，
 * 而且这部分失效范围被限制在「背景层 + 它的两个伪元素」，卡片与侧栏完全不参与。
 *
 * 视差本身只改 transform，不触发重排；滚动事件按 rAF 合并，停止滚动就不再写入。
 */
export function PageBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // 尊重系统「减少动态效果」：视差属于持续运动，降级时直接不启用
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let lastY = -1;

    const write = () => {
      frame = 0;
      const y = window.scrollY;
      if (y === lastY) return;
      lastY = y;
      node.style.setProperty('--scroll-y', `${Math.round(y)}px`);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(write);
    };

    write();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  /*
   * 网格底纹改用 Magic UI GridPattern（SVG `<pattern>`）：
   * 一条 `<path>` 描边 + `<rect>` 填充，比「两层 linear-gradient 平铺」少一层合成。
   * 不用它的 `squares` 高亮：随机点亮的格子会被标题与卡片压住，看着像渲染残留，
   * 背景保持均匀反而更干净。视差与径向渐隐仍套在外层 div 上（见 globals.css）。
   */
  return (
    <div ref={ref} aria-hidden="true" className="page-backdrop">
      <div className="page-backdrop-grid">
        <GridPattern width={48} height={48} />
      </div>
    </div>
  );
}
