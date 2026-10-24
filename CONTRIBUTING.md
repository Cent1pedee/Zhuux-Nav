# 贡献指南

## 开发流程

```bash
corepack enable        # 首次：按 packageManager 字段启用 pnpm
pnpm install
pnpm dev               # http://127.0.0.1:4321
pnpm check             # 提交前必跑：数据校验 + 类型 + lint + 构建
pnpm test              # 数据校验 + 类型 + E2E（含 axe 无障碍）
```

依赖管理统一使用 **pnpm 9**，锁文件为 `pnpm-lock.yaml`。禁止提交 `package-lock.json` / `yarn.lock`，也不要混用 `npm install`（会污染 `node_modules` 并生成第二份锁文件）。

## 数据规范

- 站点与分类只放 `data/*.json`，**不要**把站点信息硬编码进组件。
- 站点字段：

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | string | kebab-case、全局唯一，且不能占用保留路由（favorites/recent/settings/search/privacy/api） |
| `name` | string | 非空 |
| `url` | string | 必须是 `http(s)://` 绝对地址 |
| `description` | string | 一句话描述，建议 ≤ 40 字 |
| `category` | string | 必须是 `categories.json` 中的一级分类 id |
| `subcategory` | string | 必须属于该一级分类 |
| `tags` | string[] | 至少 1 个，用于搜索与展示 |
| `featured` | boolean? | 可选，推荐位标记 |

- 分类字段：`id`、`name`、`description`、`subcategories[{ id, name }]`。
- 修改后必须能通过 `pnpm validate:data`，否则 `pnpm build` 会失败（这是有意的 CI 门禁）。

## 代码规范

- TypeScript strict，禁止 `any`（eslint 报错）；未使用变量以下划线开头表示有意忽略。
- 组件放 `components/`，纯逻辑放 `lib/`，页面只做编排。
- 任何新增交互组件必须：
  - 绑定真实事件处理，不允许空 `onClick` 或占位按钮；
  - 弹层必须支持 Esc 关闭、焦点陷阱、关闭后焦点归还；
  - 图标按钮必须有 `aria-label`；
  - 补充对应 Playwright 用例（含 `data-testid`）。
- 动效只动画 `transform` / `opacity`，并在 `prefers-reduced-motion: reduce` 下降级为 0ms。
- 装饰性组件（`components/magicui/`）只允许用在推荐位或空态，必须 `pointer-events-none` 且 `aria-hidden`；新增时同步改写为 Tailwind 3 语法（注册表默认是 v4 的 `bg-linear-to-*` / `mask-intersect` 等）。
- 新增可见文案请同时检查深色/浅色两种主题下的对比度（≥ 4.5:1）。

## 手动走查清单

自动化用例覆盖不到「观感」与「手感」，改完交互请按下面 12 条过一遍（`pnpm preview` 后打开 http://127.0.0.1:4321）：

1. **顶栏**：搜索（`⌘K` / `Ctrl+K`）、主题循环、分享、设置逐个点开并关闭，焦点归还触发元素；鼠标在图标上来回移动不应抖动或让搜索框形变。
2. **分类**：点一级 → 只显示该分类并高亮；点二级 → 只显示该二级，标题「一级 · 二级」并出现面包屑；再点同一个应保持选中；「返回全部」回到全部站点；在「全部站点」下直接点二级也应生效。
3. **卡片**：收藏后刷新仍在；「更多」菜单三项均有响应；描述被截断时悬停弹浮层，且卡片与整行高度不变。
4. **搜索**：输入 `doc` 观察高亮，↑/↓ 选择、回车在新标签页打开、Esc 关闭；开合面板时底层页面不应左右位移。
5. **主题**：顶栏按钮循环 跟随系统 → 浅色 → 深色，toast 出现在**右下角**。
6. **设置**：切换主题与密度、导出收藏 JSON、导入刚导出的文件、清除历史、清除所有本地数据（二次确认）；首页「最近浏览」的「清除记录」应就地清空。
7. **页脚**：订阅邮箱校验、隐私政策弹窗与独立页、外链声明。
8. **滚动**：阅读进度条随滚动推进、回顶归零；下滚时顶栏阴影加深、副标题淡出但**高度不变**，下方内容不抖。
9. **滚动 + 切分类**：滚到中段再点侧栏分类，页面应瞬时回到内容顶部，标题与第一行卡片都在视口内。
10. **嵌套弹层**：设置面板里点「清除所有本地数据」→ Esc 只关确认框，再 Esc 才关设置面板，页面恢复可滚动。
11. **首次访问**：底部出现 Cookie 同意横幅时点主题按钮，Toast 应在横幅**上方**；点「仅必要」后横幅消失、Toast 回到底部。
12. **移动端（375px）**：横向分类 chips、卡片按钮常驻、弹层可滚动。

## 提交前检查清单

- [ ] `pnpm check` 通过
- [ ] `pnpm test` 通过（含 axe 无 serious/critical）
- [ ] 未新增 `package-lock.json` / `yarn.lock`
- [ ] 新增交互有对应 E2E 用例
- [ ] 数据变更已通过 `validate:data`
- [ ] 未引入需求之外的组件或功能
