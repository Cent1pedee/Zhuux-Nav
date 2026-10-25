'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/components/providers/app-store';
import { useUi } from '@/components/providers/ui';
import { SiteCard } from '@/components/site-card';
import { Meteors } from '@/components/magicui/meteors';
import { ShineBorder } from '@/components/magicui/shine-border';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import { BlurFade } from '@/components/magicui/blur-fade';
import { AlertIcon, SearchIcon, SpinnerIcon } from '@/components/icons';
import type { Category, Site } from '@/lib/types';

interface SiteGridProps {
  sites: Site[];
  categories: Category[];
  /** 总站点数（用于空态文案区分「全部」与「当前分类」） */
  totalCount: number;
  onClearFilters: () => void;
  onFeedback: (site: Site) => void;
  onRetry: () => void;
}

/**
 * 站点网格（PRD 3.1.1 / 3.3.2 / 4.1）：
 * - 骨架屏 → 就绪 / 失败空态 + 重试
 * - 舒适 4 列、紧凑 6 列（移动端降级为 1/2/3 列）
 * - 卡片 stagger 入场；超过 30 张时统一淡入（PRD 7.6）
 * - 切换分类时用 Motion 的 layout 动画让卡片重排更顺滑（PRD 7.4）
 */
export function SiteGrid({
  sites,
  categories,
  totalCount,
  onClearFilters,
  onFeedback,
  onRetry,
}: SiteGridProps) {
  const { status, density } = useAppStore();
  const { openSearch } = useUi();
  const stagger = sites.length <= 30;
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const gridClass = cn(
    'grid gap-3',
    density === 'compact'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  );

  if (status === 'error') {
    return (
      <div
        data-testid="error-state"
        role="alert"
        className="glass-card flex flex-col items-center gap-3 px-6 py-14 text-center"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-red-500/15 text-red-400">
          <AlertIcon size={20} />
        </span>
        <div>
          <p className="text-[14px] font-medium text-ink">站点数据加载失败</p>
          <p className="mt-1 text-meta text-muted">
            请检查网络后重试，或稍后再访问。数据文件位于 <code className="font-mono">/data/sites.json</code>。
          </p>
        </div>
        <ShimmerButton type="button" onClick={onRetry} data-testid="retry-button" className="mt-1 px-4 py-2">
          <SpinnerIcon size={13} />
          重新加载
        </ShimmerButton>
      </div>
    );
  }

  /*
   * 只有「真的没数据」才显示骨架：
   * - status === 'loading'：运行时重新拉取数据
   * - totalCount === 0：一份站点都没有（构建期数据缺失的兜底）
   *
   * 这里刻意不再判断 `!hydrated`：构建期数据已灌进 Provider，
   * 首屏 HTML 就是真实卡片，若因水合未完成而强制渲染骨架，
   * 会让「禁用 JS 也能看到站点」这条彻底失效（骨架会一直停在那里）。
   * 注意用 totalCount 而不是 sites.length —— 后者是筛选后的结果，
   * 筛到 0 条时应走下面的空态分支，而不是退化成骨架。
   */
  if (status === 'loading' || totalCount === 0) {
    /*
     * 骨架卡片的占位高度必须贴近真实卡片（实测舒适 188px / 紧凑 176px），
     * 否则数据到达后网格会突然变高，整页内容被推下去，直接拉高 CLS（PRD 4.1 要求 < 0.1）。
     */
    const skeletonHeight = density === 'compact' ? 'h-[176px]' : 'h-[188px]';
    return (
      <div
        data-testid="grid-skeleton"
        aria-busy="true"
        aria-live="polite"
        className={gridClass}
      >
        <span className="sr-only">站点加载中…</span>
        {Array.from({ length: density === 'compact' ? 12 : 8 }).map((_, index) => (
          <div key={index} className={cn('glass-card p-4', skeletonHeight)}>
            <div className="flex items-center gap-2.5">
              <div className="skeleton h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-2/5 rounded" />
                <div className="skeleton h-2.5 w-1/4 rounded" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="skeleton h-2.5 w-full rounded" />
              <div className="skeleton h-2.5 w-3/5 rounded" />
            </div>
            <div className="mt-3 flex gap-1.5">
              <div className="skeleton h-5 w-16 rounded-md" />
              <div className="skeleton h-5 w-12 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      /* BlurFade：从模糊到清晰地浮现，比单纯淡入更有「页面反应过来了」的感觉 */
      <BlurFade>
        <div
          data-testid="empty-state"
          className="glass-card relative flex flex-col items-center gap-3 overflow-hidden px-6 py-14 text-center"
        >
          {/*
           * 空态是「什么都没有」的页面，需要一点生气：
           * 绕边扫光（Magic UI ShineBorder）+ 一层流星（Magic UI Meteors）。
           * 两者都是 aria-hidden + pointer-events-none，不影响按钮点击与读屏。
           */}
          <ShineBorder borderWidth={1} duration={9} shineColor={['#8B5CF6', '#3B82F6']} />
          <Meteors number={10} className="opacity-45" />
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-primary-ink">
            <SearchIcon size={19} />
          </span>
          <div>
            <p className="text-[14px] font-medium text-ink">没有符合条件的站点</p>
            <p className="mt-1 text-meta text-muted">
              当前分类下共 0 个结果（全部 {totalCount} 个站点）。可以回到全部站点，或用 ⌘K 直接搜索。
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <ShimmerButton type="button" onClick={onClearFilters} data-testid="empty-clear-filters" className="px-4 py-2">
              查看全部站点
            </ShimmerButton>
            {/* 空态给出的第二条出路：直接开搜索面板，不用先去点右上角的图标 */}
            <button type="button" onClick={() => openSearch()} data-testid="empty-open-search" className="btn-ghost">
              直接搜索站点
            </button>
          </div>
        </div>
      </BlurFade>
    );
  }

  /*
   * 切换分类时通过 key 重新挂载网格，让卡片重新播放入场动画。
   * 相比逐个元素的 layout 动画，这种「整组淡入」在 70+ 卡片时不会掉帧，
   * 也不会因为卡片的 hover 位移与 layout 动画叠加而产生抖动。
   */
  const scopeKey = `${density}-${sites.length}-${sites[0]?.id ?? 'none'}`;

  return (
    <motion.ul
      key={scopeKey}
      data-testid="site-grid"
      className={gridClass}
      /*
       * 整组淡入只做容器级 0.18s：卡片自身的位移入场由 CSS `animate-fade-up`
       * 承担（逐张 30ms stagger）。两者叠加时位移在前、透明度在后，
       * 视觉上是「先出现再落位」，比同时补间更干净。
       */
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      {sites.map((site, index) => (
        <SiteCard
          key={site.id}
          site={site}
          category={categoryMap.get(site.category)}
          index={index}
          stagger={stagger}
          compact={density === 'compact'}
          onFeedback={onFeedback}
        />
      ))}
    </motion.ul>
  );
}
