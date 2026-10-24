import { test as base, expect, type Page } from '@playwright/test';

/**
 * 公共测试夹具：
 * - 预置本地偏好（统计已拒绝、深色主题），避免同意横幅遮挡交互
 * - 拦截所有第三方站点请求，测试不会真的离开本站
 */
export const test = base.extend<{ page: Page }>({
  page: async ({ page, context }, use) => {
    // 只在首次访问时写入默认偏好，避免刷新时覆盖用例产生的持久化结果
    await page.addInitScript(() => {
      try {
        // 用例可通过 sessionStorage 关掉默认偏好注入（例如模拟首次访问）
        if (sessionStorage.getItem('e2e.skipDefaults') === '1') return;
        if (localStorage.getItem('nav.consent') === null) {
          localStorage.setItem('nav.consent', JSON.stringify('denied'));
        }
        if (localStorage.getItem('nav.theme') === null) {
          localStorage.setItem('nav.theme', JSON.stringify('dark'));
        }
      } catch {
        /* 忽略 */
      }
    });
    /*
     * 拦截所有第三方站点请求，测试不会真的离开本站。
     *
     * 必须挂在 context 上，且必须 fulfill 一个 HTML 文档：
     * 1) 挂 page 上时，page 级路由对 popup 也生效，会吞掉
     *    context 的 'page' 事件（等待新标签页的用例直接超时）；
     * 2) 返回 204 / abort / 空 body 时，Chromium 不会为 popup 提交
     *    文档，同样不会触发 'page' 事件；
     * 3) 用正则而不是 glob，是为了排除 127.0.0.1 上的本地站点。
     * 因此统一 fulfill 一个极简 HTML 页面，既隔离外部网络，
     * 又让新标签页真实产生并带上原 URL。
     */
    const stubPage = '<!doctype html><meta charset="utf-8"><title>external stub</title><p>external stub</p>';
    await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost).*/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: stubPage }),
    );
    await use(page);
  },
});

export { expect };

/** 打开首页并等待卡片渲染完成 */
export async function gotoHome(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('site-card').first()).toBeVisible();
}

/** 读取某个 localStorage 键 */
export async function readStore(page: Page, key: string) {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw === null ? null : JSON.parse(raw);
  }, key);
}

/**
 * 点击后等待新窗口打开（卡片与搜索结果都用 noopener 打开，
 * 因此监听 context 的 page 事件而不是 page 的 popup 事件），返回新页面。
 */
export async function expectNewTab(
  context: import('@playwright/test').BrowserContext,
  action: () => Promise<void>,
) {
  const [newPage] = await Promise.all([context.waitForEvent('page'), action()]);
  await newPage.waitForLoadState('domcontentloaded').catch(() => {});
  return newPage;
}

/**
 * 关闭由 expectNewTab 打开的新标签页，并等待焦点回到原页面。
 * 某些浏览器在关闭前台标签页后会把焦点交给浏览器 UI，
 * 直接操作原页面可能触发「Target page closed」竞态，这里显式等待。
 */
export async function closeTab(page: Page, tab: import('@playwright/test').Page) {
  await tab.close();
  await page.waitForTimeout(150);
  await page.bringToFront();
  await expect(page.getByTestId('site-card').first()).toBeVisible();
}

/**
 * 断言弹层已关闭（回到无 dialog 状态）。
 * 弹层有 200ms 的退场过渡，且关闭动作可能在动画帧里完成，
 * 因此用「等待数量归零」而不是一次性断言，避免偶发竞态。
 */
export async function expectNoDialog(page: Page) {
  await expect(page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 5_000 });
}
