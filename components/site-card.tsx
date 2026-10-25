'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { hostnameOf, iconSrc } from '@/lib/data';
import { useAppStore } from '@/components/providers/app-store';
import { useToast } from '@/components/providers/toast';
import { copyText } from '@/lib/clipboard';
import { track } from '@/lib/analytics';
import { MoreIcon, StarIcon } from '@/components/icons';
import { BorderBeam } from '@/components/magicui/border-beam';
import { MagicCard } from '@/components/magicui/magic-card';
import type { Category, Site } from '@/lib/types';

/** favicon：固定尺寸 + 懒加载 + 失败兜底为字母块（PRD 4.1 / 4.4） */
export function SiteIcon({ site, size = 38 }: { site: Site; size?: number }) {
  const [failed, setFailed] = useState(false);
  const letter = site.name.trim().charAt(0).toUpperCase();

  /*
   * 淡入交给 CSS 的 animate-fade-in，而不是用 JS 状态切 opacity。
   * 原因：构建期数据已灌进页面，禁用 JS 时卡片本身就是可见的，
   * 若靠 onLoad 才能把 opacity 从 0 改到 1，那么没有 JS 的访问者
   * 会看到一排「空白方块」——图标永远不出现。
   * 本地 PNG 只有 128px，解码几乎瞬时，CSS 淡入足够顺滑。
   */
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-[10px] border border-line/80 bg-surface/90 transition-[transform,border-color,box-shadow] duration-300 ease-silk group-hover:-rotate-3 group-hover:scale-[1.08] group-hover:border-primary/35 group-hover:shadow-[0_6px_16px_-8px_rgb(var(--c-primary)/0.55)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {failed ? (
        <span className="text-[16px] font-semibold text-primary-ink">{letter}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- 图标为本地小尺寸 PNG，无需 next/image 优化
        <img
          src={iconSrc(site)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          // 内边距随尺寸缩放：固定 6px 在 16px 的小图标里会只剩 4px 可见区域
          style={{ padding: Math.max(1, Math.round(size * 0.16)) }}
          className="h-full w-full animate-fade-in object-contain"
        />
      )}
    </span>
  );
}

interface SiteCardProps {
  site: Site;
  category?: Category;
  /** 入场动画序号；> 30 张时由父级关闭 stagger */
  index: number;
  stagger: boolean;
  /** 紧凑 6 列时卡片更窄，需要压缩图标与操作区，避免名称被挤到只剩两三个字 */
  compact?: boolean;
  onFeedback: (site: Site) => void;
}

export function SiteCard({ site, category, index, stagger, compact = false, onFeedback }: SiteCardProps) {
  const { isFavorite, toggleFavorite, pushRecent } = useAppStore();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [justStarred, setJustStarred] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const descRef = useRef<HTMLSpanElement>(null);
  /** 描述是否真的被截断：只有被截断时才需要浮层补全，避免短描述也弹出多余面板 */
  const [clamped, setClamped] = useState(false);
  /** 完整描述浮层：渲染到 body 上的固定定位元素，避免遮挡卡片本身、也不被网格裁切 */
  const cardRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null);
  const [tipPlacement, setTipPlacement] = useState<'bottom' | 'top'>('bottom');

  const favorite = isFavorite(site.id);
  const subName = category?.subcategories.find((s) => s.id === site.subcategory)?.name ?? '';
  const categoryName = category?.name ?? site.category;
  const host = hostnameOf(site.url);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus({ preventScroll: true });
  }, [menuOpen]);

  useEffect(() => {
    const node = descRef.current;
    if (!node) return;
    const measure = () => setClamped(node.scrollHeight - node.clientHeight > 1);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const showTip = useCallback(() => {
    if (!clamped) return;
    const node = cardRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setTipPlacement('bottom');
    setTip({ top: rect.top, bottom: rect.bottom, left: rect.left, width: Math.max(rect.width, 232) });
  }, [clamped]);

  const hideTip = useCallback(() => setTip(null), []);

  /* 浮层高度要渲染后才知道：下方放不下就翻到卡片上方，上方也放不下则贴在可视区内 */
  useLayoutEffect(() => {
    if (!tip || !tipRef.current) return;
    const height = tipRef.current.offsetHeight;
    const viewport = window.innerHeight;
    if (tipPlacement === 'bottom' && tip.bottom + 8 + height > viewport - 12) {
      setTipPlacement('top');
    } else if (tipPlacement === 'top' && tip.top - 8 - height < 12) {
      setTipPlacement('bottom');
    }
  }, [tip, tipPlacement]);

  useEffect(() => {
    if (!tip) return;
    const close = () => setTip(null);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, [tip]);

  const handleOpen = useCallback(() => {
    pushRecent(site.id);
    track('site_click', {
      site_id: site.id,
      site_name: site.name,
      category: site.category,
      position: 'card',
    });
  }, [pushRecent, site]);

  const handleFavorite = useCallback(() => {
    toggleFavorite(site.id);
    if (!favorite) {
      setJustStarred(true);
      window.setTimeout(() => setJustStarred(false), 560);
    }
    toast({
      title: favorite ? `已取消收藏「${site.name}」` : `已收藏「${site.name}」`,
      description: favorite ? undefined : '可在设置面板「我的收藏」中查看并导出。',
      tone: favorite ? 'default' : 'success',
    });
  }, [favorite, site.id, site.name, toast, toggleFavorite]);

  const handleCopyLink = useCallback(async () => {
    const ok = await copyText(site.url);
    setMenuOpen(false);
    toast({
      title: ok ? '站点链接已复制' : '复制失败，请手动复制',
      description: ok ? site.url : '当前浏览器拒绝了剪贴板访问。',
      tone: ok ? 'success' : 'error',
    });
  }, [site.url, toast]);

  const handleFeedback = useCallback(() => {
    setMenuOpen(false);
    onFeedback(site);
  }, [onFeedback, site]);

  const menuItems = [
    { label: favorite ? '取消收藏' : '收藏站点', action: handleFavorite },
    { label: '复制站点链接', action: handleCopyLink },
    { label: '反馈问题', action: handleFeedback },
  ];

  return (
    <li
      className="group relative animate-fade-up"
      style={
        stagger
          ? { animationDelay: `${Math.min(index, 30) * 30}ms` }
          : { animationDelay: '0ms' }
      }
      data-testid="site-card"
      data-site-id={site.id}
    >
      <MagicCard
        ref={cardRef}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        className={cn(
          // contain:paint 把卡片的绘制隔离在自己这一层：hover 时的光晕/高光/位移
          // 不会触发网格甚至整页重绘，长列表滚动更稳
          'h-full rounded-card glass-card shadow-card [contain:paint]',
          'transition-[transform,box-shadow] duration-300 ease-silk',
          'group-hover:-translate-y-1 group-hover:shadow-card-hover',
          // 按下时轻微回压，给「点到了」一个即时的物理反馈
          'group-active:translate-y-0 group-active:scale-[0.994]',
          'group-focus-within:shadow-card-hover',
        )}
      >
        {/* 主色光晕（PRD 7.4 Glow，15% 透明度）；指针跟随的柔光与描边由 MagicCard 负责 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-card opacity-0 transition-opacity duration-300 ease-silk group-hover:opacity-100 group-focus-within:opacity-100"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 0%, rgb(var(--c-primary) / 0.15), transparent 62%)',
          }}
        />
        {/*
         * 推荐位（featured）才有绕边流光（Magic UI BorderBeam，PRD 7.6「仅推荐位使用」）。
         * 放在所有内容之下、光晕之上：既不会盖住文字，也不会抢走卡片的点击。
         */}
        {site.featured ? (
          <BorderBeam
            className="z-[1] opacity-70 transition-opacity duration-300 ease-silk group-hover:opacity-100"
            size={compact ? 44 : 60}
            duration={7}
            colorFrom="#8B5CF6"
            colorTo="#3B82F6"
          />
        ) : null}

        {/* 掠过卡片的柔光高光：仅 transform 动画 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-card"
        >
          <span className="absolute -inset-y-8 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent opacity-0 transition-[opacity,transform] duration-700 ease-silk group-hover:translate-x-[420%] group-hover:opacity-100" />
        </span>

        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpen}
          className={cn(
            'relative flex h-full flex-col rounded-card outline-none',
            compact ? 'gap-2 p-3' : 'gap-2.5 p-4',
          )}
        >
          <span className={cn('flex items-start', compact ? 'gap-2 pr-10' : 'gap-3 pr-14')}>
            <SiteIcon site={site} size={compact ? 32 : 38} />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block truncate text-ink transition-colors duration-200 group-hover:text-primary-ink',
                  compact ? 'text-[14px] font-semibold' : 'text-card-title',
                )}
              >
                {site.name}
              </span>
              <span
                className={cn(
                  'mt-0.5 block truncate font-mono text-muted',
                  compact ? 'text-[11.5px]' : 'text-[12px]',
                )}
              >
                {host}
              </span>
            </span>
          </span>

          {/*
           * 描述固定两行：悬停时不再展开文本（展开会把整行卡片撑高），
           * 而是由浮层显示完整内容，卡片高度保持恒定。
           */}
          <span
            ref={descRef}
            className="line-clamp-2 min-h-[2.9em] text-meta leading-[1.45] text-muted"
          >
            {site.description}
          </span>

          {/*
           * 分类标签：默认弱化，hover / 键盘聚焦时完整显示（PRD 3.1.1）。
           * 这里不用 mt-auto 贴底——标签换行行数不同时，贴底会让同一行卡片的
           * 标签起始高度参差不齐；描述已固定两行（min-h-[2.9em]），
           * 紧跟描述排布即可让整行卡片的标签严格对齐。
           */}
          <span className="flex flex-wrap items-center gap-1.5 pt-1.5">
            <span className="rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[12px] leading-4 text-primary-ink transition-[color,border-color,background-color,transform] duration-200 ease-silk group-hover:-translate-y-0.5 group-hover:border-primary/50">
              {categoryName}
              {subName ? ` · ${subName}` : ''}
            </span>
            {site.tags.slice(0, compact ? 2 : 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-line/80 px-1.5 py-0.5 text-[12px] leading-4 text-muted transition-[color,border-color,transform] duration-200 ease-silk group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:text-ink/80"
              >
                {tag}
              </span>
            ))}
            <span className="sr-only">（在新窗口打开 {host}）</span>
          </span>
        </a>

        {/* 收藏按钮（PRD 3.2.1） */}
        <motion.button
          type="button"
          onClick={handleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? `取消收藏 ${site.name}` : `收藏 ${site.name}`}
          data-testid="favorite-button"
          whileTap={{ scale: 0.82 }}
          transition={{ type: 'spring', stiffness: 520, damping: 20 }}
          className={cn(
            'absolute z-40 grid place-items-center rounded-lg transition-[color,background-color,opacity] duration-200 ease-silk',
            compact ? 'right-9 top-2.5 h-7 w-7' : 'right-11 top-3 h-8 w-8',
            favorite
              ? 'text-amber-400 hover:bg-amber-400/10'
              : // 触屏没有 hover：小屏常驻显示，否则收藏入口不可见
                'text-muted opacity-0 hover:bg-ink/[0.06] hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100',
          )}
        >
          {justStarred ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border border-amber-400/60 animate-halo"
            />
          ) : null}
          <StarIcon
            size={17}
            filled={favorite}
            className={cn('relative transition-transform duration-200', justStarred && 'animate-star-pop')}
          />
        </motion.button>

        {/* 更多菜单（PRD 3.2.2 站点反馈入口） */}
        <div className={cn('absolute z-40', compact ? 'right-2 top-2.5' : 'right-3 top-3')}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`${site.name} 的更多操作`}
            data-testid="more-button"
            className={cn(
              'grid place-items-center rounded-lg text-muted transition-[color,background-color,transform,opacity] duration-200 ease-silk hover:bg-ink/[0.06] hover:text-ink active:scale-90',
              compact ? 'h-7 w-7' : 'h-8 w-8',
              'opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100',
              menuOpen && 'bg-ink/[0.06] text-ink opacity-100',
            )}
          >
            <MoreIcon
              size={16}
              className={cn(
                'transition-transform duration-300 ease-silk',
                menuOpen ? 'rotate-90' : 'group-hover:rotate-90',
              )}
            />
          </button>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                ref={menuRef}
                role="menu"
                aria-label={`${site.name} 操作菜单`}
                data-testid="site-menu"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                /*
                 * 退场必须用固定时长而不是 spring：
                 * spring 的收敛尾巴很长（约 1s），AnimatePresence 会在这段时间里
                 * 把已经不可见的菜单留在 DOM 上，它仍会吃掉下方元素的点击。
                 */
                exit={{ opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.13, ease: 'easeIn' } }}
                transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                className={cn(
                  'absolute right-0 z-[60] w-40 origin-top-right overflow-hidden rounded-xl border border-line/90 glass-panel p-1 shadow-dialog',
                  compact ? 'top-9' : 'top-10',
                )}
              >
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={item.action}
                    className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-[color,background-color,transform] duration-150 ease-silk hover:translate-x-0.5 hover:bg-primary/10 hover:text-primary-ink focus-visible:bg-primary/10"
                  >
                    {item.label}
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </MagicCard>

      {/*
       * 完整描述浮层：渲染到 body 上（position: fixed），
       * 既不参与卡片布局（卡片高度恒定），也不会盖住卡片自身的标题与按钮。
       */}
      {clamped && typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {tip ? (
                <motion.div
                  ref={tipRef}
                  aria-hidden="true"
                  data-testid="card-tip"
                  initial={{ opacity: 0, y: tipPlacement === 'bottom' ? -4 : 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: 'fixed',
                    left: tip.left,
                    width: tip.width,
                    top: tipPlacement === 'bottom' ? tip.bottom + 8 : tip.top - 8,
                    transform: tipPlacement === 'top' ? 'translateY(-100%)' : undefined,
                  }}
                  className="pointer-events-none z-[95] rounded-xl border border-primary/30 bg-surface/95 p-3 text-left shadow-dialog backdrop-blur-md"
                >
                  <span className="block text-[12px] font-medium text-primary-ink">
                    {categoryName}
                    {subName ? ` · ${subName}` : ''}
                  </span>
                  <span className="mt-1 block text-[13px] leading-[1.55] text-ink/90">
                    {site.description}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {site.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-line/80 px-1.5 py-0.5 text-[12px] leading-4 text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </li>
  );
}
