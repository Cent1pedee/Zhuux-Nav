'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, ModalHeader } from '@/components/ui/modal';
import { cn } from '@/lib/cn';
import type { ConfirmOptions } from '@/lib/types';

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    // 若已有弹窗未决，先按「取消」结算，避免 Promise 悬挂
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        open={options !== null}
        onClose={() => settle(false)}
        labelledBy="confirm-title"
        describedBy="confirm-desc"
        widthClass="max-w-sm"
      >
        {options ? (
          <>
            <ModalHeader
              id="confirm-title"
              title={options.title}
              onClose={() => settle(false)}
              descriptionId="confirm-desc"
            />
            <div className="px-5 pb-1 pt-4">
              <p id="confirm-desc" className="text-[13px] leading-6 text-muted">
                {options.description}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <button
                type="button"
                onClick={() => settle(false)}
                className="btn-ghost h-9 px-3.5"
              >
                {options.cancelText ?? '取消'}
              </button>
              <button
                type="button"
                data-testid="confirm-accept"
                onClick={() => settle(true)}
                className={cn(
                  'btn-primary h-9 px-3.5',
                  options.tone === 'danger' && 'bg-red-600 hover:brightness-110',
                )}
              >
                {options.confirmText ?? '确定'}
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm 必须在 ConfirmProvider 内使用');
  return ctx;
}
