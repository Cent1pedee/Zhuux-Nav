import { test, expect, gotoHome, readStore, expectNoDialog } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * 模拟「首次访问」：清空同意状态后重新加载。
 * 不能直接用 addInitScript 清空——它在每次导航（含 reload）都会执行，
 * 会把用例刚写入的同意状态又抹掉。
 */
async function gotoFirstVisit(page: Page) {
  await gotoHome(page);
  await page.evaluate(() => {
    // 关掉夹具的默认偏好注入，否则重新加载时又会被写回「已拒绝」
    sessionStorage.setItem('e2e.skipDefaults', '1');
    localStorage.removeItem('nav.consent');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('consent-banner')).toBeVisible();
}

test.describe('隐私与本地数据（PRD 4.7）', () => {
  test('首次访问显示 Cookie 同意横幅，拒绝后埋点不落地', async ({ page }) => {
    await gotoFirstVisit(page);

    const banner = page.getByTestId('consent-banner');
    await banner.getByTestId('consent-deny').click();
    await expect(banner).toHaveCount(0);
    expect(await readStore(page, 'nav.consent')).toBe('denied');

    const events = await page.evaluate(
      () => (window as unknown as { __NAV_ANALYTICS__?: unknown[] }).__NAV_ANALYTICS__ ?? [],
    );
    expect(events).toHaveLength(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('consent-banner')).toHaveCount(0);
  });

  test('同意后埋点开始记录，刷新仍保留同意状态', async ({ page }) => {
    await gotoFirstVisit(page);
    await page.getByTestId('consent-accept').click();
    expect(await readStore(page, 'nav.consent')).toBe('granted');
    await expect
      .poll(async () =>
        page.evaluate(
          () => (window as unknown as { __NAV_ANALYTICS__?: unknown[] }).__NAV_ANALYTICS__?.length ?? 0,
        ),
      )
      .toBeGreaterThan(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('consent-banner')).toHaveCount(0);
  });

  test('横幅可打开隐私说明弹窗并关闭', async ({ page }) => {
    await gotoFirstVisit(page);
    await page.getByTestId('consent-privacy').click();
    await expect(page.getByRole('dialog')).toContainText('隐私');
    await page.getByRole('dialog').getByRole('button', { name: '关闭弹窗' }).click();
    await expectNoDialog(page);
    await expect(page.getByTestId('consent-banner')).toBeVisible();
  });

  test('页脚可打开独立隐私政策页，正文包含本地存储说明与外链声明', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('footer-privacy-link').click();
    await expect(page).toHaveURL(/\/privacy\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('隐私');
    const main = page.getByRole('main');
    await expect(main).toContainText('localStorage');
    await expect(main).toContainText('第三方站点');
  });

  test('「清除所有本地数据」需要二次确认，确认后清空并恢复默认外观', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('site-card').first().getByTestId('favorite-button').click();
    await page.getByTestId('settings-trigger').click();
    await page.getByTestId('clear-all-data').click();

    const confirm = page.getByRole('dialog').filter({ hasText: '清除所有本地数据？' });
    await expect(confirm).toBeVisible();
    await confirm.getByTestId('confirm-accept').click();

    await expect(page.getByTestId('toast').first()).toContainText('已清除');
    expect(await readStore(page, 'nav.favorites')).toBeNull();
    expect(await readStore(page, 'nav.theme')).toBeNull();
    expect(await readStore(page, 'nav.density')).toBeNull();
    expect(await readStore(page, 'nav.recent')).toBeNull();

    await page.keyboard.press('Escape');
    await expectNoDialog(page);
    // 恢复默认：跟随系统（本用例系统为深色）
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('二次确认可以取消，取消后数据不变', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('site-card').first().getByTestId('favorite-button').click();
    const before = await readStore(page, 'nav.favorites');
    await page.getByTestId('settings-trigger').click();
    await page.getByTestId('clear-all-data').click();
    await page.getByRole('dialog').filter({ hasText: '清除所有本地数据？' }).getByRole('button', { name: '取消' }).click();
    expect(await readStore(page, 'nav.favorites')).toEqual(before);
  });

  test('localStorage 不可用时静默降级，页面仍可正常使用', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('localStorage is disabled');
        },
      });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('site-card').first()).toBeVisible();

    // 收藏仍然可用（内存态），不会抛错
    const star = page.getByTestId('site-card').first().getByTestId('favorite-button');
    await star.click();
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('toast').first()).toBeVisible();
  });
});

test.describe('SEO 与路由（PRD 4.2）', () => {
  test('首页含完整 meta、OG、Twitter Card 与 JSON-LD', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/宇宙无敌导航/);
    const head = await page.evaluate(() => ({
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      twitter: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
        (s) => s.textContent ?? '',
      ),
    }));
    expect(head.description).toBeTruthy();
    expect(head.ogTitle).toBeTruthy();
    expect(head.ogImage).toContain('/og.png');
    expect(head.twitter).toBe('summary_large_image');
    expect(head.canonical).toBeTruthy();
    expect(head.jsonLd.join(' ')).toContain('WebSite');
    expect(head.jsonLd.join(' ')).toContain('CollectionPage');
  });

  test('语义化结构：header / nav / main / section / footer 与 h1→h2 层级', async ({ page }) => {
    await gotoHome(page);
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const h2Count = await page.getByRole('heading', { level: 2 }).count();
    expect(h2Count).toBeGreaterThan(0);
    // 卡片列表使用 ul/li 语义
    await expect(page.locator('[data-testid="site-grid"]')).toHaveJSProperty('tagName', 'UL');
  });

  test('sitemap.xml 与 robots.txt 可访问且包含分类路由', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain('/category/dev-tools/');
    expect(xml).toContain('/privacy/');

    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('Sitemap:');
  });

  test('未知路径返回 404 页面并可返回首页', async ({ page }) => {
    await page.goto('/not-a-real-page/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('页面不存在');
    await page.getByRole('link', { name: /返回首页/ }).click();
    await expect(page.getByTestId('site-card').first()).toBeVisible();
  });
});
