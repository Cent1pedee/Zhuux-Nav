#!/usr/bin/env node
/**
 * 抓取站点 favicon 到 public/icons/（一次性维护脚本，产物随仓库提交）
 *
 * 用法：
 *   node scripts/fetch-icons.mjs            # 仅补齐缺失的图标
 *   node scripts/fetch-icons.mjs --force    # 全部重新抓取
 *
 * 说明：PRD 4.1 要求 favicon 走 CDN + 懒加载 + 占位兜底。
 * 为保证国内访问稳定与离线可用，本项目把图标在构建期落到本地（等价于自有 CDN），
 * 运行时仍是 loading="lazy" + 尺寸预设 + 失败兜底，不会阻塞首屏。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'icons');
const force = process.argv.includes('--force');
const sites = JSON.parse(readFileSync(path.join(root, 'data', 'sites.json'), 'utf8'));

mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function grab(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; nav-icon-fetcher/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error(`响应过小 (${buf.length}B)`);
  return buf;
}

let ok = 0;
const failed = [];

for (const site of sites) {
  const host = new URL(site.url).hostname;
  const dest = path.join(outDir, `${site.id}.png`);
  if (!force && existsSync(dest)) {
    ok += 1;
    continue;
  }
  const sources = [
    `https://icon.horse/icon/${host}`,
    `https://www.google.com/s2/favicons?sz=64&domain=${host}`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
  ];
  let done = false;
  for (const src of sources) {
    try {
      const buf = await grab(src);
      writeFileSync(dest, buf);
      ok += 1;
      done = true;
      console.log(`✓ ${site.id.padEnd(22)} ${host}`);
      break;
    } catch (err) {
      console.warn(`  · ${site.id} ← ${new URL(src).host} 失败: ${err.message}`);
    }
  }
  if (!done) failed.push(site.id);
  await sleep(250);
}

console.log(`\n完成：${ok}/${sites.length} 个图标已就位。`);
if (failed.length) {
  console.log(`未获取到（运行时使用字母占位兜底）：${failed.join(', ')}`);
}
