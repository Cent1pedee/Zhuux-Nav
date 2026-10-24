#!/usr/bin/env node
/**
 * 站点数据校验（构建前强制执行）
 * 任何格式错误都会以非 0 退出码终止构建，对应 PRD 4.5「站点数据格式错误时构建失败」。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(path.join(root, p), 'utf8'));
  } catch (err) {
    errors.push(`${p}: 无法解析 JSON —— ${err.message}`);
    return null;
  }
};

const categories = readJson('data/categories.json');
const sites = readJson('data/sites.json');

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = new Set(['favorites', 'recent', 'settings', 'search', 'privacy', 'api']);

if (Array.isArray(categories)) {
  if (categories.length === 0) errors.push('categories.json: 至少需要一个分类');
  const ids = new Set();
  categories.forEach((c, i) => {
    const at = `categories[${i}]`;
    if (!c || typeof c !== 'object') return errors.push(`${at}: 必须是对象`);
    if (!SLUG.test(c.id ?? '')) errors.push(`${at}.id: 必须是 kebab-case slug，实际为 ${JSON.stringify(c.id)}`);
    if (RESERVED.has(c.id)) errors.push(`${at}.id: "${c.id}" 是保留路由，请改名`);
    if (ids.has(c.id)) errors.push(`${at}.id: 重复的分类 id "${c.id}"`);
    ids.add(c.id);
    if (!c.name?.trim()) errors.push(`${at}.name: 不能为空`);
    if (!Array.isArray(c.subcategories) || c.subcategories.length === 0) {
      errors.push(`${at}.subcategories: 至少需要一个二级分类`);
    } else {
      const subIds = new Set();
      c.subcategories.forEach((s, j) => {
        const sat = `${at}.subcategories[${j}]`;
        if (!SLUG.test(s?.id ?? '')) errors.push(`${sat}.id: 必须是 kebab-case slug`);
        if (subIds.has(s?.id)) errors.push(`${sat}.id: 重复的二级分类 id "${s?.id}"`);
        subIds.add(s?.id);
        if (!s?.name?.trim()) errors.push(`${sat}.name: 不能为空`);
      });
    }
  });
}

if (Array.isArray(sites)) {
  if (sites.length === 0) errors.push('sites.json: 至少需要一个站点');
  const ids = new Set();
  const catMap = new Map((categories ?? []).map((c) => [c.id, new Set(c.subcategories?.map((s) => s.id) ?? [])]));
  sites.forEach((s, i) => {
    const at = `sites[${i}]${s?.id ? `(${s.id})` : ''}`;
    if (!s || typeof s !== 'object') return errors.push(`${at}: 必须是对象`);
    if (!SLUG.test(s.id ?? '')) errors.push(`${at}.id: 必须是 kebab-case slug`);
    if (ids.has(s.id)) errors.push(`${at}.id: 重复的站点 id "${s.id}"`);
    ids.add(s.id);
    if (!s.name?.trim()) errors.push(`${at}.name: 不能为空`);
    if (!s.description?.trim()) errors.push(`${at}.description: 不能为空（卡片 hover 会展示完整描述）`);
    let parsed;
    try {
      parsed = new URL(s.url);
    } catch {
      errors.push(`${at}.url: 不是合法 URL —— ${JSON.stringify(s.url)}`);
    }
    if (parsed && !['http:', 'https:'].includes(parsed.protocol)) {
      errors.push(`${at}.url: 仅支持 http/https`);
    }
    if (!catMap.has(s.category)) errors.push(`${at}.category: 未知分类 "${s.category}"`);
    else if (!catMap.get(s.category).has(s.subcategory)) {
      errors.push(`${at}.subcategory: 分类 "${s.category}" 下不存在二级分类 "${s.subcategory}"`);
    }
    if (!Array.isArray(s.tags) || s.tags.length === 0) errors.push(`${at}.tags: 至少需要一个标签`);
    else if (s.tags.some((t) => typeof t !== 'string' || !t.trim())) errors.push(`${at}.tags: 标签不能为空字符串`);
    if (s.featured !== undefined && typeof s.featured !== 'boolean') errors.push(`${at}.featured: 必须是布尔值`);
    if (s.icon !== undefined && !/^\/icons\/[a-z0-9-]+\.(png|svg|ico)$/.test(s.icon)) {
      errors.push(`${at}.icon: 必须是 /icons/<id>.png 形式`);
    }
  });
}

if (errors.length) {
  console.error('\n✗ 站点数据校验失败：\n');
  for (const e of errors) console.error('  •', e);
  console.error(`\n共 ${errors.length} 处错误。请修正 data/ 下的 JSON 后重试。\n`);
  process.exit(1);
}

console.log(`✓ 数据校验通过：${categories.length} 个分类 / ${categories.reduce((n, c) => n + c.subcategories.length, 0)} 个二级分类 / ${sites.length} 个站点`);
