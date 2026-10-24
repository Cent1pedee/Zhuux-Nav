'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { ChevronDownIcon, CloseIcon } from '@/components/icons';
import type { Category } from '@/lib/types';

interface CategoryNavProps {
  categories: Category[];
  /** 当前所在的一级分类（单选，null 表示全部站点） */
  activeCategory: string | null;
  /** 当前所在的二级分类（单选，null 表示该一级分类下全部） */
  activeSubcategory: string | null;
  onSelectCategory: (id: string) => void;
  onSelectSubcategory: (id: string) => void;
  onClear: () => void;
  totalCount: number;
  visibleCount: number;
}

/**
 * 分类导航栏（PRD 3.1.2）。
 *
 * 交互语义为「单选导航」而不是「多选筛选」：
 * 点一级分类 → 只看该分类；点二级分类 → 只看该二级分类，再点一次回到上一级。
 * 这样与用户对导航站的操作习惯一致，也不会出现「一级 + 二级交叉后 0 结果」的困惑。
 */
export function CategoryNav({
  categories,
  activeCategory,
  activeSubcategory,
  onSelectCategory,
  onSelectSubcategory,
  onClear,
  totalCount,
  visibleCount,
}: CategoryNavProps) {
  const [expanded, setExpanded] = useState<string[]>(() => (activeCategory ? [activeCategory] : []));

  /* 选中某个一级分类时自动展开它的二级分类 */
  useEffect(() => {
    if (!activeCategory) return;
    setExpanded((prev) => (prev.includes(activeCategory) ? prev : [...prev, activeCategory]));
  }, [activeCategory]);

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const hasScope = Boolean(activeCategory || activeSubcategory);

  /* 移动端二级 chips 的数据源：当前一级分类的二级分类 */
  const mobileSubs = activeCategory
    ? (categories.find((category) => category.id === activeCategory)?.subcategories ?? [])
    : [];

  return (
    <nav aria-label="分类导航" className="w-full">
      {/*
       * 移动端：横向滚动的一级分类。
       * 二级分类只在桌面侧栏里，小屏够不到——选中一级分类后，
       * 在下面再补一行二级 chips，否则手机上无法下钻到二级分类。
       */}
      <div
        data-testid="mobile-category-nav"
        className="mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar md:hidden"
      >
        <button
          type="button"
          onClick={onClear}
          aria-pressed={!hasScope}
          className={cn(
            'shrink-0 rounded-full border px-3.5 py-2 text-[13px] transition-[color,background-color,border-color,transform] duration-200 ease-silk active:scale-95',
            !hasScope
              ? 'border-primary/50 bg-primary/15 text-primary-ink'
              : 'border-line text-muted hover:border-primary/30 hover:text-ink',
          )}
        >
          全部
        </button>
        {categories.map((category) => {
          const on = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              aria-pressed={on}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-2 text-[13px] transition-[color,background-color,border-color,transform] duration-200 ease-silk active:scale-95',
                on
                  ? 'border-primary/50 bg-primary/15 text-primary-ink'
                  : 'border-line text-muted hover:border-primary/30 hover:text-ink',
              )}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {/* 移动端：选中一级分类后的二级 chips */}
      <AnimatePresence initial={false}>
        {activeCategory && mobileSubs.length > 0 ? (
          <motion.div
            key={activeCategory}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden md:hidden"
          >
            <div
              data-testid="mobile-subcategory-nav"
              className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
            >
              {mobileSubs.map((sub) => {
                const subOn = activeSubcategory === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onSelectSubcategory(sub.id)}
                    aria-pressed={subOn}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition-[color,background-color,border-color,transform] duration-200 ease-silk active:scale-95',
                      subOn
                        ? 'border-primary/50 bg-primary/15 text-primary-ink'
                        : 'border-line/80 text-muted hover:border-primary/30 hover:text-ink',
                    )}
                  >
                    {sub.name}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 桌面端：左侧栏 */}
      <div data-testid="desktop-category-nav" className="hidden md:block">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-[14px] font-semibold tracking-tight text-ink">分类</h2>
          <span className="font-mono text-[12px] text-muted">
            {visibleCount}/{totalCount}
          </span>
        </div>

        <button
          type="button"
          onClick={onClear}
          aria-pressed={!hasScope}
          data-testid="category-all"
          className={cn(
            'group relative mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-nav-item transition-colors duration-200 ease-silk',
            !hasScope ? 'font-medium text-primary-ink' : 'text-muted hover:text-ink',
          )}
        >
          {/* 选中态的底色由 layoutId 滑块承载：在「全部站点」与各一级分类之间平滑迁移 */}
          {!hasScope ? (
            <motion.span
              layoutId="side-active"
              aria-hidden="true"
              className="absolute inset-0 rounded-lg bg-primary/12"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:bg-ink/[0.06] group-hover:opacity-100"
            />
          )}
          <span className="relative">全部站点</span>
          <span
            className={cn(
              'relative font-mono text-[12px] transition-transform duration-200 ease-silk group-hover:scale-110',
              !hasScope ? 'text-primary-ink' : 'text-muted',
            )}
          >
            {totalCount}
          </span>
        </button>

        <ul className="space-y-0.5">
          {categories.map((category) => {
            const on = activeCategory === category.id;
            const open = expanded.includes(category.id);
            return (
              <li key={category.id}>
                <div className="group flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onSelectCategory(category.id)}
                    aria-pressed={on}
                    data-testid={`category-${category.id}`}
                    className={cn(
                      'relative flex flex-1 items-center rounded-lg px-3 py-2 text-left text-nav-item transition-colors duration-200 ease-silk',
                      on ? 'font-medium text-primary-ink' : 'text-muted hover:text-ink',
                    )}
                  >
                    {on ? (
                      <motion.span
                        layoutId="side-active"
                        aria-hidden="true"
                        className="absolute inset-0 rounded-lg bg-primary/12"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:bg-ink/[0.06] group-hover:opacity-100"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'relative mr-2.5 h-1.5 w-1.5 rounded-full transition-[background-color,box-shadow,transform] duration-300 ease-silk',
                        on
                          ? 'scale-125 bg-primary shadow-[0_0_0_3px_rgb(var(--c-primary)/0.16)]'
                          : 'bg-line group-hover:bg-primary/60',
                      )}
                    />
                    <span className="relative transition-transform duration-200 ease-silk group-hover:translate-x-0.5">
                      {category.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(category.id)}
                    aria-expanded={open}
                    aria-label={`${open ? '收起' : '展开'}${category.name}的二级分类`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted opacity-70 transition-[color,background-color,transform] duration-200 ease-silk hover:bg-ink/[0.06] hover:text-ink group-hover:opacity-100 active:scale-90"
                  >
                    <ChevronDownIcon
                      size={14}
                      className={cn('transition-transform duration-300 ease-silk', open && 'rotate-180')}
                    />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.ul
                      key="subs"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="mb-1 ml-5 mt-0.5 overflow-hidden border-l border-line/80 pl-2.5"
                    >
                      {category.subcategories.map((sub) => {
                        const subOn = activeSubcategory === sub.id;
                        return (
                          <li key={sub.id}>
                            <button
                              type="button"
                              onClick={() => onSelectSubcategory(sub.id)}
                              aria-pressed={subOn}
                              data-testid={`subcategory-${sub.id}`}
                              className={cn(
                                'relative my-0.5 w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition-[color,background-color,transform] duration-200 ease-silk',
                                subOn
                                  ? 'font-medium text-primary-ink'
                                  : 'text-muted hover:translate-x-0.5 hover:bg-ink/[0.06] hover:text-ink',
                              )}
                            >
                              {subOn ? (
                                <motion.span
                                  layoutId="side-active-sub"
                                  aria-hidden="true"
                                  className="absolute inset-0 rounded-md bg-primary/10"
                                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                />
                              ) : null}
                              <span className="relative">{sub.name}</span>
                            </button>
                          </li>
                        );
                      })}
                    </motion.ul>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/**
 * 当前分类面包屑（移动端与桌面端共用）。
 * 层级用「/」连接，末级高亮，右侧「返回全部」直接回到全部站点。
 */
export function CurrentScope({
  category,
  subcategory,
  onClear,
  showClear = true,
}: {
  category: Category | null;
  subcategory: { id: string; name: string } | null;
  onClear: () => void;
  showClear?: boolean;
}) {
  if (!category) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-wrap items-center gap-1.5"
      data-testid="current-scope"
      aria-label="当前分类"
    >
      <span className="text-[12px] text-muted">当前位置</span>
      <span className="flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[12px] text-primary-ink">
        <span>{category.name}</span>
        {subcategory ? (
          <>
            <span aria-hidden="true" className="text-primary-ink/50">
              /
            </span>
            {/* 二级分类名切换时单独做一次位移，强调「层级又深了一层」 */}
            <motion.span
              key={subcategory.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-medium"
            >
              {subcategory.name}
            </motion.span>
          </>
        ) : null}
      </span>
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          data-testid="scope-clear"
          className="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-muted transition-[color,background-color] duration-200 ease-silk hover:bg-ink/[0.06] hover:text-ink"
        >
          <CloseIcon size={11} />
          返回全部
        </button>
      ) : null}
    </motion.div>
  );
}

/** 用于「最近浏览」「收藏」区块的小标题 */
export function SectionTitle({
  children,
  count,
  action,
}: {
  children: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="flex items-baseline gap-2 text-section-title text-ink">
        {children}
        {typeof count === 'number' ? (
          <span className="font-mono text-[13px] font-normal text-muted">{count}</span>
        ) : null}
      </h2>
      {action}
    </div>
  );
}
