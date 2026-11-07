/**
 * Service Worker：让站点可安装、弱网可读。
 *
 * 三种策略，按资源类型分开 —— 全部 network-first 会让离线毫无意义，
 * 全部 cache-first 又会让更新永远不生效：
 *
 * - `/_next/static/*`、`/icons/*`：cache-first。文件名带内容哈希，缓存永不失效。
 * - `/data/*.json`：stale-while-revalidate。先给缓存（秒开），后台拉新的写回。
 * - 页面导航：network-first。在线永远拿最新 HTML，断网才回退到缓存的那一份。
 *
 * 版本号变化会清掉旧缓存；注册端检测到 waiting 时会提示用户刷新。
 */
const VERSION = 'v1';
const SHELL = `nav-shell-${VERSION}`;
const RUNTIME = `nav-runtime-${VERSION}`;
const PRECACHE = ['/', '/data/sites.json', '/data/categories.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
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
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
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
  if (url.pathname.startsWith('/data/')) {
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

  // 3) 页面导航：网络优先，断网回退
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match('/')) || Response.error();
        }),
    );
  }
});
