import type { Category, Site } from './types';

export interface SiteData {
  sites: Site[];
  categories: Category[];
}

export type LoadResult =
  | { ok: true; data: SiteData }
  | { ok: false; error: string };

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const isHttpUrl = (v: unknown): v is string => {
  if (typeof v !== 'string') return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * 运行时数据校验（构建期已由 scripts/validate-data.mjs 拦截一次，这里是第二道防线）。
 * 失败时 UI 展示空态 + 重试，而不是白屏（PRD 3.1「加载失败空态 + 重试按钮」）。
 */
export function loadSiteData(rawSites: unknown, rawCategories: unknown): LoadResult {
  if (!Array.isArray(rawCategories) || rawCategories.length === 0) {
    return { ok: false, error: '分类数据缺失或为空' };
  }
  if (!Array.isArray(rawSites) || rawSites.length === 0) {
    return { ok: false, error: '站点数据缺失或为空' };
  }

  const categories: Category[] = [];
  const subcategoryOwner = new Map<string, string>();

  for (const [index, raw] of rawCategories.entries()) {
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, error: `第 ${index + 1} 个分类格式非法` };
    }
    const c = raw as Partial<Category>;
    if (!isNonEmptyString(c.id) || !isNonEmptyString(c.name)) {
      return { ok: false, error: `第 ${index + 1} 个分类缺少 id 或 name` };
    }
    if (!Array.isArray(c.subcategories) || c.subcategories.length === 0) {
      return { ok: false, error: `分类「${c.name}」缺少二级分类` };
    }
    const subcategories = c.subcategories
      .filter((s) => isNonEmptyString(s?.id) && isNonEmptyString(s?.name))
      .map((s) => ({ id: s.id, name: s.name }));
    if (subcategories.length !== c.subcategories.length) {
      return { ok: false, error: `分类「${c.name}」存在非法的二级分类` };
    }
    for (const s of subcategories) subcategoryOwner.set(`${c.id}/${s.id}`, c.id);
    categories.push({
      id: c.id,
      name: c.name,
      description: isNonEmptyString(c.description) ? c.description : '',
      subcategories,
    });
  }

  const categoryIds = new Set(categories.map((c) => c.id));
  const sites: Site[] = [];
  const seen = new Set<string>();

  for (const [index, raw] of rawSites.entries()) {
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, error: `第 ${index + 1} 个站点格式非法` };
    }
    const s = raw as Partial<Site>;
    const label = isNonEmptyString(s.name) ? s.name : `第 ${index + 1} 个站点`;
    if (!isNonEmptyString(s.id) || !isNonEmptyString(s.name) || !isNonEmptyString(s.description)) {
      return { ok: false, error: `${label} 缺少 id / name / description` };
    }
    if (seen.has(s.id)) return { ok: false, error: `站点 id 重复：${s.id}` };
    if (!isHttpUrl(s.url)) return { ok: false, error: `${label} 的 URL 非法` };
    if (!isNonEmptyString(s.category) || !categoryIds.has(s.category)) {
      return { ok: false, error: `${label} 的分类不存在` };
    }
    if (!isNonEmptyString(s.subcategory) || !subcategoryOwner.has(`${s.category}/${s.subcategory}`)) {
      return { ok: false, error: `${label} 的二级分类不存在` };
    }
    const tags = Array.isArray(s.tags) ? s.tags.filter(isNonEmptyString) : [];
    if (tags.length === 0) return { ok: false, error: `${label} 缺少标签` };
    seen.add(s.id);
    sites.push({
      id: s.id,
      name: s.name,
      url: s.url,
      description: s.description,
      category: s.category,
      subcategory: s.subcategory,
      tags,
      featured: s.featured === true,
      icon: isNonEmptyString(s.icon) ? s.icon : undefined,
    });
  }

  return { ok: true, data: { sites, categories } };
}

export function iconSrc(site: Site): string {
  return site.icon ?? `/icons/${site.id}.png`;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function categoryNameOf(categories: Category[], id: string): string {
  return categories.find((c) => c.id === id)?.name ?? id;
}

/** 分类筛选：主分类与二级分类均为多选，两个维度取交集 */
export function filterSites(
  sites: Site[],
  opts: {
    categories: string[];
    subcategories: string[];
    favoriteIds?: string[];
  },
): Site[] {
  const { categories, subcategories, favoriteIds } = opts;
  return sites.filter((site) => {
    if (favoriteIds && !favoriteIds.includes(site.id)) return false;
    if (categories.length > 0 && !categories.includes(site.category)) return false;
    if (subcategories.length > 0 && !subcategories.includes(site.subcategory)) return false;
    return true;
  });
}
