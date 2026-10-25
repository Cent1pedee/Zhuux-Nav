import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: '隐私政策',
  description: `${siteConfig.name}的隐私政策：我们不收集个人身份信息，统计数据仅在获得同意后采集，收藏与偏好只保存在本地浏览器。`,
  alternates: { canonical: '/privacy/' },
  robots: { index: true, follow: true },
};

const SECTIONS = [
  {
    title: '1. 我们收集什么',
    body: [
      '默认情况下，本站不收集任何可识别个人身份的信息，也不要求注册或登录。',
      '在你点击「允许统计」后，我们才会向隐私友好的统计服务发送聚合事件：页面访问、站点点击（站点 ID、名称、分类、点击位置）、搜索关键词与结果数量、收藏与主题切换。这些事件不包含 IP 明文、不做跨站追踪、不用于广告画像。',
      '如果你点击「仅必要」或浏览器开启了「请勿追踪（DNT）」，我们不会加载任何统计脚本。',
    ],
  },
  {
    title: '2. 本地存储（localStorage）',
    body: [
      '收藏列表、最近浏览记录（最多 10 条）、主题偏好、布局密度、反馈草稿与统计同意状态保存在你浏览器的 localStorage 中，键名统一以 nav. 开头。',
      '这些数据不会上传到服务器，仅用于在你自己的设备上恢复使用偏好。清除浏览器数据或使用「清除所有本地数据」按钮即可删除。',
    ],
  },
  {
    title: '3. Cookie',
    body: [
      '本站不使用广告 Cookie，也不设置用于跨站追踪的持久化标识。若未来引入必要的功能性 Cookie，会在此页面更新说明并重新征求同意。',
    ],
  },
  {
    title: '4. 外部链接',
    body: [
      '所有站点卡片均在新窗口打开第三方网站。我们无法控制第三方站点的内容与隐私实践，你离开本站后的行为受该网站自身的隐私政策约束。',
      '提交反馈时若填写了邮箱，该邮箱仅用于回复本次反馈，不会用于营销。',
    ],
  },
  {
    title: '5. 你的控制权',
    body: [
      '你可以随时在设置面板中撤回统计同意、清除收藏与浏览历史，或一键清除全部本地数据。',
      '如需删除已提交的反馈记录（当前保存在本地），可在设置面板中清除本地数据，或通过站点反馈渠道联系我们。',
    ],
  },
  {
    title: '6. 数据保留与变更',
    body: [
      '聚合统计数据的保留周期由所选统计服务决定，默认不超过 12 个月。',
      '本政策如有实质性变更，会在本站显著位置提示，并更新本页顶部的最后更新日期。',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-3xl px-3 pb-8 pt-6 sm:px-4">
        <nav aria-label="面包屑" className="mb-3 flex items-center gap-1.5 text-[13px] text-muted">
          <Link href="/" className="transition-colors hover:text-primary-ink">
            全部站点
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-ink">
            隐私政策
          </span>
        </nav>

        <h1 className="text-page-title text-ink">隐私政策</h1>
        <p className="mt-2 text-meta text-muted">
          最后更新：2025 年 1 月 · 适用于 {siteConfig.name}（{siteConfig.url}）
        </p>

        <div className="mt-5 space-y-5">
          {SECTIONS.map((section) => (
            <section key={section.title} className="glass-card rounded-card border border-line/80 p-4">
              <h2 className="text-section-title text-ink">{section.title}</h2>
              <div className="mt-2 space-y-2">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-[13px] leading-6 text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-card border border-dashed border-line/80 px-4 py-3">
          <p className="text-[13px] leading-5 text-muted">
            本页为示例站点（假数据）的隐私政策文本，用于演示合规交互：同意横幅、拒绝统计、清除本地数据入口。
            正式上线前请替换为真实运营主体的政策。
          </p>
          <Link
            href="/"
            className="mt-2 inline-block rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-[13px] font-medium text-primary-ink transition-colors hover:bg-primary/15"
          >
            返回导航页
          </Link>
        </div>
      </main>
      <div className="mx-auto max-w-shell px-3 sm:px-4">
        <Footer />
      </div>
    </>
  );
}
