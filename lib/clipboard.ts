/**
 * 复制到剪贴板（PRD 3.2.3）。
 * 优先 Clipboard API；在非安全上下文或权限被拒时退回 execCommand，保证按钮永远有反馈。
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* 落到兼容分支 */
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function absoluteUrl(pathname: string): string {
  if (typeof window === 'undefined') return pathname;
  return new URL(pathname, window.location.origin).toString();
}
