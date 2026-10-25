import { STORAGE_KEYS, readJSON, storage, isStringArray } from './storage';
import { siteConfig } from './config';
import type { Site } from './types';

/**
 * 站点反馈（PRD 3.2.2）。
 * PRD 原方案是「跳转预设表单」，本项目改为内置表单 + 可替换的提交适配器：
 * 若 siteConfig.feedback.externalFormUrl 配置了地址则直接跳转，否则走这里。
 * 假后端：写入 localStorage（最多保留 50 条）并模拟 500ms 网络延迟，接口签名与真实 POST 一致。
 */
export interface FeedbackPayload {
  siteId?: string;
  siteName?: string;
  type: 'broken' | 'wrong-info' | 'suggest' | 'other';
  message: string;
  email?: string;
}

export interface FeedbackRecord extends FeedbackPayload {
  id: string;
  at: number;
}

export const FEEDBACK_TYPES = [
  { value: 'broken', label: '链接失效 / 打不开' },
  { value: 'wrong-info', label: '信息有误（名称、描述、分类）' },
  { value: 'suggest', label: '建议新增站点' },
  { value: 'other', label: '其他问题' },
] as const;

export function validateFeedback(input: { message: string; email?: string }): string | null {
  const message = input.message.trim();
  if (message.length < 5) return '请至少填写 5 个字，方便我们定位问题';
  if (message.length > 500) return '描述请控制在 500 字以内';
  if (input.email && input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email.trim())) {
    return '邮箱格式不正确，可留空';
  }
  return null;
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ ok: boolean }> {
  const record: FeedbackRecord = {
    ...payload,
    message: payload.message.trim(),
    email: payload.email?.trim() || undefined,
    id: `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
  };

  // 模拟网络往返；真实接入时替换为 fetch(api, { method: 'POST', body: ... })
  await new Promise((resolve) => setTimeout(resolve, 480));

  const list = readJSON<FeedbackRecord[]>(
    STORAGE_KEYS.feedback,
    (v): v is FeedbackRecord[] => Array.isArray(v),
    [],
  );
  storage.set(STORAGE_KEYS.feedback, JSON.stringify([record, ...list].slice(0, 50)));
  return { ok: true };
}

/** 导出收藏（PRD 3.2.1），返回 Blob 供下载 */
export function buildFavoritesExport(sites: Site[]): Blob {
  const payload = {
    exportedAt: new Date().toISOString(),
    source: siteConfig.name,
    count: sites.length,
    sites: sites.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      category: s.category,
      subcategory: s.subcategory,
      tags: s.tags,
    })),
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export const isFavoritesFile = (v: unknown): v is string[] => isStringArray(v);
