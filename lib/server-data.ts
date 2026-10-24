import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadSiteData, type SiteData } from './data';

/**
 * 构建期读取数据（仅服务端/构建期使用）。
 * 数据在 SSG 阶段直接渲染进 HTML，保证无 JS 也可访问链接与满足 SEO（PRD 4.2 / 4.4）。
 */
let cache: SiteData | null = null;

export function getSiteData(): SiteData {
  if (cache) return cache;
  const dir = path.join(process.cwd(), 'data');
  const sites = JSON.parse(readFileSync(path.join(dir, 'sites.json'), 'utf8')) as unknown;
  const categories = JSON.parse(readFileSync(path.join(dir, 'categories.json'), 'utf8')) as unknown;
  const result = loadSiteData(sites, categories);
  if (!result.ok) {
    throw new Error(`站点数据校验失败：${result.error}`);
  }
  cache = result.data;
  return cache;
}
