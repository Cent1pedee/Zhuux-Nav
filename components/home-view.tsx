'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { SiteGrid } from '@/components/site-grid';
import { ShinyButton } from '@/components/magicui/shiny-button';
import { CategoryNav, CurrentScope } from '@/components/category-nav';
import { FavoritesStrip, RecentStrip } from '@/components/dialogs';
import { useAppStore } from '@/components/providers/app-store';
import { useUi } from '@/components/providers/ui';
import { useToast } from '@/components/providers/toast';
import { filterSites } from '@/lib/data';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { cn } from '@/lib/cn';
import { subscribeLocationChange } from '@/lib/history';
import { StarIcon, ClockIcon, GridIcon, RowsIcon, SearchIcon } from '@/components/icons';

interface HomeViewProps {
  /** 由分类页固定传入，锁定该分类（PRD 4.2 静态分类路由） */
  lockedCategory?: string;
  heading: string;
  intro?: string;
}

/**
 * 首页 / 分类页共用的主体视图。
 *
 * 分类采用「单选导航」语义（而非多选筛选）：点击一级分类只看该分类，
 * 点击二级分类只看该二级分类，标题同步显示「一级 · 二级」，符合导航站的操作习惯。
 */
export function HomeView({ lockedCategory, heading, intro }: HomeViewProps) {
  const { sites, categories, status, reload, density, setDensity, favorites } = useAppStore();
  const { openSettings, openFeedback, openSearch } = useUi();
  const { toast } = useToast();
  const pathname = usePathname();

  /*
   * 查询串刻意不用 next/navigation 的 useSearchParams：
   * 该 hook 会把整棵子树推进 Suspense 边界，`output: 'export'` 下静态 HTML
   * 里就只剩骨架（实测 out/index.html 的卡片数为 0），
   * 于是「禁用 JS 也能看到站点」这条彻底失效。
   * 这里自己从 window.location 读，SSR 首帧为空串、水合后再同步，
   * 既能保留真实卡片，也不影响深链接解析。
   */
  const [searchKey, setSearchKey] = useState('');

  const [categoryId, setCategoryId] = useState<string | null>(lockedCategory ?? null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  /*
   * 同步查询串：首次挂载、客户端路由切换（pathname 变化）、浏览器前进后退，
   * 以及 Next <Link> 走的 pushState（不会触发 popstate，见 lib/history.ts）。
   * 这一条是「点 Logo 回首页要清空侧栏分类」的关键：
   * 从 /?c=design 到 / 时 pathname 不变、只有查询串变，只监听 pathname 会漏掉。
   */
  useEffect(() => {
    const sync = () => setSearchKey(window.location.search);
    sync();
    return subscribeLocationChange(sync);
  }, [pathname]);

  /*
   * 切换分类后把视口带回内容顶部。
   *
   * 不做这一步的话：用户滚到页面中段点侧栏分类，卡片从 76 张缩到 12 张，
   * 文档高度骤降、浏览器把 scrollY 夹到新的最大值，结果停在「标题已被滚出视口、
   * 第一行卡片只剩半截」的位置（实测 firstTop = -193px），看起来像点错了。
   *
   * 注意必须用「瞬时滚动」而不是 smooth：卡片数量变化会在同一帧把文档高度改小，
   * 平滑滚动途中目标位置超出新的最大滚动量，会被浏览器直接夹断（实测停在 y=393）。
   */
  const scrollToTop = useCallback(() => {
    const node = topRef.current;
    if (!node) return;
    const headerOffset = 76; // 吸顶栏 + 一点呼吸感
    const top = Math.max(0, node.getBoundingClientRect().top + window.scrollY - headerOffset);
    // globals.css 给 html 设了 scroll-behavior: smooth（供页内锚点用），
    // 它会覆盖 scrollTo 的 behavior: 'auto'，让这里也变成平滑滚动；
    // 必须临时改成 auto 才能真正瞬移到位。
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top });
    root.style.scrollBehavior = previous;
  }, []);

  /*
   * URL → 状态：以真实导航为准（首次进入、深链接、浏览器前进后退、
   * 点 Logo 回首页、分类页之间跳转）。
   *
   * 这里用 pathname + 查询串作为依赖，而不是只读一次：客户端路由从
   * `/category/dev-tools/` 回到 `/` 时组件并不会卸载，只读一次会让侧栏
   * 停留在上一个分类，出现「URL 已经是全部站点、标题还是某个分类」的错位。
   * 自己写 URL 用的是 history.replaceState，不会触发 Next 的路由更新，
   * 所以不会与本 effect 形成回环。
   */
  useEffect(() => {
    if (lockedCategory) return;
    // 数据未就绪时不做解析；categories 进入依赖，就绪后会自动再跑一次
    if (categories.length === 0) return;
    const params = new URLSearchParams(searchKey);
    const subId = params.get('s');
    // 只带 ?s= 的深链接（如 /?s=git）也要能还原：二级分类 id 全局唯一，反查所属一级分类
    const category =
      categories.find((item) => item.id === params.get('c')) ??
      categories.find((item) => item.subcategories.some((sub) => sub.id === subId)) ??
      null;
    setCategoryId(category?.id ?? null);
    setSubcategoryId(category?.subcategories.find((item) => item.id === subId)?.id ?? null);
  }, [categories, lockedCategory, pathname, searchKey]);

  /*
   * 状态 → URL：只在「用户主动选择」时写，用 history.replaceState 而非 router.replace。
   * 理由：写 URL 若放在 effect 里，会在首屏解析深链接之前先把查询串清空
   * （?c=dev-tools&s=git 直接被抹成 /），也会与 router 的更新互相触发。
   */
  const writeUrl = useCallback(
    (nextCategory: string | null, nextSub: string | null) => {
      const params = new URLSearchParams();
      if (!lockedCategory && nextCategory) params.set('c', nextCategory);
      if (nextSub) params.set('s', nextSub);
      const query = params.toString();
      const next = query ? `${pathname}?${query}` : pathname;
      const current = `${pathname}${window.location.search}`;
      if (next !== current) window.history.replaceState(null, '', next);
    },
    [lockedCategory, pathname],
  );

  const activeCategory = useMemo(() => {
    const id = lockedCategory ?? categoryId;
    return categories.find((category) => category.id === id) ?? null;
  }, [categories, categoryId, lockedCategory]);

  /**
   * 由二级分类反查它所属的一级分类。
   *
   * 侧栏的二级分类在「全部站点」状态下也能展开并点击，此时没有已选一级分类，
   * 只 setSubcategoryId 会让 activeCategory 为 null → activeSub 恒为 null →
   * 过滤条件落回「全部站点」，表现就是「点了子分类没反应」。
   */
  const findCategoryOfSub = useCallback(
    (subId: string) =>
      categories.find((category) => category.subcategories.some((sub) => sub.id === subId)) ?? null,
    [categories],
  );

  const activeSub = useMemo(() => {
    if (!subcategoryId) return null;
    return activeCategory?.subcategories.find((sub) => sub.id === subcategoryId) ?? null;
  }, [activeCategory, subcategoryId]);

  const visible = useMemo(() => {
    if (!activeCategory) return sites;
    if (!activeSub) {
      return filterSites(sites, { categories: [activeCategory.id], subcategories: [] });
    }
    return filterSites(sites, {
      categories: [activeCategory.id],
      subcategories: [activeSub.id],
    });
  }, [activeCategory, activeSub, sites]);

  /* 标题按「一级 · 二级」层级展示；未选中任何分类时沿用页面标题 */
  const pageTitle = activeCategory
    ? activeSub
      ? `${activeCategory.name} · ${activeSub.name}`
      : // 分类页（路由锁定）沿用页面标题「XX导航」，首页侧栏选择则显示分类名
        lockedCategory
        ? heading
        : activeCategory.name
    : heading;

  const selectCategory = useCallback(
    (id: string) => {
      if (lockedCategory) {
        toast({
          title: `当前为「${categories.find((c) => c.id === id)?.name ?? id}」分类页`,
          description: '点左上角 Logo 或侧栏「全部站点」可回到首页跨分类浏览。',
        });
        return;
      }
      // 单选导航语义：点击一级分类总是进入该分类（不做「再点一次取消」的开关行为，
      // 否则已选中的分类被点一下会变成「什么都没发生」，让人以为点击失效）
      setCategoryId(id);
      setSubcategoryId(null);
      writeUrl(id, null);
      requestAnimationFrame(scrollToTop);
    },
    [categories, lockedCategory, scrollToTop, toast, writeUrl],
  );

  const selectSubcategory = useCallback(
    (id: string) => {
      // 选二级分类必须连带确定它所属的一级分类，否则标题、面包屑与过滤条件都无从推导
      const owner = findCategoryOfSub(id);
      if (!owner) return;
      if (!lockedCategory) setCategoryId(owner.id);
      setSubcategoryId(id);
      writeUrl(owner.id, id);
      requestAnimationFrame(scrollToTop);
    },
    [findCategoryOfSub, lockedCategory, scrollToTop, writeUrl],
  );

  const clearScope = useCallback(() => {
    if (!lockedCategory) setCategoryId(null);
    setSubcategoryId(null);
    writeUrl(null, null);
    requestAnimationFrame(scrollToTop);
  }, [lockedCategory, scrollToTop, writeUrl]);

  const hasScope = Boolean(activeCategory || activeSub);

  return (
    /* ref 挂在整个内容区（含移动端分类 chips）上：
       若只滚到右侧内容列，移动端的 chips 会被吸顶栏盖住，用户就再也点不到分类了 */
    <div ref={topRef} data-testid="content-top" className="md:flex md:gap-6 scroll-mt-[68px]">
      <aside className="md:w-56 md:shrink-0">
        <div className="md:sticky md:top-[84px] md:max-h-[calc(100vh-100px)] md:overflow-y-auto md:pb-2 md:pr-1 no-scrollbar">
          <CategoryNav
            categories={categories}
            activeCategory={activeCategory?.id ?? null}
            activeSubcategory={activeSub?.id ?? null}
            onSelectCategory={selectCategory}
            onSelectSubcategory={selectSubcategory}
            onClear={clearScope}
            totalCount={sites.length}
            visibleCount={visible.length}
          />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-page-title text-ink" data-testid="page-title">
              {/*
               * 标题切换只做位移、不做透明度动画：
               * 淡入过程中文本与背景混合会短暂低于 4.5:1，axe 扫描会判为对比度违规。
               */}
              <motion.span
                key={pageTitle}
                initial={{ y: 8 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                {pageTitle}
              </motion.span>
            </h1>
            <p className="mt-1 text-meta text-muted">
              {intro ??
                (hasScope && visible.length === 0 ? (
                  // 空分类下再写「0 个站点 · 点击卡片打开」是自相矛盾的引导，换一句说明
                  <>
                    这个分类暂时还没有收录站点，可以
                    <button
                      type="button"
                      onClick={clearScope}
                      className="mx-1 font-medium text-primary-ink underline-offset-2 hover:underline"
                    >
                      查看全部站点
                    </button>
                    或直接搜索。
                  </>
                ) : (
                  <>
                    {/* 切分类时数字滚动到新值，比整段文字硬替换更容易被眼睛跟上 */}
                    <NumberTicker
                      value={hasScope ? visible.length : sites.length}
                      duration={0.6}
                      className="font-medium text-ink"
                    />
                    {' 个站点 · 点击卡片在新窗口打开'}
                  </>
                ))}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openSearch()}
              className="group relative flex items-center gap-1.5 overflow-hidden rounded-lg border border-line px-2.5 py-1.5 text-[13px] text-muted transition-[color,background-color,border-color,box-shadow] duration-200 ease-silk hover:border-primary/40 hover:bg-surface/70 hover:text-ink hover:shadow-[0_8px_20px_-16px_rgb(var(--c-primary)/0.9)]"
            >
              <SearchIcon size={13} className="relative transition-transform duration-200 ease-silk group-hover:scale-110" />
              <span className="relative">搜索</span>
              {/* 触屏没有物理键盘，小屏不显示快捷键提示 */}
              <kbd className="relative hidden rounded border border-line px-1 font-mono text-[12px] transition-colors group-hover:border-primary/40 group-hover:text-primary-ink md:inline">
                ⌘K
              </kbd>
            </button>
            <div
              role="group"
              aria-label="布局密度"
              className="flex items-center rounded-lg border border-line p-0.5"
            >
              {(
                [
                  { value: 'comfortable', icon: <GridIcon size={13} />, label: '舒适布局（4 列）' },
                  { value: 'compact', icon: <RowsIcon size={13} />, label: '紧凑布局（6 列）' },
                ] as const
              ).map((option) => {
                const on = density === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDensity(option.value)}
                    aria-pressed={on}
                    aria-label={option.label}
                    data-testid={`density-${option.value}`}
                    className={cn(
                      'relative grid h-7 w-8 place-items-center rounded-md transition-[color,transform] duration-200 ease-silk active:scale-90',
                      on ? 'text-primary-ink' : 'text-muted hover:text-ink',
                    )}
                  >
                    {/* 选中底色用 layoutId 滑块在「舒适 / 紧凑」之间平滑迁移 */}
                    {on ? (
                      <motion.span
                        layoutId="density-active"
                        aria-hidden="true"
                        className="absolute inset-0 rounded-md bg-primary/15"
                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      />
                    ) : null}
                    <span className="relative">{option.icon}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* AnimatePresence 让「返回全部」时面包屑是淡出而非瞬间消失 */}
          <AnimatePresence initial={false} mode="wait">
            <CurrentScope
              key={activeCategory ? `${activeCategory.id}-${activeSub?.id ?? ''}` : 'none'}
              category={activeCategory}
              subcategory={activeSub}
              onClear={clearScope}
              showClear={!lockedCategory}
            />
          </AnimatePresence>
        </div>

        {!lockedCategory ? (
          <>
            <FavoritesStrip onOpenSettings={openSettings} />
            <RecentStrip onOpenSettings={openSettings} />
          </>
        ) : null}

        <SiteGrid
          sites={visible}
          categories={categories}
          totalCount={sites.length}
          onClearFilters={clearScope}
          onFeedback={(site) => openFeedback(site)}
          onRetry={reload}
        />

        {status === 'ready' ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-line/80 px-3.5 py-3 text-[13px] text-muted transition-colors duration-300 ease-silk hover:border-primary/30">
            <span className="flex items-center gap-1.5">
              <StarIcon size={12} className="text-amber-400" />
              已收藏 {favorites.length} 个站点 · 浏览记录自动保留最近 10 条
            </span>
            <span className="flex items-center gap-3">
              <ShinyButton
                data-testid="recommend-site"
                onClick={() => openFeedback()}
                className="px-3 py-1 text-[13px]"
              >
                推荐新站点
              </ShinyButton>
              <button
                type="button"
                onClick={openSettings}
                className="group flex items-center gap-1 transition-colors duration-200 hover:text-primary-ink"
              >
                <ClockIcon size={11} /> 数据与偏好
              </button>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
