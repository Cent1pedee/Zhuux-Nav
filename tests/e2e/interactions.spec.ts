import { test, expect, gotoHome, readStore, expectNoDialog, expectNewTab, closeTab } from './fixtures';

test.describe('全局搜索（PRD 3.1.3）', () => {
  test('输入即出下拉，键盘上下 + 回车可跳转', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('search-trigger').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const input = page.getByTestId('search-input');
    await expect(input).toBeFocused();
    await input.fill('github');
    await expect(page.getByTestId('search-result').first()).toBeVisible();
    await expect(page.getByTestId('search-result').first()).toContainText('GitHub');

    await input.press('ArrowDown');
    await expect(page.getByTestId('search-result').nth(1)).toHaveAttribute('aria-selected', 'true');

    // 选中项会在新窗口打开目标站点
    const opened = await expectNewTab(page.context(), () => input.press('Enter'));
    expect(opened.url()).toMatch(/^https?:\/\//);
    await expectNoDialog(page);
    await closeTab(page, opened);
  });

  test('⌘K / Ctrl+K 唤起搜索，Esc 关闭并归还焦点', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('search-trigger').focus();
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expectNoDialog(page);
    await expect(page.getByTestId('search-trigger')).toBeFocused();
  });

  test('无结果时显示推荐站点，点击推荐可回填关键词', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('search-trigger').click();
    await page.getByTestId('search-input').fill('zzzzzz-not-exist');
    const empty = page.getByTestId('search-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('没有找到');

    const suggestion = empty.getByRole('button').first();
    const name = (await suggestion.textContent())?.trim() ?? '';
    await suggestion.click();
    await expect(page.getByTestId('search-input')).toHaveValue(name.slice(0, 6));
  });

  test('搜索行为会写入埋点缓冲区（需先同意统计）', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nav.consent', JSON.stringify('granted')));
    await gotoHome(page);
    await page.getByTestId('search-trigger').click();
    await page.getByTestId('search-input').fill('react');
    await page.waitForTimeout(400);
    const events = await page.evaluate(
      () => (window as unknown as { __NAV_ANALYTICS__?: { name: string }[] }).__NAV_ANALYTICS__ ?? [],
    );
    expect(events.some((e) => e.name === 'search')).toBe(true);
    expect(events.some((e) => e.name === 'page_view')).toBe(true);
  });
});

test.describe('收藏（PRD 3.2.1）', () => {
  test('星标切换、写入 localStorage、收藏区展示', async ({ page }) => {
    await gotoHome(page);
    const card = page.getByTestId('site-card').first();
    const siteId = await card.getAttribute('data-site-id');
    const star = card.getByTestId('favorite-button');
    await expect(star).toHaveAttribute('aria-pressed', 'false');

    await star.click();
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    expect(await readStore(page, 'nav.favorites')).toEqual([siteId]);
    await expect(page.getByRole('heading', { name: /我的收藏/ })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloadedStar = page.locator(`[data-site-id="${siteId}"] [data-testid="favorite-button"]`);
    await expect(reloadedStar).toHaveAttribute('aria-pressed', 'true');

    await reloadedStar.click();
    await expect(reloadedStar).toHaveAttribute('aria-pressed', 'false');
    expect(await readStore(page, 'nav.favorites')).toEqual([]);
  });

  test('设置面板可导出收藏 JSON', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('site-card').first().getByTestId('favorite-button').click();
    await page.getByTestId('settings-trigger').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-favorites').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/favorites.*\.json/);
  });

  test('导入收藏 JSON 会合并并去重', async ({ page }) => {
    await gotoHome(page);
    const ids = await page.getByTestId('site-card').evaluateAll((nodes) =>
      nodes.slice(0, 3).map((n) => n.getAttribute('data-site-id')),
    );
    await page.getByTestId('settings-trigger').click();
    await page.getByTestId('import-favorites-input').setInputFiles({
      name: 'favorites.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(ids)),
    });
    await expect(page.getByTestId('toast').first()).toContainText('已导入');
    expect(await readStore(page, 'nav.favorites')).toEqual(ids);
  });
});

test.describe('浏览历史（PRD 3.3.3）', () => {
  test('点击站点会真的在新窗口打开，并记录到历史', async ({ page }) => {
    await gotoHome(page);
    const first = page.getByTestId('site-card').first();
    const siteId = await first.getAttribute('data-site-id');
    const opened = await expectNewTab(page.context(), () => first.getByRole('link').first().click());
    expect(opened.url()).toMatch(/^https?:\/\//);

    const recent = (await readStore(page, 'nav.recent')) as { id: string }[];
    expect(recent[0]?.id).toBe(siteId);
    await expect(page.getByRole('heading', { name: /最近浏览/ })).toBeVisible();
    await closeTab(page, opened);
  });

  test('最多保留 10 条且倒序（第 11 次起淘汰最旧记录）', async ({ page }) => {
    // 阻止真正打开新窗口，只验证历史记录逻辑，避免测试依赖 12 个外部标签页
    await page.addInitScript(() => {
      document.addEventListener(
        'click',
        (event) => {
          const anchor = (event.target as HTMLElement | null)?.closest?.('a[target="_blank"]');
          if (anchor) event.preventDefault();
        },
        true,
      );
    });
    await gotoHome(page);

    const cards = page.getByTestId('site-card');
    const ids: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const card = cards.nth(i);
      ids.push((await card.getAttribute('data-site-id')) ?? '');
      await card.getByRole('link').first().click();
    }

    const recent = (await readStore(page, 'nav.recent')) as { id: string; at: number }[];
    expect(recent).toHaveLength(10);
    // 倒序：最后一次点击排在最前，最早的两条被淘汰
    expect(recent.map((r) => r.id)).toEqual(ids.slice(2).reverse());

    await page.getByRole('heading', { name: /最近浏览/ }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /最近浏览/ })).toBeVisible();
  });

  test('最近浏览区块的「清除记录」就地清空并给出 toast', async ({ page }) => {
    await gotoHome(page);
    const opened = await expectNewTab(page.context(), () =>
      page.getByTestId('site-card').first().getByRole('link').first().click(),
    );
    await closeTab(page, opened);

    await expect(page.getByRole('heading', { name: /最近浏览/ })).toBeVisible();
    await page.getByTestId('recent-clear').click();
    await page.getByTestId('confirm-accept').click();
    expect(await readStore(page, 'nav.recent')).toEqual([]);
    await expect(page.getByTestId('toast').first()).toContainText('已清除浏览历史');
    await expect(page.getByRole('heading', { name: /最近浏览/ })).toHaveCount(0);
  });

  test('嵌套弹层只关闭最上层，滚动锁按栈释放', async ({ page }) => {
    // 回归：每个 Modal 都在 document 上挂捕获阶段 keydown，stopPropagation 拦不住同节点上的其它监听，
    // 早先按一次 Esc 会把设置面板和确认框一起关掉，且滚动锁被内层提前释放（页面能滚、弹层还在）。
    await gotoHome(page);
    await page.getByTestId('settings-trigger').click();
    await page.getByTestId('clear-all-data').click();
    await expect(page.getByRole('dialog')).toHaveCount(2);

    await page.keyboard.press('Escape');
    // 只关掉确认框，设置面板仍在，且页面依旧被锁住不能滚动
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await page.keyboard.press('Escape');
    await expectNoDialog(page);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await expect(page.getByTestId('settings-trigger')).toBeFocused();
  });

  test('设置面板可清除浏览历史', async ({ page }) => {
    await gotoHome(page);
    const opened = await expectNewTab(page.context(), () =>
      page.getByTestId('site-card').first().getByRole('link').first().click(),
    );
    await closeTab(page, opened);

    await page.getByTestId('settings-trigger').click();
    await page.getByRole('dialog').getByRole('button', { name: '清除', exact: true }).click();
    await page.getByTestId('confirm-accept').click();
    expect(await readStore(page, 'nav.recent')).toEqual([]);
  });
});

test.describe('分享 / 订阅 / 反馈（PRD 3.2）', () => {
  test('分享弹窗可复制链接并出现 toast', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await gotoHome(page);
    await page.getByRole('button', { name: '分享本页' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByTestId('copy-page').click();
    await expect(page.getByTestId('toast').first()).toContainText('已复制');
    await page.getByRole('dialog').getByRole('button', { name: '关闭弹窗' }).click();
    await expectNoDialog(page);
  });

  test('订阅表单：非法邮箱拦截，合法邮箱提交成功', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('footer-subscribe').click();
    const input = page.getByTestId('subscribe-email');
    await input.fill('not-an-email');
    await page.getByTestId('subscribe-submit').click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('请输入有效的邮箱地址');

    await input.fill('dev@example.com');
    await page.getByTestId('subscribe-submit').click();
    await expect(page.getByText('已记录 dev@example.com')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: '完成' }).click();
    await expectNoDialog(page);
  });

  test('反馈表单：校验必填与长度，提交后落库并关闭', async ({ page }) => {
    await gotoHome(page);
    const card = page.getByTestId('site-card').first();
    await card.getByTestId('more-button').click();
    await page.getByTestId('site-menu').getByRole('menuitem', { name: '反馈问题' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('反馈「');

    await page.getByTestId('feedback-submit').click();
    await expect(dialog.getByRole('alert')).toContainText('至少填写 5 个字');

    await page.getByTestId('feedback-message').fill('这个站点的链接已经失效了');
    await page.getByRole('radio', { name: '链接失效' }).check({ force: true });
    await page.getByTestId('feedback-submit').click();
    await expect(page.getByTestId('toast').first()).toContainText('反馈已提交');
    await expectNoDialog(page);

    const records = (await readStore(page, 'nav.feedback')) as { message: string }[];
    expect(records.at(-1)?.message).toContain('链接已经失效');
  });

  test('卡片菜单支持 Esc 关闭并归还焦点', async ({ page }) => {
    await gotoHome(page);
    const card = page.getByTestId('site-card').first();
    const trigger = card.getByTestId('more-button');
    await trigger.click();
    await expect(page.getByTestId('site-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('site-menu')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
