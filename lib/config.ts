/**
 * 站点级配置：品牌、SEO 默认值、可替换的外部依赖。
 * 部署到自己的域名时，只需改这里 + 环境变量 NEXT_PUBLIC_SITE_URL。
 */
export const siteConfig = {
  name: '宇宙无敌导航',
  shortName: '宇宙导航',
  tagline: '3 秒找到你要的技术站点',
  description:
    '面向技术从业者的高效导航页：精选开发工具、设计资源、云服务、社区与 AI 工具，支持分类过滤、全局搜索、收藏与深浅色主题。',
  /** 部署域名，用于 canonical / OG / sitemap；构建时可用 NEXT_PUBLIC_SITE_URL 覆盖 */
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://nav.example.com',
  locale: 'zh-CN',
  author: '宇宙无敌导航团队',
  keywords: [
    '导航页',
    '开发者导航',
    '前端导航',
    '技术站点',
    '开发工具',
    '设计资源',
    'AI 工具',
    '云服务',
  ],
  /** 反馈入口：置空表示使用内置表单 + 本地假后端（可替换为真实接口） */
  feedback: {
    /** 例如 'https://example.com/feedback'，配置后「反馈」会改为跳转该地址 */
    externalFormUrl: '' as string,
  },
  /** 统计工具：PRD 4.6 指定隐私友好方案，接入时替换 endpoint 即可 */
  analytics: {
    provider: 'umami' as 'umami' | 'plausible',
    /** 自建实例地址；留空则只写入本地调试缓冲区，不发起网络请求 */
    endpoint: '',
  },
} as const;

export const navLinks = [
  { href: '/', label: '全部站点' },
  { href: '/category/dev-tools/', label: '开发工具' },
  { href: '/category/design/', label: '设计资源' },
  { href: '/category/cloud/', label: '云服务' },
  { href: '/category/community/', label: '社区' },
  { href: '/category/ai/', label: 'AI 工具' },
  { href: '/category/docs/', label: '学习文档' },
] as const;
