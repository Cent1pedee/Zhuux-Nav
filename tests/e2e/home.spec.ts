import { test, expect, gotoHome, readStore, expectNoDialog } from './fixtures';

test.describe('首屏与基础展示（PRD 3.1）', () => {
  test('首屏渲染站点网格、分类导航与页脚', async ({ page }) => {
    await gotoHome(page);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('全部站点');
    await expect(page.getByTestId('site-card')).toHaveCount(76);
    await expect(page.getByRole('navigation', { name: '分类导航' })).toBeVisible();
    // 顶栏不再重复承载分类导航（分类只在侧栏 / 移动端 chips 里出现一次）
    await expect(page.getByRole('navigation', { name: '主导航' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: '分类快捷导航' })).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toBeVisible();

    // 每张卡片都是一个可在新窗口打开的链接，且带可读的无障碍名称
    const firstCard = page.getByTestId('site-card').first();
    const link = firstCard.getByRole('link').first();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    // 无障碍名称由可见文本 + sr-only 说明组成（不使用 aria-label 覆盖可见文本）
    await expect(link).toContainText('在新窗口打开');
    await expect(link).toHaveAccessibleName(/在新窗口打开/);
  });

  test('卡片显示 favicon、名称、描述与分类标签', async ({ page }) => {
    await gotoHome(page);
    const card = page.getByTestId('site-card').first();
    await expect(card.locator('img').first()).toHaveAttribute('loading', 'lazy');
    await expect(card).toContainText(/开发|设计|云|社区|AI|文档/);
  });

  test('骨架屏在数据返回前出现，数据就绪后替换为网格', async ({ page }) => {
    // 延迟数据响应，观察骨架屏
    await page.route('**/data/sites.json', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('grid-skeleton')).toBeVisible();
    await expect(page.getByTestId('site-card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('grid-skeleton')).toHaveCount(0);
  });

  test('数据加载失败显示空态 + 重试，重试后恢复', async ({ page }) => {
    let fail = true;
    await page.route('**/data/sites.json', async (route) => {
      if (fail) {
        fail = false;
        await route.fulfill({ status: 500, body: 'boom' });
        return;
      }
      await route.continue();
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const errorState = page.getByTestId('error-state');
    await expect(errorState).toBeVisible();
    await expect(errorState).toContainText('站点数据加载失败');

    await page.getByTestId('retry-button').click();
    await expect(page.getByTestId('site-card').first()).toBeVisible();
    await expect(page.getByTestId('error-state')).toHaveCount(0);
  });

  test('点击二级分类只显示该子分类站点，标题显示「一级 · 二级」', async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByTestId('page-title')).toHaveText('全部站点');
    await expect(page.getByTestId('current-scope')).toHaveCount(0);

    // 一级分类：只看该分类（16 个站点）
    await page.getByTestId('category-dev-tools').click();
    await expect(page.getByTestId('site-card')).toHaveCount(16);
    await expect(page.getByTestId('page-title')).toHaveText('开发工具');
    await expect(page.getByTestId('current-scope')).toBeVisible();

    // 二级分类：单选导航语义，只显示「代码托管」的 4 个站点
    await page.getByTestId('subcategory-git').click();
    await expect(page.getByTestId('site-card')).toHaveCount(4);
    await expect(page.getByTestId('page-title')).toHaveText('开发工具 · 代码托管');

    // 再点一次同一子分类仍停留在该子分类（幂等，不会因为「已经是当前项」而误判点击无效）
    await page.getByTestId('subcategory-git').click();
    await expect(page.getByTestId('site-card')).toHaveCount(4);
    await expect(page.getByTestId('page-title')).toHaveText('开发工具 · 代码托管');

    // 点回一级分类，回到该分类全部站点
    await page.getByTestId('category-dev-tools').click();
    await expect(page.getByTestId('site-card')).toHaveCount(16);
    await expect(page.getByTestId('page-title')).toHaveText('开发工具');

    // 换一个一级分类，子分类状态必须被清空
    await page.getByTestId('subcategory-git').click();
    await expect(page.getByTestId('site-card')).toHaveCount(4);
    await page.getByTestId('category-design').click();
    await expect(page.getByTestId('page-title')).toHaveText('设计资源');
    await expect(page.getByTestId('site-card')).toHaveCount(12);

    // 「返回全部」回到全部站点
    await page.getByTestId('scope-clear').click();
    await expect(page.getByTestId('site-card')).toHaveCount(76);
    await expect(page.getByTestId('page-title')).toHaveText('全部站点');
    await expect(page.getByTestId('current-scope')).toHaveCount(0);
  });

  test('「全部站点」状态下直接点二级分类也能生效（无需先点一级分类）', async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByTestId('page-title')).toHaveText('全部站点');

    // 在全部站点状态下展开「开发工具」，直接点它的二级分类
    await page.getByRole('button', { name: '展开开发工具的二级分类' }).click();
    await page.getByTestId('subcategory-git').click();

    // 二级分类必须连带确定所属一级分类：标题显示层级、只显示该子分类站点
    await expect(page.getByTestId('page-title')).toHaveText('开发工具 · 代码托管');
    await expect(page.getByTestId('site-card')).toHaveCount(4);
    await expect(page.getByTestId('current-scope')).toContainText('开发工具');
    await expect(page).toHaveURL(/[?&]c=dev-tools/);
    await expect(page).toHaveURL(/[?&]s=git/);

    // 回到全部站点后再点另一个分类下的二级分类，同样生效
    await page.getByTestId('category-all').click();
    await expect(page.getByTestId('page-title')).toHaveText('全部站点');
    await page.getByRole('button', { name: '展开设计资源的二级分类' }).click();
    await page.getByTestId('subcategory-inspiration').click();
    await expect(page.getByTestId('page-title')).toHaveText('设计资源 · 灵感社区');
    await expect(page.getByTestId('site-card')).toHaveCount(4);

    // 只带 ?s= 的深链接也要能反查出所属一级分类
    await page.goto('/?s=git');
    await expect(page.getByTestId('page-title')).toHaveText('开发工具 · 代码托管');
    await expect(page.getByTestId('site-card')).toHaveCount(4);
  });

  test('滚动到中段切换分类后，视口回到内容顶部而不是停在半截卡片处', async ({ page }) => {
    // 回归：卡片从 76 张缩到 12 张时文档高度骤降，浏览器会把 scrollY 夹到新的最大值，
    // 用户会停在「标题已滚出视口、第一行卡片只剩半截」的位置。
    await gotoHome(page);
    await page.evaluate(() => window.scrollTo(0, 2200));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(1500);

    await page.getByTestId('category-ai').click();
    await expect(page.getByTestId('page-title')).toHaveText('AI 工具');
    await expect(page.getByTestId('site-card')).toHaveCount(12);

    // 内容顶部（标题所在列）应回到吸顶栏下方，标题自身也要落在视口内
    await expect
      .poll(() => page.evaluate(() => Math.round(document.querySelector('[data-testid="content-top"]')!.getBoundingClientRect().top)))
      .toBeLessThan(120);
    const titleTop = await page.getByTestId('page-title').evaluate((node) => Math.round(node.getBoundingClientRect().top));
    expect(titleTop).toBeGreaterThan(0);
    expect(titleTop).toBeLessThan(200);
  });

  test('首屏刚出现就点击侧栏分类，第一次点击即生效', async ({ page }) => {
    // 回归：水合时若跑 View Transition 会冻结整页命中测试约 270ms，
    // 用户在此时点击会落空（表现为「第一次点没反应，点第二次才行」）。
    await page.goto('/', { waitUntil: 'commit' });
    const button = page.getByTestId('category-design');
    await button.waitFor();
    const box = await button.boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    await expect(page.getByTestId('page-title')).toHaveText('设计资源');
    await expect(page.getByTestId('site-card')).toHaveCount(12);
  });

  test('点 Logo 回首页会清空侧栏已选分类，深链接可直接还原', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('category-design').click();
    await expect(page.getByTestId('page-title')).toHaveText('设计资源');
    expect(page.url()).toContain('?c=design');

    // 顶栏已不再放分类链接，回到「全部站点」的入口是 Logo 与侧栏的「全部站点」
    await page.getByRole('link', { name: /首页$/ }).click();
    await expect(page.getByTestId('page-title')).toHaveText('全部站点');
    await expect(page.getByTestId('site-card')).toHaveCount(76);
    expect(page.url()).not.toContain('?c=');

    // 从分类页回到首页同样不能残留上一个分类
    await page.getByRole('link', { name: /首页$/ }).click();
    await page.getByTestId('category-dev-tools').click();
    await expect(page.getByTestId('page-title')).toHaveText('开发工具');
    await page.getByRole('link', { name: /首页$/ }).click();
    await expect(page.getByTestId('page-title')).toHaveText('全部站点');

    // 深链接（可分享的筛选地址）直接还原到「开发工具 · 代码托管」
    await page.goto('/?c=dev-tools&s=git', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('page-title')).toHaveText('开发工具 · 代码托管');
    await expect(page.getByTestId('site-card')).toHaveCount(4);
  });

  test('阅读进度条随滚动推进，回到顶部归零', async ({ page }) => {
    await gotoHome(page);
    const header = page.locator('header');
    const barWidth = async () =>
      header.evaluate((el) => {
        const span = [...el.querySelectorAll('span')].find((s) => s.className.includes('from-primary-solid'));
        return span ? span.getBoundingClientRect().width : -1;
      });

    // 顶部：进度条宽度为 0（不能用 useScroll，骨架阶段会把进度算成 1）
    expect(await barWidth()).toBe(0);

    await page.evaluate(() => window.scrollTo(0, 1600));
    await expect.poll(barWidth, { timeout: 5_000 }).toBeGreaterThan(200);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(barWidth, { timeout: 5_000 }).toBe(0);
  });

  test('?q= 深链接会自动打开搜索面板并预填关键词（与 JSON-LD SearchAction 对应）', async ({ page }) => {
    await page.goto('/?q=git', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('search-input')).toHaveValue('git');
    await expect(page.getByTestId('search-result').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expectNoDialog(page);
    // 关闭后再次点搜索按钮，输入框不应残留上次的关键词
    await page.getByTestId('search-trigger').click();
    await expect(page.getByTestId('search-input')).toHaveValue('');
  });

  test('空结果页提供「直接搜索站点」入口，点击即打开搜索面板', async ({ page }) => {
    /*
     * 单选导航语义下，正常数据不会出现「分类里有 0 个站点」，
     * 所以这里把站点数据裁到只剩「设计资源」一个分类，
     * 再点「开发工具」制造空态（真实场景对应数据更新后某分类暂时为空）。
     */
    await page.route('**/data/sites.json', async (route) => {
      const response = await route.fetch();
      const all = (await response.json()) as { category: string }[];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(all.filter((site) => site.category === 'design')),
      });
    });

    await gotoHome(page);
    await expect(page.getByTestId('site-card')).toHaveCount(12);

    await page.getByTestId('category-dev-tools').click();
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByTestId('page-title')).toHaveText('开发工具');

    await page.getByTestId('empty-open-search').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('search-input')).toBeVisible();
    await page.keyboard.press('Escape');
    await expectNoDialog(page);

    // 「查看全部站点」也能把用户带回完整列表
    await page.getByTestId('empty-clear-filters').click();
    await expect(page.getByTestId('page-title')).toHaveText('全部站点');
    await expect(page.getByTestId('site-card')).toHaveCount(12);
  });

  test('分类页路由可直接访问并只展示该分类站点', async ({ page }) => {
    await page.goto('/category/dev-tools/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('开发工具导航');
    const cards = page.getByTestId('site-card');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(76);
  });
});

test.describe('主题与布局密度（PRD 3.3）', () => {
  test('主题循环：深色 → 跟随系统 → 浅色 → 深色，并持久化', async ({ page }) => {
    await gotoHome(page);
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // 深色 → 跟随系统（系统为深色，故页面仍为深色，但模式已变）
    await page.getByTestId('theme-toggle').click();
    // toast 区最新一条渲染在 DOM 最前（配合 flex-col-reverse 贴在右下角）
    await expect(page.getByTestId('toast').first()).toContainText('跟随系统');
    expect(await readStore(page, 'nav.theme')).toBe('auto');

    // 跟随系统 → 浅色
    await page.getByTestId('theme-toggle').click();
    await expect(html).not.toHaveClass(/dark/);
    await expect(page.getByTestId('toast').first()).toContainText('浅色');
    expect(await readStore(page, 'nav.theme')).toBe('light');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // 浅色 → 深色
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await readStore(page, 'nav.theme')).toBe('dark');
  });

  test('设置面板可切换主题与密度，并即时生效', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('settings-trigger').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByTestId('density-option-compact').click();
    expect(await readStore(page, 'nav.density')).toBe('compact');
    await page.getByRole('button', { name: '关闭弹窗' }).click();
    await expectNoDialog(page);
    await expect(page.getByTestId('site-grid')).toHaveClass(/xl:grid-cols-6/);

    await page.getByTestId('settings-trigger').click();
    await page.getByTestId('theme-option-light').click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await page.keyboard.press('Escape');
    await expectNoDialog(page);
  });
});

test.describe('Magic UI 装饰层（PRD 7.6：仅推荐位使用）', () => {
  test('只有推荐位卡片带绕边流光，普通卡片没有', async ({ page }) => {
    await gotoHome(page);

    // 数据里 featured: true 的站点共 10 个
    const featuredIds = await page.evaluate(async () => {
      const res = await fetch('/data/sites.json');
      const data = (await res.json()) as Array<{ id: string; featured?: boolean }>;
      return data.filter((s) => s.featured).map((s) => s.id);
    });
    expect(featuredIds.length).toBe(10);

    const beams = page.getByTestId('border-beam');
    await expect(beams).toHaveCount(featuredIds.length);

    // 每一个流光都落在对应推荐位卡片内部，且不拦截点击
    for (const id of featuredIds) {
      const beam = page.locator(`[data-site-id="${id}"]`).getByTestId('border-beam');
      await expect(beam).toHaveCount(1);
      await expect(beam).toHaveCSS('pointer-events', 'none');
    }
    await expect(
      page.locator('[data-site-id="hoppscotch"]').getByTestId('border-beam'),
    ).toHaveCount(0);
  });

  test('空结果页出现流星装饰，且不拦截按钮点击', async ({ page }) => {
    // 只保留设计类站点，再点「开发工具」制造空态
    await page.route('**/data/sites.json', async (route) => {
      const res = await route.fetch();
      const data = (await res.json()) as Array<{ category: string }>;
      await route.fulfill({ json: data.filter((s) => s.category === 'design') });
    });
    await gotoHome(page);
    await page.getByTestId('category-dev-tools').click();

    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByTestId('meteors')).toBeVisible();
    await expect(page.getByTestId('meteors')).toHaveCSS('pointer-events', 'none');

    // 装饰层不能挡住空态里的两个出口按钮
    await page.getByTestId('empty-clear-filters').click();
    await expect(page.getByTestId('site-grid')).toBeVisible();
  });

  test('禁用 JS 时外壳仍可访问，且不会显示「0 个站点」这类假数字', async ({ browser }) => {
    /*
     * 站点数据是运行时 fetch 的，无 JS 时卡片区只有骨架，这是已知限制（README「已知限制」）。
     * 但页头、页脚、分类链接、隐私政策必须仍然可读可点（PRD 4.4）。
     * 另外 Magic UI 的 NumberTicker 原版首帧渲染 startValue=0，
     * 会让无 JS 的页脚写成「当前收录 0 个站点」——这里守住这条底线。
     */
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');

    await expect(page.getByRole('link', { name: /首页$/ })).toBeVisible();
    await expect(page.getByTestId('footer-privacy-link')).toHaveAttribute('href', '/privacy/');
    // 站点数只有客户端拿到数据才准确，无 JS 时退化成一句不含数字的说明
    await expect(page.locator('footer')).toContainText('精选技术站点');
    await expect(page.locator('footer')).not.toContainText('当前收录 0');
    // 卡片数据是运行时 fetch 的，无 JS 时只有 Suspense 的静态骨架（aria-busy），
    // 客户端才有的 grid-skeleton 不会出现在 HTML 里
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    await context.close();
  });

  test('背景网格由 SVG pattern 绘制（不再是两层渐变平铺）', async ({ page }) => {
    await gotoHome(page);
    const backdrop = page.locator('.page-backdrop-grid');
    await expect(backdrop.locator('svg pattern')).toHaveCount(1);
    // 只保留均匀网格：不再有 squares 高亮方块，否则会被标题压出「脏点」
    await expect(backdrop.locator('svg rect')).toHaveCount(1);
  });

  test('主按钮统一为 ShimmerButton（扫光层存在且不拦截点击）', async ({ page }) => {
    await gotoHome(page);

    // 空态与错误态的主按钮也是 ShimmerButton，但常规首页看不到；
    // 这里用「设置面板 → 清除所有本地数据」这条一定会出现主按钮的路径来验证。
    await page.getByTestId('settings-trigger').click();
    await page.getByTestId('clear-all-data').click();
    const accept = page.getByTestId('confirm-accept');
    await expect(accept).toBeVisible();
    await expect(accept).toHaveAttribute('data-shimmer', 'true');

    // 扫光层是纯装饰，不能吃掉按钮自身的点击
    await expect(accept.locator('[aria-hidden="true"]').first()).toHaveCSS(
      'pointer-events',
      'none',
    );
    await accept.click();
    await expect(page.getByTestId('toast').first()).toContainText('已清除');
  });

  test('搜索结果被裁切时，底部用 ProgressiveBlur 逐层模糊提示「下面还有」', async ({ page }) => {
    await gotoHome(page);
    await page.getByTestId('search-trigger').click();
    // 单字母能命中大量结果，保证列表一定被 max-h 裁切
    await page.getByTestId('search-input').fill('a');
    await expect(page.getByTestId('search-result').first()).toBeVisible();

    const blur = page.getByTestId('progressive-blur');
    await expect(blur).toHaveCount(1);
    // 8 层逐级加重的 backdrop-filter
    await expect(blur).toHaveAttribute('data-layers', '8');
    await expect(blur).toHaveCSS('pointer-events', 'none');
  });
});
