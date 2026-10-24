import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * E2E 跑在静态导出产物（out/）之上，与线上部署形态一致。
 * 使用本机已安装的 Google Chrome（channel: 'chrome'），无需额外下载浏览器。
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'dark',
    // 关闭入场动画与平滑滚动，避免元素在动画/滚动过程中被判定为不可点击
    // （站点在 prefers-reduced-motion 下同样会降级，这里等价于真实用户的无动画模式）
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'node scripts/serve-out.mjs 4321',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
