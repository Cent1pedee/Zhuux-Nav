/**
 * Service Worker：让站点可安装、弱网可读。
 *
 * 三种策略，按资源类型分开 —— 全部 network-first 会让离线毫无意义，
 * 全部 cache-first 又会让更新永远不生效：
 *
 * - `/_next/static/*`、`/icons/*`：cache-first。文件名带内容哈希，缓存永不失效。
 * - `/data/*.json`：stale-while-revalidate。先给缓存（秒开），后台拉新的写回。
 * - 页面导航：network-first。在线永远拿最新 HTML，断网才回退缓存的那一份；
 *   这一页没缓存过时退到 `/offline/`，而不是把首页内容套在别的 URL 上。
 *
 * 路径全部走 `withBase()`：站点部署在子路径时（`NEXT_PUBLIC_BASE_PATH`），
 * scope 就是 `/repo/`，硬编码 `/` 会把缓存键写成根路径、安装期 addAll 直接 404。
 *
 * 版本号变化会清掉旧缓存；注册端检测到 waiting 时会提示用户刷新。
 */
const VERSION = 'v2';
const SHELL = `nav-shell-${VERSION}`;
const RUNTIME = `nav-runtime-${VERSION}`;

/** scope 去掉尾斜杠：根部署是空串，子路径部署是 `/repo` */
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const withBase = (path) => `${BASE}${path}`;

const PRECACHE = [withBase('/'), withBase('/data/sites.json'), withBase('/data/categories.json')];
const OFFLINE_URL = withBase('/offline/');

/**
 * 离线兜底页要连它的 chunk 一起缓存。
 *
 * 只缓存 HTML 是不够的：`/offline/` 的 JS chunk 只在这个页面被真正打开过时才会
 * 进 runtime 缓存，而这页的全部意义就是「用户没打开过」。所以安装期取一次 HTML，
 * 把里面引用的 `/_next/static/*` 一起塞进 shell 缓存。
 */
async function precacheOffline(cache) {
  const response = await fetch(OFFLINE_URL, { cache: 'reload' });
  if (!response.ok) return;
  await cache.put(OFFLINE_URL, response.clone());

  const html = await response.text();
  const assets = new Set();
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const value = match[1];
    if (value.startsWith('/') && value.includes('/_next/static/')) assets.add(value);
  }
  await Promise.all([...assets].map((asset) => cache.add(asset).catch(() => undefined)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE).then(() => precacheOffline(cache)).catch(() => undefined))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.endsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1) 带哈希的静态资源：缓存优先
  if (url.pathname.startsWith(withBase('/_next/static/')) || url.pathname.startsWith(withBase('/icons/'))) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // 2) 数据文件：先给缓存，同时后台更新
  if (url.pathname.startsWith(withBase('/data/'))) {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const hit = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => hit || Response.error());
        return hit || network;
      }),
    );
    return;
  }

  // 3) 页面导航：网络优先，断网回退「这一页的缓存 → 离线页 → 首页」
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
          return (await caches.match(withBase('/'))) || Response.error();
        }
      })(),
    );
  }
});
