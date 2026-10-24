/**
 * 首屏骨架（Suspense fallback 与 SiteGrid 的加载态共用同一套尺寸）。
 *
 * 占位高度刻意贴近真实卡片（实测舒适 188px / 紧凑 176px）：
 * 早先用 104px 时，数据到达后网格突然长高，整页内容被顶下去，
 * 直接拉高 CLS（PRD 4.1 要求 < 0.1）。
 */
export function GridFallback({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
    >
      <span className="sr-only">站点加载中…</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="glass-card h-[188px] rounded-card border border-line/80 p-4">
          <div className="flex items-center gap-2.5">
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-2/5 rounded" />
              <div className="skeleton h-2.5 w-1/4 rounded" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="skeleton h-2.5 w-full rounded" />
            <div className="skeleton h-2.5 w-3/5 rounded" />
          </div>
          <div className="mt-3 flex gap-1.5">
            <div className="skeleton h-5 w-16 rounded-md" />
            <div className="skeleton h-5 w-12 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
