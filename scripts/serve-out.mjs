#!/usr/bin/env node
/**
 * 零依赖静态服务器：用于本地预览 `out/` 与 E2E 测试。
 * 行为对齐 Vercel/静态托管：目录 → index.html，无扩展名且存在同名目录 → 301 到带斜杠路径。
 * 用法：node scripts/serve-out.mjs [port]
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'out');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4321);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
};

const LONG_CACHE = ['.js', '.css', '.png', '.svg', '.woff2', '.webp', '.jpg'];

if (!existsSync(root)) {
  console.error(`✗ 未找到 ${root}，请先运行 pnpm build`);
  process.exit(1);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.includes('..')) {
    res.writeHead(400).end('Bad Request');
    return;
  }

  let filePath = join(root, normalize(pathname));

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    if (!pathname.endsWith('/')) {
      res.writeHead(301, { Location: `${pathname}/${url.search}` }).end();
      return;
    }
    filePath = join(filePath, 'index.html');
  } else if (!existsSync(filePath) && existsSync(`${filePath}.html`)) {
    filePath = `${filePath}.html`;
  }

  if (!existsSync(filePath)) {
    const notFound = join(root, '404.html');
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    createReadStream(existsSync(notFound) ? notFound : filePath).pipe(res);
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': LONG_CACHE.includes(ext)
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`▸ 静态预览已启动：http://127.0.0.1:${port}`);
});
