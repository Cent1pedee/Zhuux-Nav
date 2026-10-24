'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/cn';
import type { ToastItem } from '@/lib/types';
import { CheckIcon, CloseIcon, AlertIcon } from '@/components/icons';

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: ToastItem['tone'] }) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  /* 退场动画交给 AnimatePresence：这里直接移除，不再需要 leaving 标记与 200ms 延迟 */
  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    ({ title, description, tone = 'default' }) => {
      seq += 1;
      const id = seq;
      setItems((prev) => [...prev.slice(-3), { id, title, description, tone }]);
      const timer = window.setTimeout(() => dismiss(id), 3200);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => window.clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* 右下角滑入滑出（用户要求：主题切换提示不要挡在右上角），aria-live 播报（PRD 4.3） */}
      <div
        data-testid="toast-region"
        className="pointer-events-none fixed bottom-3 right-3 z-[90] flex w-[min(360px,calc(100vw-24px))] flex-col-reverse gap-2 pb-[var(--consent-h,0px)] sm:bottom-5 sm:right-5"
        role="region"
        aria-label="通知"
      >
        <div aria-live="polite" aria-atomic="false" className="flex flex-col-reverse gap-2">
          {/*
           * 最新的通知渲染在最前（DOM 顺序），配合 `flex-col-reverse` 就会贴在
           * 屏幕右下角，旧消息依次向上堆叠。
           * 这样既符合「新消息离视线最近」的直觉，也让 `getByTestId('toast').first()`
           * 稳定拿到最新一条（否则测试会读到还没消失的旧提示）。
           */}
          <AnimatePresence initial={false} mode="popLayout">
            {items
              .slice()
              .reverse()
              .map((item) => (
              <motion.div
                key={item.id}
                layout
                data-testid="toast"
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 460, damping: 32, mass: 0.7 }}
                className={cn(
                  'pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border px-3.5 py-3 shadow-card glass-panel',
                  item.tone === 'error' ? 'border-red-500/40' : 'border-line/90',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full',
                    item.tone === 'error'
                      ? 'bg-red-500/15 text-red-400'
                      : item.tone === 'success'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-primary/15 text-primary-ink',
                  )}
                  aria-hidden="true"
                >
                  {item.tone === 'error' ? <AlertIcon size={12} /> : <CheckIcon size={12} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-5 text-ink">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-meta leading-4 text-muted">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="关闭通知"
                  className="-mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  <CloseIcon size={13} />
                </button>
                {/*
                 * 倒计时条：宽度随 3200ms 线性收缩，和自动消失时间一致。
                 * 用户能看出「这条还会停留多久」，也可以随时点 × 立刻关掉。
                 */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-0 bottom-0 h-[2px] origin-left animate-toast-progress',
                    item.tone === 'error'
                      ? 'bg-red-500/60'
                      : item.tone === 'success'
                        ? 'bg-emerald-500/60'
                        : 'bg-primary/55',
                  )}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
}
