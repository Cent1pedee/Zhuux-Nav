'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ShineBorder } from '@/components/magicui/shine-border';
import { ProgressiveBlur } from '@/components/magicui/progressive-blur';
import { Modal } from '@/components/ui/modal';
import { SiteIcon } from '@/components/site-card';
import { SearchIcon, SpinnerIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { categoryNameOf, hostnameOf } from '@/lib/data';
import { searchSites, splitHighlight } from '@/lib/search';
import { track } from '@/lib/analytics';
import { useAppStore } from '@/components/providers/app-store';
import type { Site } from '@/lib/types';

interface SearchCommandProps {
  open: boolean;
  onClose: () => void;
  /** 打开时预填的关键词（?q= 深链接，或「无结果」页的推荐入口） */
  initialQuery?: string;
}

export function SearchCommand({ open, onClose, initialQuery = '' }: SearchCommandProps) {
  const { sites, categories, pushRecent, isFavorite } = useAppStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState(false);
  const [moreBelow, setMoreBelow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchedRef = useRef<string>('');

  const hits = useMemo(() => searchSites(sites, query, categories, 8), [sites, query, categories]);
  const recommended = useMemo(
    () => sites.filter((s) => s.featured).slice(0, 4),
    [sites],
  );
  const display = query.trim() ? hits.map((h) => h.site) : recommended;
  const empty = query.trim().length > 0 && hits.length === 0;

  useEffect(() => {
    if (open) {
      // 打开时带上外部传入的关键词（结构化数据里声明的 ?q= 深链接要真的生效）
      if (initialQuery) setQuery(initialQuery);
      return;
    }
    setQuery('');
    setActive(0);
    setPending(false);
    searchedRef.current = '';
  }, [open, initialQuery]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  /* 输入即出结果：带 120ms 的「检索中」反馈，避免长列表时输入卡顿观感 */
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setPending(false);
      return;
    }
    setPending(true);
    const timer = window.setTimeout(() => {
      setPending(false);
      if (searchedRef.current !== q) {
        searchedRef.current = q;
        track('search', {
          keyword: q,
          result_count: searchSites(sites, q, categories, 8).length,
          clicked: false,
        });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [query, sites, categories]);

  /*
   * 鼠标点击走真实 <a>（浏览器原生跳转，支持中键 / Ctrl+点击），
   * 这里只做埋点与历史记录。
   */
  const recordOpen = useCallback(
    (site: Site) => {
      track('search', {
        keyword: query.trim(),
        result_count: hits.length,
        clicked: true,
      });
      pushRecent(site.id);
      track('site_click', {
        site_id: site.id,
        site_name: site.name,
        category: site.category,
        position: 'search',
      });
      /*
       * 延后一帧再关闭：点击/回车触发的是锚点的默认导航动作，
       * 若在同一次事件里立刻卸载弹层（锚点被移除），
       * 浏览器偶尔会丢掉这次导航，表现为「回车没反应」。
       */
      window.setTimeout(onClose, 0);
    },
    [hits.length, onClose, pushRecent, query],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (display.length === 0 ? 0 : (i + 1) % display.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (display.length === 0 ? 0 : (i - 1 + display.length) % display.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = display[active];
      if (!target) return;
      /*
       * 回车必须用 window.open：部分环境（含无头浏览器）里
       * 键盘事件期间 userActivation 可能为 false，
       * 此时对锚点调用 click() 属于不可信点击，新窗口会被静默丢弃，
       * 表现为「回车没反应」。window.open 在同一个事件回调内仍可打开。
       * 返回 null 是 noopener 的正常表现，不代表被拦截。
       */
      window.open(target.url, '_blank', 'noopener,noreferrer');
      recordOpen(target);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(Math.max(0, display.length - 1));
    }
  };

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  /*
   * 结果超过可视高度时，底部露半行会被误读成「渲染坏了」。
   * 这里在列表下方叠一层渐隐，并随滚动状态显隐：既能提示「下面还有」，
   * 也不会在结果本来就装得下时留下一道多余的阴影。
   */
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!open || !scroller) {
      setMoreBelow(false);
      return;
    }
    const measure = () => {
      const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      setMoreBelow(remaining > 4);
    };
    measure();
    scroller.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [open, display.length]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="search-title"
      widthClass="max-w-xl"
      initialFocus={inputRef}
      className="top-0"
    >
      <h2 id="search-title" className="sr-only">
        搜索站点
      </h2>
      <div className="flex items-center gap-2.5 border-b border-line/80 px-4">
        <SearchIcon size={17} className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-activedescendant={display[active] ? `search-option-${display[active]?.id}` : undefined}
          placeholder="搜索站点名称、描述或标签…"
          autoComplete="off"
          spellCheck={false}
          data-testid="search-input"
          className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/80"
        />
        {pending ? <SpinnerIcon size={15} className="text-muted" /> : null}
        <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[12px] text-muted sm:block">
          ESC
        </kbd>
      </div>

      <div ref={scrollRef} className="relative max-h-[min(60vh,440px)] overflow-y-auto p-2">
        <p className="px-2 pb-1.5 pt-1 text-[13px] font-medium uppercase tracking-wide text-muted">
          {query.trim() ? `搜索结果 · ${hits.length}` : '推荐站点'}
        </p>

        <motion.ul
          ref={listRef}
          id="search-results"
          role="listbox"
          aria-label="搜索结果"
          key={query.trim() ? 'results' : 'recommended'}
          className="flex flex-col gap-0.5"
          data-testid="search-results"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.022, delayChildren: 0.01 } },
          }}
        >
          {display.map((site, index) => {
            const categoryName = categoryNameOf(categories, site.category);
            return (
              <motion.li
                key={site.id}
                role="none"
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="option"
                  id={`search-option-${site.id}`}
                  aria-selected={index === active}
                  data-index={index}
                  data-testid="search-result"
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onClick={() => recordOpen(site)}
                  className={cn(
                    'group/option relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all duration-150 ease-silk',
                    index === active
                      ? 'bg-primary/12 shadow-[inset_0_0_0_1px_rgb(var(--c-primary)/0.28)]'
                      : 'hover:bg-ink/[0.05]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-solid transition-transform duration-200 ease-silk',
                      index === active ? 'scale-y-100' : 'scale-y-0',
                    )}
                  />
                  <SiteIcon site={site} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-medium text-ink transition-colors group-hover/option:text-primary-ink">
                        {splitHighlight(site.name, query).map((part, i) =>
                          part.hit ? (
                            <mark key={i} className="bg-transparent font-semibold text-primary-ink">
                              {part.text}
                            </mark>
                          ) : (
                            <span key={i}>{part.text}</span>
                          ),
                        )}
                      </span>
                      {isFavorite(site.id) ? (
                        <span className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[12px] text-amber-500">
                          已收藏
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted">
                      {hostnameOf(site.url)} · {categoryName}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'hidden shrink-0 items-center gap-1 text-[13px] text-primary-ink transition-opacity duration-200 sm:flex',
                      index === active ? 'opacity-100' : 'opacity-0',
                    )}
                  >
                    <kbd className="rounded border border-primary/40 px-1 font-mono text-[12px]">↵</kbd>
                    打开
                  </span>
                </a>
              </motion.li>
            );
          })}
        </motion.ul>

        {empty ? (
          <div
            className="relative mx-1 overflow-hidden rounded-xl px-3 py-8 text-center animate-fade-in"
            data-testid="search-empty"
          >
            {/* 与空结果页同一套装饰语言：绕边扫光，让「没搜到」不至于是一片死白 */}
            <ShineBorder borderWidth={1} duration={9} shineColor={['#8B5CF6', '#3B82F6']} />
            <p className="text-[13px] text-ink">没有找到与「{query.trim()}」相关的站点</p>
            <p className="mt-1 text-meta text-muted">
              试试更短的关键词，或从下方推荐中挑选：
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {recommended.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    setQuery(site.name);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-line px-2.5 py-1 text-[13px] text-ink transition-colors hover:border-primary/50 hover:text-primary-ink"
                >
                  {site.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* 结果被裁切时贴底的提示：告知「下面还有」，滚动到底部后自动消失。
            用 Magic UI 的 ProgressiveBlur 取代原来的纯色渐变——列表被裁切时
            逐层加重的模糊更像光学虚化，不会在深色面板上糊出一块突兀的色块。 */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none sticky bottom-0 -mt-9 h-9 transition-opacity duration-200 ease-silk',
            moreBelow ? 'opacity-100' : 'opacity-0',
          )}
        >
          <ProgressiveBlur height="100%" position="bottom" className="z-0" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line/80 px-4 py-2.5 text-[13px] text-muted">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line px-1 font-mono">↑</kbd>
            <kbd className="rounded border border-line px-1 font-mono">↓</kbd>
            选择
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line px-1 font-mono">↵</kbd>
            打开
          </span>
        </span>
        <span>共 {sites.length} 个站点</span>
      </div>
    </Modal>
  );
}
