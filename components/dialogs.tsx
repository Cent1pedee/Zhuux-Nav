'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Modal, ModalHeader } from '@/components/ui/modal';
import { useAppStore } from '@/components/providers/app-store';
import { useUi } from '@/components/providers/ui';
import { useToast } from '@/components/providers/toast';
import { useConfirm } from '@/components/providers/confirm';
import { SiteIcon } from '@/components/site-card';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import { cn, relativeTime } from '@/lib/cn';
import { copyText, absoluteUrl } from '@/lib/clipboard';
import { hostnameOf } from '@/lib/data';
import { FEEDBACK_TYPES, submitFeedback, validateFeedback } from '@/lib/feedback';
import { track } from '@/lib/analytics';
import { siteConfig } from '@/lib/config';
import {
  AlertIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ClockIcon,
  MailIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
} from '@/components/icons';

/* ============================ 分享弹窗（PRD 3.2.3） ============================ */
export function ShareDialog() {
  const { shareOpen, closeShare } = useUi();
  const { toast } = useToast();

  const copy = async (text: string, label: string) => {
    const ok = await copyText(text);
    toast({
      title: ok ? `${label}已复制` : '复制失败，请手动选中复制',
      description: ok ? text : undefined,
      tone: ok ? 'success' : 'error',
    });
  };

  const links = [
    { label: '页面链接', value: absoluteUrl('/') },
    { label: '分类链接（开发工具）', value: absoluteUrl('/category/dev-tools/') },
  ];

  return (
    <Modal open={shareOpen} onClose={closeShare} labelledBy="share-title" widthClass="max-w-md">
      <ModalHeader
        id="share-title"
        title="分享"
        description="复制链接发给同事，或直接使用系统分享面板。"
        onClose={closeShare}
      />
      <div className="space-y-2 px-5 py-4">
        {links.map((link) => (
          <div
            key={link.label}
            className="flex items-center gap-2 rounded-lg border border-line/90 px-2.5 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-muted">{link.label}</p>
              <p className="truncate font-mono text-[13px] text-ink">{link.value}</p>
            </div>
            <button
              type="button"
              onClick={() => void copy(link.value, link.label)}
              data-testid={`copy-${link.label === '页面链接' ? 'page' : 'category'}`}
              className="shrink-0 rounded-md border border-line px-2 py-1 text-[13px] text-ink transition-colors hover:border-primary/50 hover:text-primary-ink"
            >
              复制
            </button>
          </div>
        ))}
        <ShimmerButton
          type="button"
          onClick={async () => {
            if (typeof navigator !== 'undefined' && navigator.share) {
              try {
                await navigator.share({
                  title: siteConfig.name,
                  text: siteConfig.tagline,
                  url: absoluteUrl('/'),
                });
                toast({ title: '已调起系统分享', tone: 'success' });
              } catch {
                toast({ title: '已取消分享', tone: 'default' });
              }
            } else {
              const ok = await copyText(absoluteUrl('/'));
              toast({
                title: ok ? '当前浏览器不支持系统分享，已复制链接' : '当前浏览器不支持系统分享',
                tone: ok ? 'success' : 'error',
              });
            }
          }}
          className="w-full px-4 py-2"
        >
          <ShareIcon size={14} />
          使用系统分享
        </ShimmerButton>
      </div>
    </Modal>
  );
}

/* ============================ 订阅弹窗（PRD 3.2.4） ============================ */
export function SubscribeDialog() {
  const { subscribeOpen, closeSubscribe } = useUi();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setEmail('');
    setError(null);
    setDone(false);
    setPending(false);
  };

  const close = () => {
    closeSubscribe();
    window.setTimeout(reset, 200);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setError(null);
    setPending(true);
    await new Promise((resolve) => setTimeout(resolve, 520));
    setPending(false);
    setDone(true);
    toast({
      title: '订阅成功（演示）',
      description: '当前为演示环境，未向第三方订阅服务发送请求。',
      tone: 'success',
    });
  };

  return (
    <Modal
      open={subscribeOpen}
      onClose={close}
      labelledBy="subscribe-title"
      describedBy="subscribe-desc"
      widthClass="max-w-md"
    >
      <ModalHeader
        id="subscribe-title"
        title="订阅每周精选"
        description="每周一封，只推荐真正好用的技术站点，随时退订。"
        descriptionId="subscribe-desc"
        onClose={close}
      />
      {done ? (
        <div className="px-5 py-6 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
            <CheckIcon size={20} />
          </span>
          <p className="mt-3 text-[14px] font-medium text-ink">已记录 {email}</p>
          <p className="mt-1 text-meta leading-5 text-muted">
            演示环境不会真的发送邮件。接入 Buttondown 等第三方服务后，此表单会改为跳转其订阅页。
          </p>
          <ShimmerButton type="button" onClick={close} className="mt-4 px-4 py-2">
            完成
          </ShimmerButton>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="px-5 py-4">
          <label htmlFor="subscribe-email" className="text-[13px] font-medium text-ink">
            邮箱地址
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-surface/60 px-2.5 focus-within:border-primary/60">
            <MailIcon size={15} className="text-muted" />
            <input
              id="subscribe-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'subscribe-error' : 'subscribe-hint'}
              placeholder="you@example.com"
              data-testid="subscribe-email"
              className="h-10 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
            />
          </div>
          {error ? (
            <p id="subscribe-error" role="alert" className="mt-1.5 flex items-center gap-1 text-[13px] text-red-400">
              <AlertIcon size={12} />
              {error}
            </p>
          ) : (
            <p id="subscribe-hint" className="mt-1.5 text-[13px] text-muted">
              仅用于发送订阅邮件，不做其他用途。
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="btn-ghost h-9 px-3.5"
            >
              取消
            </button>
            <ShimmerButton
              type="submit"
              disabled={pending}
              data-testid="subscribe-submit"
              className="h-9 px-4"
            >
              {pending ? '提交中…' : '订阅'}
            </ShimmerButton>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ============================ 反馈弹窗（PRD 3.2.2） ============================ */
export function FeedbackDialog() {
  const { feedbackOpen, feedbackTarget, closeFeedback } = useUi();
  const { toast } = useToast();
  const { sites } = useAppStore();
  const [type, setType] = useState<'broken' | 'wrong-info' | 'suggest' | 'other'>('broken');
  const [siteId, setSiteId] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reset = () => {
    setType('broken');
    setSiteId('');
    setMessage('');
    setEmail('');
    setError(null);
    setPending(false);
  };

  const close = () => {
    closeFeedback();
    window.setTimeout(reset, 200);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const err = validateFeedback({ message, email });
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setPending(true);
    const target = feedbackTarget ?? sites.find((s) => s.id === siteId) ?? null;
    await submitFeedback({
      siteId: target?.id,
      siteName: target?.name,
      type,
      message,
      email,
    });
    setPending(false);
    toast({
      title: '反馈已提交，感谢！',
      description: '我们会在 1-2 个工作日内核实（演示环境保存于本地）。',
      tone: 'success',
    });
    close();
  };

  const title = feedbackTarget ? `反馈「${feedbackTarget.name}」的问题` : '站点反馈';

  return (
    <Modal
      open={feedbackOpen}
      onClose={close}
      labelledBy="feedback-title"
      describedBy="feedback-desc"
      widthClass="max-w-md"
    >
      <ModalHeader
        id="feedback-title"
        title={title}
        description="链接失效、信息有误或想推荐新站点，都可以告诉我们。"
        descriptionId="feedback-desc"
        onClose={close}
      />
      <form onSubmit={submit} noValidate className="space-y-3 px-5 py-4">
        {!feedbackTarget ? (
          <div>
            <label htmlFor="feedback-site" className="text-[13px] font-medium text-ink">
              相关站点（可选）
            </label>
            <select
              id="feedback-site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2 text-[13px] text-ink outline-none focus:border-primary/60"
            >
              <option value="">不指定站点</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-line/90 bg-surface/50 px-2.5 py-2">
            <SiteIcon site={feedbackTarget} size={26} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{feedbackTarget.name}</p>
              <p className="truncate font-mono text-[13px] text-muted">{hostnameOf(feedbackTarget.url)}</p>
            </div>
            <a
              href={feedbackTarget.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted transition-colors hover:text-primary-ink"
              aria-label={`在新窗口打开 ${feedbackTarget.name}`}
            >
              <ArrowUpRightIcon size={14} />
            </a>
          </div>
        )}

        <fieldset>
          <legend className="text-[13px] font-medium text-ink">问题类型</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {FEEDBACK_TYPES.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[13px] transition-colors',
                  type === option.value
                    ? 'border-primary/60 bg-primary/10 text-primary-ink'
                    : 'border-line text-muted hover:bg-ink/5 hover:text-ink',
                )}
              >
                <input
                  type="radio"
                  name="feedback-type"
                  value={option.value}
                  checked={type === option.value}
                  onChange={() => setType(option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-2 w-2 rounded-full',
                    type === option.value ? 'bg-primary' : 'bg-line',
                  )}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="feedback-message" className="text-[13px] font-medium text-ink">
            问题描述 <span className="text-red-400">*</span>
          </label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (error) setError(null);
            }}
            rows={3}
            maxLength={500}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'feedback-error' : 'feedback-count'}
            placeholder="例如：打开后返回 404，或描述与站点实际功能不符…"
            data-testid="feedback-message"
            className="mt-1 w-full resize-none rounded-lg border border-line bg-surface/60 px-2.5 py-2 text-[13px] leading-5 text-ink outline-none placeholder:text-muted focus:border-primary/60"
          />
          <div className="mt-1 flex items-center justify-between">
            {error ? (
              <p id="feedback-error" role="alert" className="flex items-center gap-1 text-[13px] text-red-400">
                <AlertIcon size={12} />
                {error}
              </p>
            ) : (
              <span />
            )}
            <span id="feedback-count" className="font-mono text-[13px] text-muted">
              {message.trim().length}/500
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="feedback-email" className="text-[13px] font-medium text-ink">
            联系邮箱（可选）
          </label>
          <input
            id="feedback-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="方便我们回复你"
            className="mt-1 h-9 w-full rounded-lg border border-line bg-surface/60 px-2.5 text-[13px] text-ink outline-none placeholder:text-muted focus:border-primary/60"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            className="btn-ghost h-9 px-3.5"
          >
            取消
          </button>
          <ShimmerButton
            type="submit"
            disabled={pending}
            data-testid="feedback-submit"
            className="h-9 px-4"
          >
            {pending ? '提交中…' : '提交反馈'}
          </ShimmerButton>
        </div>
      </form>
    </Modal>
  );
}

/* ============================ 隐私政策弹窗 ============================ */
export function PrivacyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clearAllLocalData } = useAppStore();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="privacy-title"
      describedBy="privacy-desc"
      widthClass="max-w-xl"
    >
      <ModalHeader
        id="privacy-title"
        title="隐私政策"
        description="最后更新：2025-01"
        descriptionId="privacy-desc"
        onClose={onClose}
      />
      <div className="max-h-[min(65vh,520px)] space-y-4 overflow-y-auto px-5 py-4 text-[13px] leading-6 text-muted">
        <section>
          <h3 className="mb-1 text-[13px] font-semibold text-ink">我们收集什么</h3>
          <p>
            默认不收集任何个人身份信息。仅在你点击「允许」后，才会向隐私友好的统计服务发送聚合事件
            （页面访问、站点点击、搜索关键词与结果数、收藏与主题切换）。
          </p>
        </section>
        <section>
          <h3 className="mb-1 text-[13px] font-semibold text-ink">本地存储</h3>
          <p>
            收藏、最近浏览、主题、布局密度与统计同意状态保存在你浏览器的 localStorage 中，不会上传到服务器。
            这些数据仅用于在本机恢复你的使用偏好。
          </p>
        </section>
        <section>
          <h3 className="mb-1 text-[13px] font-semibold text-ink">不使用 Cookie 做追踪</h3>
          <p>本站不使用广告 Cookie，也不做跨站追踪。统计服务不设置持久化标识。</p>
        </section>
        <section>
          <h3 className="mb-1 text-[13px] font-semibold text-ink">外部链接</h3>
          <p>
            所有站点卡片都会在新窗口打开第三方网站。你离开本站后的行为受该网站自己的隐私政策约束。
          </p>
        </section>
        <section>
          <h3 className="mb-1 text-[13px] font-semibold text-ink">你的控制权</h3>
          <p>你可以随时拒绝统计、撤回同意，或一键清除全部本地数据。</p>
        </section>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line/70 px-5 py-3">
        <button
          type="button"
          onClick={async () => {
            const ok = await confirm({
              title: '清除所有本地数据？',
              description: '收藏、浏览历史、主题与统计同意状态都会被删除。',
              confirmText: '全部清除',
              tone: 'danger',
            });
            if (!ok) return;
            const count = clearAllLocalData();
            toast({ title: `已清除 ${count} 项本地数据`, tone: 'success' });
            onClose();
          }}
          className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[13px] text-red-400 transition-colors hover:bg-red-500/15"
        >
          <TrashIcon size={12} />
          清除所有本地数据
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost px-3 py-1.5"
        >
          关闭
        </button>
      </div>
    </Modal>
  );
}

/* ============================ 收藏 / 最近浏览抽屉内容（供首页区块使用） ============================ */
export function FavoritesStrip({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { favorites, sites, isFavorite } = useAppStore();
  const items = useMemo(() => sites.filter((s) => isFavorite(s.id)), [sites, isFavorite]);
  if (favorites.length === 0) return null;
  return (
    <section aria-labelledby="favorites-heading" className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="favorites-heading" className="flex items-baseline gap-2 text-section-title text-ink">
          <StarIcon size={15} filled className="text-amber-400" />
          我的收藏
          <span className="font-mono text-[13px] font-normal text-muted">{items.length}</span>
        </h2>
        <button
          type="button"
          onClick={onOpenSettings}
          className="text-[13px] text-muted transition-colors hover:text-primary-ink"
        >
          管理 / 导出
        </button>
      </div>
      <motion.ul
        className="flex flex-wrap gap-1.5"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
      >
        {items.map((site) => (
          <motion.li
            key={site.id}
            variants={{
              hidden: { opacity: 0, y: 6, scale: 0.96 },
              show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('site_click', { site_id: site.id, site_name: site.name, category: site.category, position: 'favorites' })}
              className="flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-2.5 py-1 text-[13px] text-ink transition-[border-color,background-color,color] duration-200 ease-silk hover:border-primary/50 hover:bg-surface hover:text-primary-ink"
            >
              <SiteIcon site={site} size={18} />
              {site.name}
            </a>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

export function RecentStrip({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { recent, sites, clearRecent } = useAppStore();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const items = useMemo(
    () => recent.map((r) => ({ entry: r, site: sites.find((s) => s.id === r.id) })).filter((x) => x.site),
    [recent, sites],
  );

  /*
   * 「清除记录」就地清空（带二次确认），不再把用户绕去设置面板——
   * 一个写着「清除记录」的按钮点开后还要再找一次，属于无效引导。
   */
  const handleClear = async () => {
    const ok = await confirm({
      title: '清除浏览历史？',
      description: `将移除最近 ${recent.length} 条浏览记录，此操作不可撤销。`,
      confirmText: '清除历史',
      tone: 'danger',
    });
    if (!ok) return;
    clearRecent();
    toast({ title: '已清除浏览历史', tone: 'success' });
  };

  if (items.length === 0) return null;
  return (
    <section aria-labelledby="recent-heading" className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="recent-heading" className="flex items-baseline gap-2 text-section-title text-ink">
          <ClockIcon size={15} className="text-muted" />
          最近浏览
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClear}
            data-testid="recent-clear"
            className="text-[13px] text-muted transition-colors hover:text-primary-ink"
          >
            清除记录
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[13px] text-muted transition-colors hover:text-primary-ink"
          >
            管理
          </button>
        </div>
      </div>
      <motion.ul
        className="flex flex-wrap gap-1.5"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
      >
        {items.map(({ entry, site }) => (
          <motion.li
            key={entry.id}
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            <a
              href={site!.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${site!.name} · ${relativeTime(entry.at)}`}
              className="flex items-center gap-1.5 rounded-full border border-line/90 px-2.5 py-1 text-[13px] text-muted transition-[border-color,color] duration-200 ease-silk hover:border-primary/40 hover:text-ink"
            >
              {site!.name}
              <span className="text-[13px] opacity-70">{relativeTime(entry.at)}</span>
            </a>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
