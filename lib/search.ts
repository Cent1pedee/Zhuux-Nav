import type { Category, SearchHit, Site } from './types';
import { categoryNameOf } from './data';

/**
 * 全局搜索（PRD 3.1.3）：名称 / 描述 / 标签模糊匹配，按命中字段加权排序。
 * 纯函数，便于单测与在客户端即时计算（76 条数据无需索引）。
 */
export function searchSites(
  sites: Site[],
  query: string,
  categories: Category[],
  limit = 8,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: SearchHit[] = [];
  for (const site of sites) {
    const name = site.name.toLowerCase();
    const tags = site.tags.map((t) => t.toLowerCase());
    const description = site.description.toLowerCase();
    const category = categoryNameOf(categories, site.category).toLowerCase();

    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 82;
    else if (name.includes(q)) score = 64;

    if (tags.some((t) => t === q)) score = Math.max(score, 58);
    else if (tags.some((t) => t.includes(q))) score = Math.max(score, 46);

    if (category.includes(q)) score = Math.max(score, 32);
    if (description.includes(q)) score = Math.max(score, 26);

    if (score > 0) hits.push({ site, score });
  }

  return hits
    .sort((a, b) => b.score - a.score || a.site.name.localeCompare(b.site.name, 'zh-CN'))
    .slice(0, limit);
}

/** 把命中的子串切分成片段，供结果高亮渲染 */
export function splitHighlight(text: string, query: string): { text: string; hit: boolean }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const parts: { text: string; hit: boolean }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const idx = lower.indexOf(q, cursor);
    if (idx === -1) {
      parts.push({ text: text.slice(cursor), hit: false });
      break;
    }
    if (idx > cursor) parts.push({ text: text.slice(cursor, idx), hit: false });
    parts.push({ text: text.slice(idx, idx + q.length), hit: true });
    cursor = idx + q.length;
  }
  return parts.length > 0 ? parts : [{ text, hit: false }];
}
