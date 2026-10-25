/**
 * 生成社交分享图 public/og.png（1200x630）。
 *
 * 为什么用 Playwright 渲染而不是图片库：
 * 1) 图形全部是 CSS 渐变 / 网格 / 圆角，用图片库要手工重算每个像素的叠加；
 * 2) 中文字体直接走系统字体栈，和站点实际显示一致，不会出现方块字；
 * 3) 品牌名、标语、域名从 lib/config.ts 读取，改名后重跑一次即可，不会忘记同步。
 *
 * 用法：pnpm og        （改了站点名 / 标语 / 域名后记得重跑）
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 从 lib/config.ts 里取品牌名、标语、域名（避免为了一个字符串引入 TS 运行时） */
function readBrand() {
  const source = readFileSync(join(root, 'lib/config.ts'), 'utf8');
  const pick = (key) => {
    const match = source.match(new RegExp(`\\b${key}:\\s*'([^']*)'`));
    if (!match) throw new Error(`未能从 lib/config.ts 解析 ${key}`);
    return match[1];
  };
  const envFallback = source.match(/NEXT_PUBLIC_SITE_URL \|\| '([^']*)'/);
  return {
    name: pick('name'),
    tagline: pick('tagline'),
    url: process.env.NEXT_PUBLIC_SITE_URL || envFallback?.[1] || 'nav.example.com',
  };
}

const { name, tagline, url } = readBrand();
const domain = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
const siteCount = JSON.parse(readFileSync(join(root, 'data/sites.json'), 'utf8')).length;
const categoryCount = JSON.parse(readFileSync(join(root, 'data/categories.json'), 'utf8')).length;

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8" /><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
      'Microsoft YaHei', sans-serif;
    background: #0a0a0f;
    color: #e4e4e7;
    position: relative;
  }
  /* 网格底纹 */
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(to right, rgba(139, 92, 246, 0.10) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(139, 92, 246, 0.10) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 35%, transparent 100%);
  }
  /* 光斑 */
  .blob { position: absolute; border-radius: 9999px; filter: blur(90px); opacity: 0.55; }
  .blob-a { width: 620px; height: 620px; left: -160px; top: -260px;
    background: radial-gradient(circle, #8b5cf6 0%, rgba(139, 92, 246, 0) 70%); }
  .blob-b { width: 700px; height: 700px; right: -220px; top: -140px;
    background: radial-gradient(circle, #3b82f6 0%, rgba(59, 130, 246, 0) 70%); }
  .blob-c { width: 560px; height: 420px; left: 300px; bottom: -260px;
    background: radial-gradient(circle, #7c3aed 0%, rgba(124, 58, 237, 0) 72%); opacity: 0.42; }
  .content { position: relative; padding: 72px 88px; height: 100%; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 18px; }
  .mark {
    width: 76px; height: 76px; border-radius: 20px;
    background: linear-gradient(145deg, #8b5cf6, #6d28d9);
    display: flex; flex-direction: column; justify-content: center; gap: 7px;
    padding: 0 18px; box-shadow: 0 18px 40px -18px rgba(139, 92, 246, 0.9);
  }
  .mark i { display: block; height: 7px; border-radius: 9999px; background: #fff; }
  .mark i:nth-child(1) { width: 60%; }
  .mark i:nth-child(2) { width: 100%; }
  .mark i:nth-child(3) { width: 40%; }
  .brand-text .name { font-size: 40px; font-weight: 700; letter-spacing: -0.5px; color: #fafafa; }
  .brand-text .tagline { margin-top: 6px; font-size: 21px; color: #a1a1aa; letter-spacing: 0.2px; }
  .headline { margin-top: 78px; font-size: 76px; font-weight: 700; letter-spacing: -2px; line-height: 1.1;
    background: linear-gradient(100deg, #fafafa 12%, #c4b5fd 52%, #93c5fd 88%);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sub { margin-top: 22px; font-size: 27px; color: #a1a1aa; letter-spacing: 0.4px; }
  .sub b { color: #c4b5fd; font-weight: 600; }
  .cards { margin-top: 52px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
  .card {
    height: 118px; border-radius: 14px; padding: 20px;
    background: linear-gradient(160deg, rgba(24, 24, 27, 0.92), rgba(24, 24, 27, 0.72));
    border: 1px solid rgba(63, 63, 70, 0.85);
    box-shadow: 0 18px 40px -32px #000;
    display: flex; flex-direction: column; gap: 12px;
  }
  .card .row { display: flex; align-items: center; gap: 12px; }
  .dot { width: 26px; height: 26px; border-radius: 8px;
    background: linear-gradient(145deg, #8b5cf6, #3b82f6); opacity: 0.85; }
  .line { height: 9px; border-radius: 9999px; background: rgba(228, 228, 231, 0.26); }
  .line.w1 { width: 62%; }
  .line.w2 { width: 88%; height: 7px; background: rgba(228, 228, 231, 0.14); }
  .footer { margin-top: auto; display: flex; align-items: center; justify-content: space-between;
    font-size: 20px; color: #7e7e87; letter-spacing: 0.3px; }
  .footer .pill { display: inline-flex; align-items: center; gap: 9px; }
  .footer .ok { width: 9px; height: 9px; border-radius: 9999px; background: #34d399; }
</style></head>
<body>
  <div class="grid"></div>
  <div class="blob blob-a"></div>
  <div class="blob blob-b"></div>
  <div class="blob blob-c"></div>
  <div class="content">
    <div class="brand">
      <div class="mark"><i></i><i></i><i></i></div>
      <div class="brand-text">
        <div class="name">${name}</div>
        <div class="tagline">${tagline}</div>
      </div>
    </div>

    <div class="headline">开发者精选导航</div>
    <div class="sub"><b>${siteCount}</b> 个站点 &nbsp;·&nbsp; <b>${categoryCount}</b> 大分类 &nbsp;·&nbsp; 搜索 / 收藏 / 深浅色主题</div>

    <div class="cards">
      ${[0, 1, 2, 3]
        .map(
          () => `<div class="card">
        <div class="row"><div class="dot"></div><div style="flex:1"><div class="line w1"></div></div></div>
        <div class="line w2"></div>
        <div class="line w2" style="width:64%"></div>
      </div>`,
        )
        .join('\n      ')}
    </div>

    <div class="footer">
      <span>${domain}</span>
      <span class="pill"><span class="ok"></span>纯静态 · 无账号 · 数据存本地</span>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: join(root, 'public/og.png'), type: 'png' });
  console.log(`✓ 已生成 public/og.png（${name} · ${siteCount} 站点 / ${categoryCount} 分类 / ${domain}）`);
} finally {
  await browser.close();
}
