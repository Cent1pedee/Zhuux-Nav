'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { CloseIcon } from '@/components/icons';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
 * 弹层栈：设置面板里点「清除所有本地数据」会再叠一层确认框。
 * 两层都往 document 上挂捕获阶段的 keydown 监听，而同一个节点上的监听
 * 不会因为 `stopPropagation()` 而互相拦截（那是阻止事件继续「传播到别的节点」），
 * 结果是按一次 Esc 两层一起关、Tab 焦点在两层之间来回抢。
 * 用一个模块级栈记录打开顺序，只让栈顶那一层处理 Esc / Tab。
 */
const modalStack: symbol[] = [];

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy: string;
  describedBy?: string;
  className?: string;
  /** 面板最大宽度类名 */
  widthClass?: string;
  /** 点击遮罩是否关闭（表单类弹窗允许关闭） */
  closeOnBackdrop?: boolean;
  initialFocus?: React.RefObject<HTMLElement | null>;
}

/**
 * 通用模态框（PRD 4.3 无障碍要求）：
 * - 焦点移入弹层，关闭后返回触发元素
 * - Tab / Shift+Tab 在弹层内循环
 * - Esc 关闭、点击遮罩关闭
 * - 打开时锁定滚动，并补偿滚动条宽度，避免底层页面横向跳动
 */
export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  describedBy,
  className,
  widthClass = 'max-w-lg',
  closeOnBackdrop = true,
  initialFocus,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const token = Symbol('modal');
    modalStack.push(token);
    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const body = document.body;
    const html = document.documentElement;
    /* 只有最底层那一个才需要真正锁滚动并补偿滚动条宽度 */
    const ownsScrollLock = modalStack.length === 1;

    /*
     * 锁定滚动时经典滚动条会消失、视口变宽，底层内容整体右移（用户反馈的「弹窗一开页面就偏」）。
     *
     * 被实测淘汰的方案：
     * 1. 常驻 `html { scrollbar-gutter: stable }`：只对滚动容器（html）生效，但锁 body 时槽位会被释放，
     *    页面先变宽再被 padding 挤窄，卡片宽度肉眼可见地变窄 → 已从 globals.css 移除；
     * 2. 锁 `html` 的 overflow：页内 `position: sticky` 的顶栏会退化成静态定位（实测 headerTop 0 → -400）；
     * 3. `body { position: fixed; top: -scrollY }`：内容几何稳定，但关闭时 scrollTo 会因页面高度/滚动条
     *    变化而漂移几像素（实测 400 → 394）。
     *
     * 最终方案：只锁 body，并实测「锁定前后 html.clientWidth 的差值」（即滚动条宽度）等量补到
     * body 的 padding-right 上。滚动位置、吸顶状态、网格左边界与卡片宽度全部保持不变。
     */
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const previousScrollBehavior = html.style.scrollBehavior;
    const widthBeforeLock = html.clientWidth;

    if (ownsScrollLock) {
      html.style.scrollBehavior = 'auto';
      body.style.overflow = 'hidden';

      const lostWidth = html.clientWidth - widthBeforeLock;
      if (lostWidth > 0) {
        const currentPadding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${currentPadding + lostWidth}px`;
        // 固定定位的背景层（网格 + 光斑）也跟着让出滚动条宽度，否则它会横向拉伸
        html.style.setProperty('--scrollbar-width', `${lostWidth}px`);
      }
    }

    const target =
      initialFocus?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel ?? null;
    // 等一帧，确保面板已挂载并完成动画初始化后再移入焦点
    const raf = window.requestAnimationFrame(() => {
      target?.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      /* 只有栈顶那一层响应：否则嵌套弹层会被一次 Esc 全部关掉 */
      if (modalStack[modalStack.length - 1] !== token) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const index = modalStack.indexOf(token);
      if (index !== -1) modalStack.splice(index, 1);
      if (ownsScrollLock) {
        html.style.scrollBehavior = previousScrollBehavior;
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPaddingRight;
        html.style.removeProperty('--scrollbar-width');
      }
      window.cancelAnimationFrame(raf);
      restoreRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, initialFocus]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="fixed inset-0 bg-black/55 backdrop-blur-[6px]"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
        data-testid="modal-backdrop"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        initial={{ opacity: 0, y: 10, scale: 0.982 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
        className={cn(
          'relative z-10 my-auto w-full rounded-2xl border border-line/90 glass-panel shadow-dialog outline-none',
          /*
           * 面板自身限高并在内部滚动：
           * 只靠外层容器 overflow-y-auto 时，超高的面板会被视口底部硬切一刀，
           * 圆角与阴影都看不见，看起来像「弹窗没渲染完」。
           */
          'max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sm:max-h-[calc(100dvh-3rem)]',
          widthClass,
          className,
        )}
      >
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}

export function ModalHeader({
  id,
  title,
  description,
  onClose,
  descriptionId,
}: {
  id: string;
  title: string;
  description?: string;
  onClose: () => void;
  descriptionId?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/80 px-5 py-4">
      <div className="min-w-0">
        <h2 id={id} className="text-[17px] font-semibold text-ink">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-1 text-meta text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭弹窗"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-all duration-200 ease-silk hover:rotate-90 hover:bg-ink/5 hover:text-ink active:scale-95"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
