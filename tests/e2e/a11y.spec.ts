import AxeBuilder from '@axe-core/playwright';
import { test, expect, gotoHome, expectNoDialog } from './fixtures';

/**
 * 无障碍（PRD 4.3）：axe-core 扫描，要求没有 serious / critical 级违规。
 */
async function scan(page: Parameters<typeof gotoHome>[0], context?: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    blocking.map((v) => `${v.id} (${v.impact}) × ${v.nodes.length}: ${v.help}`),
    `${context ?? '页面'} 存在 serious/critical 级无障碍违规`,
  ).toEqual([]);
}

test.describe('无障碍（PRD 4.3）', () => {
  test('首页无 serious/critical 违规', async ({ page }) => {
    await gotoHome(page);
    await scan(page, '首页');
  });

  test('搜索弹层打开时无违规，且焦点在输入框内', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('search-trigger').click();
    await page.getByTestId('search-input').fill('git');
    await expect(page.getByTestId('search-result').first()).toBeVisible();
    await scan(page, '搜索弹层');
    await expect(page.getByTestId('search-input')).toBeFocused();
  });

  test('设置弹层打开时无违规', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('settings-trigger').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await scan(page, '设置弹层');
  });

  test('分类页与隐私页无违规', async ({ page }) => {
    await page.goto('/category/ai/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('site-card').first()).toBeVisible();
    await scan(page, '分类页');

    await page.goto('/privacy/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await scan(page, '隐私政策页');
  });

  test('键盘可完成主要操作：Tab 聚焦、Enter 触发、Esc 关闭', async ({ page }) => {
    await gotoHome(page);
    // 首个可聚焦元素是「跳到主要内容」，第二个是 Logo 链接
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '跳到主要内容' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /Zhuux导航页/ }).first()).toBeFocused();

    // 通过键盘打开设置弹层
    await page.getByTestId('settings-trigger').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expectNoDialog(page);
    await expect(page.getByTestId('settings-trigger')).toBeFocused();
  });

  test('弹层内 Tab 循环不会跑出弹层', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('settings-trigger').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const inDialog = await dialog.evaluate((node) => node.contains(document.activeElement));
      expect(inDialog).toBe(true);
    }
  });

  test('图标按钮都有可读的无障碍名称', async ({ page }) => {
    await gotoHome(page);
    const unnamed = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons
        .filter((b) => {
          const text = (b.textContent ?? '').trim();
          return !text && !b.getAttribute('aria-label') && !b.getAttribute('aria-labelledby');
        })
        .map((b) => b.getAttribute('data-testid') ?? b.outerHTML.slice(0, 80));
    });
    expect(unnamed).toEqual([]);
  });
});
