'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, ModalHeader } from '@/components/ui/modal';
import { useAppStore } from '@/components/providers/app-store';
import { useConfirm } from '@/components/providers/confirm';
import { useToast } from '@/components/providers/toast';
import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/cn';
import { buildFavoritesExport, isFavoritesFile } from '@/lib/feedback';
import { track } from '@/lib/analytics';
import {
  CheckIcon,
  DownloadIcon,
  GridIcon,
  MoonIcon,
  RowsIcon,
  SunIcon,
  MonitorIcon,
  TrashIcon,
  CloseIcon,
} from '@/components/icons';
import type { CursorStyle, Density, ThemeMode } from '@/lib/types';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: '浅色', icon: SunIcon },
  { value: 'dark', label: '深色', icon: MoonIcon },
  { value: 'auto', label: '跟随系统', icon: MonitorIcon },
];

const DENSITY_OPTIONS: { value: Density; label: string; hint: string; icon: typeof GridIcon }[] = [
  { value: 'comfortable', label: '舒适', hint: '每行 4 列', icon: GridIcon },
  { value: 'compact', label: '紧凑', hint: '每行 6 列', icon: RowsIcon },
];

const CURSOR_OPTIONS: { value: CursorStyle; label: string; hint: string }[] = [
  { value: 'smooth', label: '缓动指针', hint: '带跟随惯性' },
  { value: 'default', label: '系统指针', hint: '保持原生' },
];

/** 设置面板（PRD 3.3 主题 / 布局密度 / 浏览历史 / 本地数据管理） */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    themeMode,
    setThemeMode,
    density,
    setDensity,
    cursorStyle,
    setCursorStyle,
    favorites,
    recent,
    sites,
    clearFavorites,
    clearRecent,
    clearAllLocalData,
    isFavorite,
    toggleFavorite,
    mergeFavorites,
  } = useAppStore();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const favoriteSites = useMemo(() => sites.filter((s) => isFavorite(s.id)), [sites, isFavorite]);
  const recentSites = useMemo(
    () =>
      recent
        .map((entry) => ({ entry, site: sites.find((s) => s.id === entry.id) }))
        .filter((row): row is { entry: (typeof recent)[number]; site: (typeof sites)[number] } => Boolean(row.site)),
    [recent, sites],
  );

  const handleExport = useCallback(() => {
    if (favoriteSites.length === 0) {
      toast({ title: '还没有收藏的站点', description: '先在卡片右上角点星标收藏几个站点吧。' });
      return;
    }
    const blob = buildFavoritesExport(favoriteSites);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nav-favorites-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({
      title: `已导出 ${favoriteSites.length} 个收藏`,
      description: '文件已开始下载（JSON 格式）。',
      tone: 'success',
    });
  }, [favoriteSites, toast]);

  const handleImportClick = () => fileRef.current?.click();

  const handleImportFile = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const text = await file.text();
        const parsed: unknown = JSON.parse(text);
        const list = Array.isArray(parsed)
          ? parsed
          : (parsed as { sites?: { id?: string }[] }).sites?.map((s) => s.id);
        if (!isFavoritesFile(list)) {
          toast({ title: '文件格式不正确', description: '请选择由本页导出的收藏 JSON。', tone: 'error' });
          return;
        }
        const known = list.filter((id) => sites.some((s) => s.id === id));
        if (known.length === 0) {
          toast({ title: '没有可导入的收藏', description: '文件中的站点均不在当前数据集中。', tone: 'error' });
          return;
        }
        const merged = Array.from(new Set([...favorites, ...known]));
        mergeFavorites(merged);
        toast({
          title: `已导入 ${known.length} 个收藏`,
          description: `当前共 ${merged.length} 个收藏，刷新后仍然保留。`,
          tone: 'success',
        });
        onClose();
      } catch {
        toast({ title: '无法读取文件', description: '请确认选择的是合法的 JSON 文件。', tone: 'error' });
      } finally {
        setImporting(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [favorites, mergeFavorites, onClose, sites, toast],
  );

  const handleClearFavorites = async () => {
    const ok = await confirm({
      title: '清空全部收藏？',
      description: `将移除 ${favorites.length} 个收藏记录，此操作不可撤销。`,
      confirmText: '清空收藏',
      tone: 'danger',
    });
    if (!ok) return;
    clearFavorites();
    toast({ title: '已清空收藏', tone: 'success' });
  };

  const handleClearRecent = async () => {
    const ok = await confirm({
      title: '清除浏览历史？',
      description: `将移除最近 ${recent.length} 条浏览记录，此操作不可撤销。`,
      confirmText: '清除历史',
      tone: 'danger',
    });
    if (!ok) return;
    clearRecent();
    toast({ title: '已清除浏览历史', tone: 'success' });
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: '清除所有本地数据？',
      description:
        '将删除主题、布局密度、收藏、浏览历史与统计同意状态。清除后页面会恢复默认外观，站点数据不受影响。',
      confirmText: '全部清除',
      tone: 'danger',
    });
    if (!ok) return;
    const count = clearAllLocalData();
    toast({
      title: `已清除 ${count} 项本地数据`,
      description: '主题已恢复为跟随系统，统计同意状态已重置。',
      tone: 'success',
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="settings-title"
      describedBy="settings-desc"
      widthClass="max-w-lg"
    >
      <ModalHeader
        id="settings-title"
        title="设置"
        description="所有偏好仅保存在本地浏览器，不会上传。"
        descriptionId="settings-desc"
        onClose={onClose}
      />

      <div className="overflow-y-auto">
        <section className="border-b border-line/70 px-5 py-4" aria-labelledby="settings-theme">
          <h3 id="settings-theme" className="text-[13px] font-semibold text-ink">
            主题
          </h3>
          <p className="mt-0.5 text-meta text-muted">首次访问自动跟随系统偏好。</p>
          <div role="radiogroup" aria-labelledby="settings-theme" className="mt-3 grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const on = themeMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-testid={`theme-option-${option.value}`}
                  onClick={() => {
                    setThemeMode(option.value, { x: window.innerWidth / 2, y: window.innerHeight / 3 });
                    track('theme_change', { theme: option.value, source: 'settings' });
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[13px] transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-silk active:scale-[0.97]',
                    on
                      ? 'border-primary/60 bg-primary/10 text-primary-ink shadow-[0_8px_20px_-18px_rgb(var(--c-primary)/0.9)]'
                      : 'border-line text-muted hover:border-primary/35 hover:bg-ink/5 hover:text-ink',
                  )}
                >
                  <Icon size={17} />
                  {option.label}
                  {on ? <CheckIcon size={11} className="text-primary-ink" /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-b border-line/70 px-5 py-4" aria-labelledby="settings-density">
          <h3 id="settings-density" className="text-[13px] font-semibold text-ink">
            布局密度
          </h3>
          <p className="mt-0.5 text-meta text-muted">桌面端每行显示的卡片数量。</p>
          <div
            role="radiogroup"
            aria-labelledby="settings-density"
            className="mt-3 grid grid-cols-2 gap-2"
          >
            {DENSITY_OPTIONS.map((option) => {
              const Icon = option.icon;
              const on = density === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-testid={`density-option-${option.value}`}
                  onClick={() => {
                    setDensity(option.value);
                    toast({ title: `已切换为${option.label}布局`, description: option.hint });
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-silk active:scale-[0.97]',
                    on
                      ? 'border-primary/60 bg-primary/10 text-primary-ink shadow-[0_8px_20px_-18px_rgb(var(--c-primary)/0.9)]'
                      : 'border-line text-muted hover:border-primary/35 hover:bg-ink/5 hover:text-ink',
                  )}
                >
                  <Icon size={17} />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[13px] font-medium">{option.label}</span>
                    <span className="text-[13px]">{option.hint}</span>
                  </span>
                  {on ? <CheckIcon size={12} className="ml-auto" /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-b border-line/70 px-5 py-4" aria-labelledby="settings-cursor">
          <h3 id="settings-cursor" className="text-[13px] font-semibold text-ink">
            指针样式
          </h3>
          <p className="mt-0.5 text-meta text-muted">
            缓动指针会跟随鼠标带一点惯性；触屏设备与「减少动态效果」下自动停用。
          </p>
          <div
            role="radiogroup"
            aria-labelledby="settings-cursor"
            className="mt-3 grid grid-cols-2 gap-2"
          >
            {CURSOR_OPTIONS.map((option) => {
              const on = cursorStyle === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-testid={`cursor-option-${option.value}`}
                  onClick={() => {
                    setCursorStyle(option.value);
                    toast({
                      title: `已切换为${option.label}`,
                      description: option.hint,
                    });
                  }}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-silk active:scale-[0.97]',
                    on
                      ? 'border-primary/60 bg-primary/10 text-primary-ink shadow-[0_8px_20px_-18px_rgb(var(--c-primary)/0.9)]'
                      : 'border-line text-muted hover:border-primary/35 hover:bg-ink/5 hover:text-ink',
                  )}
                >
                  <span className="flex w-full items-center gap-1.5 text-[13px] font-medium">
                    {option.label}
                    {on ? <CheckIcon size={12} className="ml-auto" /> : null}
                  </span>
                  <span className="text-[13px]">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-b border-line/70 px-5 py-4" aria-labelledby="settings-favorites">
          <div className="flex items-center justify-between gap-3">
            <h3 id="settings-favorites" className="text-[13px] font-semibold text-ink">
              我的收藏
              <span className="ml-1.5 font-mono text-[13px] font-normal text-muted">
                {favorites.length}
              </span>
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExport}
                data-testid="export-favorites"
                className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[13px] text-ink transition-[color,border-color,background-color,transform] duration-200 ease-silk hover:border-primary/50 hover:text-primary-ink active:scale-[0.97]"
              >
                <DownloadIcon size={12} />
                导出 JSON
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={importing}
                className="rounded-lg border border-line px-2 py-1 text-[13px] text-ink transition-[color,border-color,background-color,transform] duration-200 ease-silk hover:border-primary/50 hover:text-primary-ink active:scale-[0.97] disabled:opacity-50"
              >
                {importing ? '导入中…' : '导入'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                data-testid="import-favorites-input"
                aria-label="选择要导入的收藏 JSON 文件"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                }}
              />
            </div>
          </div>

          {favoriteSites.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-line px-3 py-4 text-center text-meta text-muted">
              还没有收藏。卡片右上角的星标可以随时收藏或取消。
            </p>
          ) : (
            <ul className="mt-2 space-y-1" data-testid="favorites-list">
              {favoriteSites.map((site) => (
                <li
                  key={site.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-[background-color,transform] duration-200 ease-silk hover:bg-ink/5 active:scale-[0.98]"
                >
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-[13px] text-ink hover:text-primary-ink"
                  >
                    {site.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      toggleFavorite(site.id);
                      toast({ title: `已移除收藏「${site.name}」`, tone: 'default' });
                    }}
                    aria-label={`从收藏中移除 ${site.name}`}
                    className="grid h-6 w-6 place-items-center rounded text-muted transition-[color,background-color,transform] duration-200 ease-silk hover:bg-ink/5 hover:text-ink active:scale-90"
                  >
                    <CloseIcon size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleClearFavorites}
              disabled={favorites.length === 0}
              className="rounded-lg px-2 py-1 text-[13px] text-muted transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              清空收藏
            </button>
          </div>
        </section>

        <section className="border-b border-line/70 px-5 py-4" aria-labelledby="settings-recent">
          <div className="flex items-center justify-between gap-3">
            <h3 id="settings-recent" className="text-[13px] font-semibold text-ink">
              浏览历史
              <span className="ml-1.5 font-mono text-[13px] font-normal text-muted">
                {recent.length}/10
              </span>
            </h3>
            <button
              type="button"
              onClick={handleClearRecent}
              disabled={recent.length === 0}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-muted transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <TrashIcon size={12} />
              清除
            </button>
          </div>
          {recentSites.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-line px-3 py-4 text-center text-meta text-muted">
              最近 10 条打开记录会显示在这里（倒序）。
            </p>
          ) : (
            <ul className="mt-2 space-y-1" data-testid="recent-list">
              {recentSites.map(({ entry, site }) => (
                <li
                  key={site.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-[background-color,transform] duration-200 ease-silk hover:bg-ink/5 active:scale-[0.98]"
                >
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-[13px] text-ink hover:text-primary-ink"
                  >
                    {site.name}
                  </a>
                  <span className="shrink-0 text-[13px] text-muted">{relativeTime(entry.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="px-5 py-4" aria-labelledby="settings-data">
          <h3 id="settings-data" className="text-[13px] font-semibold text-ink">
            本地数据
          </h3>
          <p className="mt-0.5 text-meta leading-5 text-muted">
            收藏、历史、主题与统计同意全部存放在本机 localStorage。清除后无法恢复，可先导出收藏备份。
          </p>
          <button
            type="button"
            onClick={handleClearAll}
            data-testid="clear-all-data"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[13px] text-red-400 transition-colors hover:bg-red-500/15"
          >
            <TrashIcon size={13} />
            清除所有本地数据
          </button>
        </section>
      </div>
    </Modal>
  );
}
