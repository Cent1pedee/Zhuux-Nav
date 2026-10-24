#!/usr/bin/env node
/**
 * 把 data/*.json 复制到 public/data/，供浏览器运行时 fetch。
 * 单一数据源仍在 data/ 下（PRD 4.5「数据与代码分离」）。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'data');
mkdirSync(outDir, { recursive: true });

for (const name of ['sites.json', 'categories.json']) {
  const src = path.join(root, 'data', name);
  // 重新序列化，保证产物紧凑且格式统一
  const json = JSON.parse(readFileSync(src, 'utf8'));
  writeFileSync(path.join(outDir, name), JSON.stringify(json));
  console.log(`✓ public/data/${name}`);
}
