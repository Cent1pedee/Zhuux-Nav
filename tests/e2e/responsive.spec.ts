import { test, expect, gotoHome, expectNoDialog } from './fixtures';

/**
 * 响应式（PRD 4.4）：断点 640 / 1024 / 1440，最小 320px。
 * 该文件同时运行在 desktop-chrome 与 mobile-chrome（Pixel 7）两个 project。
 */
test.describe('响应式与移动端（PRD 4.4）', () => {
  test('320px 窄屏无横向溢出，网格为单列', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await gotoHome(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const columns = await page
      .getByTestId('site-grid')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);
  });

  test('移动端使用横向分类 chips，桌面端使用左侧栏', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 780 });
    await gotoHome(page);

    // 移动端：顶部横向 chips 可见，左侧栏隐藏
    const mobileNav = page.getByTestId('mobile-category-nav');
    await expect(mobileNav).toBeVisible();
    await expect(page.getByTestId('desktop-category-nav')).toBeHidden();

    // 点击 chips 进入该分类（单选导航语义）
    await mobileNav.getByRole('button', { name: 'AI 工具' }).click();
    await expect(page.getByTestId('page-title')).toHaveText('AI 工具');
    await expect(page.getByTestId('current-scope')).toBeVisible();
    await expect(page.getByTestId('site-card').first()).toBeVisible();
  });

  test('移动端选中一级分类后出现二级 chips，可下钻到二级分类', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHome(page);

    // 未选分类时不显示二级条（避免与一级 chips 挤在一起）
    await expect(page.getByTestId('mobile-subcategory-nav')).toHaveCount(0);

    await page.getByTestId('mobile-category-nav').getByRole('button', { name: '开发工具' }).click();
    await expect(page.getByTestId('page-title')).toHaveText('开发工具');

    const subNav = page.getByTestId('mobile-subcategory-nav');
    await expect(subNav).toBeVisible();
    await subNav.getByRole('button', { name: '代码托管' }).click();
    await expect(page.getByTestId('page-title')).toHaveText('开发工具 · 代码托管');
    await expect(page.getByTestId('site-card')).toHaveCount(4);

    // 回到「全部」时二级条随之收起
    await page.getByTestId('mobile-category-nav').getByRole('button', { name: '全部' }).click();
    await expect(page.getByTestId('page-title')).toHaveText('全部站点');
    await expect(page.getByTestId('mobile-subcategory-nav')).toHaveCount(0);
  });

  test('移动端搜索弹层可全屏使用并可用 Esc 关闭', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHome(page);
    await page.getByTestId('search-trigger').click();
    await expect(page.getByTestId('search-input')).toBeVisible();
    await page.getByTestId('search-input').fill('figma');
    await expect(page.getByTestId('search-result').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expectNoDialog(page);
  });

  test('移动端设置面板可滚动且按钮可点', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await gotoHome(page);
    await page.getByTestId('settings-trigger').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('theme-option-light').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await dialog.getByTestId('density-option-compact').click();
    await expect(dialog.getByTestId('density-option-compact')).toHaveAttribute('aria-checked', 'true');
  });

  /*
   * 回归用例：打开弹层不能引起底层页面横向位移。
   * 历史缺陷是锁定滚动时用 overflow:hidden 让经典滚动条消失，
   * 视口变宽导致内容整体右移；同时锁 html 会让 sticky 顶栏退化成静态定位。
   */
  test('打开与关闭弹层时底层页面不发生横向位移，顶栏保持吸顶', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);

    const measure = () =>
      page.evaluate(() => {
        const main = document.querySelector('main') as HTMLElement;
        const header = document.querySelector('header') as HTMLElement;
        const rect = main.getBoundingClientRect();
        return {
          mainX: Math.round(rect.x),
          mainWidth: Math.round(rect.width),
          headerTop: Math.round(header.getBoundingClientRect().top),
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

    const before = await measure();

    await page.getByTestId('search-trigger').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    const opened = await measure();
    expect(opened.mainX).toBe(before.mainX);
    expect(opened.mainWidth).toBe(before.mainWidth);
    expect(opened.scrollWidth).toBe(before.scrollWidth);

    // 弹层打开时向下滚动：顶栏必须仍然吸顶（top === 0）
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(150);
    expect((await measure()).headerTop).toBe(0);

    await page.keyboard.press('Escape');
    await expectNoDialog(page);
    const closed = await measure();
    expect(closed.mainX).toBe(before.mainX);
    expect(closed.mainWidth).toBe(before.mainWidth);
    expect(await page.evaluate(() => getComputedStyle(document.body).paddingRight)).toBe('0px');
  });

  /*
   * 回归用例：首次访问时同意横幅与右下角 Toast 都贴底，小屏上会互相遮挡。
   * 横幅可见时把自身高度写入 `--consent-h`，Toast 区据此上移。
   */
  test('同意横幅可见时，右下角 Toast 不与其重叠', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // 夹具默认已写入「统计已拒绝」，这里清掉并关闭默认注入后刷新，模拟真正的首次访问
    await page.evaluate(() => {
      localStorage.removeItem('nav.consent');
      sessionStorage.setItem('e2e.skipDefaults', '1');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('consent-banner')).toBeVisible();
    await expect(page.getByTestId('site-card').first()).toBeVisible();

    await page.getByTestId('theme-toggle').click();
    const toast = page.getByTestId('toast').first();
    await expect(toast).toBeVisible();

    const boxes = await page.evaluate(() => {
      const pick = (id: string) => document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect();
      const banner = pick('consent-banner');
      const tip = document.querySelector('[data-testid="toast"]')!.getBoundingClientRect();
      return {
        bannerTop: banner.top,
        toastBottom: tip.bottom,
        overlap: !(tip.right < banner.left || tip.left > banner.right || tip.bottom < banner.top || tip.top > banner.bottom),
      };
    });
    expect(boxes.overlap).toBe(false);
    expect(boxes.toastBottom).toBeLessThanOrEqual(boxes.bannerTop);

    // 拒绝后横幅消失，Toast 区回到贴底位置
    await page.getByTestId('consent-deny').click();
    await expect(page.getByTestId('consent-banner')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--consent-h').trim()))
      .toBe('');
  });

  test('1440px 下紧凑密度为 6 列、舒适密度为 4 列', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);

    const grid = page.getByTestId('site-grid');
    await page.getByTestId('density-comfortable').click();
    expect(
      await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
    ).toBe(4);

    await page.getByTestId('density-compact').click();
    expect(
      await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
    ).toBe(6);
  });
});
