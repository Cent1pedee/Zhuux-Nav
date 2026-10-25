'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { ScrollProgress } from '@/components/magicui/scroll-progress';
import { cn } from '@/lib/cn';
import { siteConfig } from '@/lib/config';
import { useAppStore } from '@/components/providers/app-store';
import { useUi } from '@/components/providers/ui';
import { useToast } from '@/components/providers/toast';
import {
  SearchIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  ShareIcon,
  LogoMark,
} from '@/components/icons';

const THEME_ORDER = ['auto', 'light', 'dark'] as const;

/**
 * 顶栏图标按钮的统一样式。
 *
 * 注意：这里刻意不使用 `hover:-translate-y-*`。
 * 悬停时元素一旦位移，指针在边缘处会反复「进入 → 离开 → 再进入」，
 * 表现为图标来回抽搐、搜索框边框变形；改用背景色与描边变化表达悬停，
 * 位移只保留在 `active:`（按下瞬间），不会产生悬停振荡。
 */
const iconButtonClass =
  'grid h-9 w-9 place-items-center rounded-lg text-muted transition-[color,background-color,box-shadow] duration-200 ease-silk hover:bg-ink/[0.07] hover:text-ink hover:shadow-[inset_0_0_0_1px_rgb(var(--c-primary)/0.22)] active:scale-95';

/**
 * 顶栏（PRD 3.1 / 7.4）。
 *
 * 分类导航只保留一处：左侧栏（桌面）/ 顶部横向 chips（移动端）。
 * 早先顶栏里还有一套 `navLinks` 分类链接和平板专用的「分类快捷条」，
 * 与侧栏完全重复，同一屏出现两个功能相同、状态却可能不同步的入口，
 * 既挤占空间也让人分不清该点哪个。这里把它们整体移除，
 * 顶栏只保留「品牌 / 搜索 / 主题 / 分享 / 设置 / 数据状态」这类全局动作。
 * 页脚仍保留分类链接，用于站内互链与 SEO。
 */
export function Header() {
  const { themeMode, setThemeMode, resolvedTheme, status } = useAppStore();
  const { openSearch, openSettings, openShare } = useUi();
  const { toast } = useToast();
  const [scrolled, setScrolled] = useState(false);

  /*
   * 顶栏底部的阅读进度条。
   *
   * 不用 `useScroll()`：它在首屏骨架阶段量到的文档高度小于视口，进度会被算成 1，
   * 等真实内容渲染出来再回落，表现为「刚进页面顶部就有一条满格进度条」。
   * 这里改用显式 MotionValue：初始 0，滚动/尺寸变化时按 (scrollY / 可滚动高度) 计算，
   * 文档不足一屏时恒为 0；进度只驱动 transform，不触发 React 重渲染。
   */
  const rawProgress = useMotionValue(0);
  const progress = useSpring(rawProgress, { stiffness: 320, damping: 40, restDelta: 0.001 });

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      rawProgress.set(max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max)));
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [rawProgress]);

  /* 滚动下滚进入「紧凑态」、上滚恢复（PRD 7.4）
   *
   * 刻意不改导航栏高度：sticky 元素在文档流里占位，一旦高度从 60px 缩到 52px，
   * 下面的内容会跟着上移 8px —— 每次下滚都抖一下（也是 CLS 的来源），
   * 而且 scrollIntoView（键盘 Tab、锚点跳转）会反复触发收缩/展开，形成持续抖动。
   * 因此这里只改阴影、背景与副标题显隐，视觉上有「收紧」的观感，布局零位移。
   */
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    let idleTimer = 0;
    const root = document.documentElement;

    /*
     * 滚动期降载：滚动开始给 <html> 挂 data-scrolling，
     * 停止 140ms 后摘掉（配合 globals.css 里的规则）。
     *
     * 目的不是视觉，而是让滚动这段最敏感的时期少做无用功：
     * 暂停背景光斑的常驻动画、关掉卡片内部一堆 hover 过渡的样式计算。
     * 停顿后才恢复，用户感知不到，但合成线程的压力明显下降。
     */
    const markScrolling = () => {
      if (root.dataset.scrolling !== 'true') root.dataset.scrolling = 'true';
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        delete root.dataset.scrolling;
      }, 140);
    };

    const onScroll = () => {
      markScrolling();
      if (frame) return;
      // 状态更新合并到下一帧，避免每个 scroll 事件都触发一次重渲染
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (Math.abs(y - last) >= 4) {
          const goingDown = y > last;
          last = y;
          setScrolled(goingDown ? y > 80 : false);
        }
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(idleTimer);
      window.cancelAnimationFrame(frame);
      delete root.dataset.scrolling;
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  /* 全局快捷键 ⌘K / Ctrl+K 唤起搜索（PRD 7.4 命令面板） */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearch]);

  const cycleTheme = () => {
    const idx = THEME_ORDER.indexOf(themeMode);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length] ?? 'auto';
    setThemeMode(next, { x: window.innerWidth - 60, y: 40 });
    toast({
      title:
        next === 'auto'
          ? '已切换为跟随系统'
          : next === 'dark'
            ? '已切换为深色主题'
            : '已切换为浅色主题',
      description:
        next === 'auto' ? `当前系统偏好：${resolvedTheme === 'dark' ? '深色' : '浅色'}` : undefined,
    });
  };

  const ThemeIcon = themeMode === 'auto' ? MonitorIcon : themeMode === 'dark' ? MoonIcon : SunIcon;
  const themeLabel =
    themeMode === 'auto'
      ? `跟随系统（当前${resolvedTheme === 'dark' ? '深色' : '浅色'}）`
      : themeMode === 'dark'
        ? '深色主题'
        : '浅色主题';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b glass-bar transition-[box-shadow,border-color,background-color] duration-300 ease-silk',
        scrolled
          ? 'border-line/80 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.65)]'
          : 'border-line/70',
      )}
    >
      <div
        className={cn(
          'mx-auto flex h-[60px] max-w-shell items-center gap-2 px-3 sm:px-4',
        )}
      >
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-lg px-1 py-1 transition-transform duration-200 ease-silk active:scale-[0.98]"
        >
          <motion.span
            whileHover={{ rotate: -8, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="relative inline-flex"
          >
            <LogoMark size={28} />
            {/* 悬停时从 Logo 底部溢出的一层主色光晕，纯装饰 */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -bottom-1 h-2 rounded-full bg-primary-solid/40 opacity-0 blur-[6px] transition-opacity duration-300 ease-silk group-hover:opacity-100"
            />
          </motion.span>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight text-ink">{siteConfig.name}</span>
            {/* 紧凑态隐藏副标题：视觉上更「收紧」，但不改变导航栏高度，避免内容位移 */}
            <span
              className={cn(
                'hidden overflow-hidden text-[12px] text-muted transition-all duration-300 ease-silk sm:block',
                scrolled ? 'max-h-0 opacity-0' : 'max-h-4 opacity-100',
              )}
            >
              {siteConfig.tagline}
            </span>
          </span>
          {/* 无障碍：链接的可访问名必须以可见文本开头，否则 axe 判 label-content-name-mismatch。
              用 sr-only 补一个「首页」，既保留读屏语义，又让名字里包含可见文字。 */}
          <span className="sr-only">首页</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <motion.button
            type="button"
            onClick={() => openSearch()}
            data-testid="search-trigger"
            aria-keyshortcuts="Meta+K Control+K"
            aria-label="搜索站点 ⌘K"
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            className={cn(
              'group relative flex items-center gap-2 overflow-hidden rounded-lg border border-line/90 bg-surface/50 py-1.5 pl-2.5 pr-2 text-[13px] text-muted',
              'transition-[color,background-color,border-color,box-shadow] duration-200 ease-silk',
              'hover:border-primary/45 hover:bg-surface/80 hover:text-ink hover:shadow-card',
            )}
          >
            {/* 悬停时自左向右扫过的一层极淡主色，让按钮「亮一下」但不位移 */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/12 via-primary/5 to-transparent opacity-0 transition-opacity duration-300 ease-silk group-hover:opacity-100"
            />
            <SearchIcon
              size={16}
              className="relative transition-colors duration-200 group-hover:text-primary-ink"
            />
            <span className="relative hidden sm:block">搜索站点</span>
            {/* 触屏没有物理键盘，快捷键提示只在桌面显示 */}
            <kbd className="relative hidden rounded border border-line px-1.5 py-0.5 font-mono text-[12px] transition-colors duration-200 group-hover:border-primary/40 group-hover:text-primary-ink md:block">
              ⌘K
            </kbd>
          </motion.button>

          <motion.button
            type="button"
            onClick={cycleTheme}
            aria-label={`切换主题，当前：${themeLabel}`}
            title={themeLabel}
            data-testid="theme-toggle"
            whileTap={{ scale: 0.9 }}
            className={iconButtonClass}
          >
            {/* 图标随主题切换做一次「旋转 + 淡入淡出」的交接，而不是瞬间替换 */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={themeMode}
                initial={{ opacity: 0, rotate: -60, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 60, scale: 0.7 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="grid place-items-center"
              >
                <ThemeIcon size={17} />
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <button
            type="button"
            onClick={openShare}
            aria-label="分享本页"
            title="分享本页"
            className={cn(iconButtonClass, 'hidden sm:grid')}
          >
            <ShareIcon size={17} />
          </button>

          <motion.button
            type="button"
            onClick={openSettings}
            aria-label="打开设置"
            title="设置"
            data-testid="settings-trigger"
            whileTap={{ scale: 0.9 }}
            whileHover={{ rotate: 90 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={iconButtonClass}
          >
            <SettingsIcon size={17} />
          </motion.button>

          <span
            className={cn(
              'ml-1 hidden h-1.5 w-1.5 rounded-full transition-colors duration-300 xl:block',
              status === 'ready'
                ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
                : status === 'error'
                  ? 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
                  : 'animate-pulse bg-amber-500',
            )}
            role="status"
            aria-label={
              status === 'ready' ? '数据已就绪' : status === 'error' ? '数据加载失败' : '数据加载中'
            }
            title={
              status === 'ready' ? '数据已就绪' : status === 'error' ? '数据加载失败' : '数据加载中'
            }
          />
        </div>
      </div>

      {/* 阅读进度：贴顶栏下沿的一条主色细线，只动 transform，不触发布局。
          用 Magic UI 的 ScrollProgress，进度值仍由本组件算好传入
          （不能用组件内部的 useScroll：骨架阶段会把进度算成满格）。 */}
      <ScrollProgress progress={progress} />
    </header>
  );
}
