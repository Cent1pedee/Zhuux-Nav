import type { Config } from 'tailwindcss';

/**
 * 设计 token 直接映射 PRD 7.2 配色系统。
 * 颜色以 RGB 三元组存放，支持 Tailwind 的透明度修饰符（如 bg-surface/80）。
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        'primary-ink': 'rgb(var(--c-primary-ink) / <alpha-value>)',
        'primary-solid': 'rgb(var(--c-primary-solid) / <alpha-value>)',
        secondary: 'rgb(var(--c-secondary) / <alpha-value>)',
        ink: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        line: 'rgb(var(--c-border) / <alpha-value>)',
      },
      borderRadius: {
        card: '12px',
      },
      fontSize: {
        'page-title': ['26px', { lineHeight: '1.3', fontWeight: '700' }],
        'section-title': ['19px', { lineHeight: '1.3', fontWeight: '600' }],
        'card-title': ['15px', { lineHeight: '1.35', fontWeight: '600' }],
        /* nav-item：顶栏与左侧栏的一级可点击文本，PRD 原文未定义，按可读性取 14px */
        'nav-item': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        /* meta：辅助说明文字，PRD 7.3 为 12px，实测偏小，上调到 13px */
        'meta': ['13px', { lineHeight: '1.55', fontWeight: '400' }],
        /* micro：标签、计数等最次级文本 */
        'micro': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      maxWidth: {
        shell: '1440px',
      },
      screens: {
        sm: '640px',
        md: '1024px',
        xl: '1440px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.12), 0 8px 24px -12px rgb(0 0 0 / 0.35)',
        'card-hover':
          '0 2px 4px rgb(0 0 0 / 0.16), 0 16px 40px -16px rgb(0 0 0 / 0.45), 0 0 0 1px rgb(var(--c-primary) / 0.25)',
        dialog: '0 24px 64px -16px rgb(0 0 0 / 0.6)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-down': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-out': {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(16px)' },
        },
        /* 通知底部倒计时条：与 3200ms 自动消失同步，让「还剩多久」可见 */
        'toast-progress': {
          from: { transform: 'scaleX(1)' },
          to: { transform: 'scaleX(0)' },
        },
        'star-pop': {
          '0%': { transform: 'scale(1) rotate(0deg)' },
          '45%': { transform: 'scale(1.35) rotate(18deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        /* 描述浮层：从卡片底部轻微上浮淡入 */
        'tip-in': {
          from: { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        /* 二级分类展开：高度不可动画，用位移 + 淡入模拟 */
        'reveal': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        /* 星标收藏后的扩散光环 */
        'halo': {
          '0%': { opacity: '0.55', transform: 'scale(0.6)' },
          '100%': { opacity: '0', transform: 'scale(1.9)' },
        },
        /* 导航高亮下划线滑入 */
        'underline-in': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      transitionTimingFunction: {
        /* 统一的「丝滑」缓动：先快后缓，收尾更自然 */
        silk: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'fade-up': 'fade-up 300ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-down': 'fade-down 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-in': 'toast-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-out': 'toast-out 200ms ease-in both',
        'toast-progress': 'toast-progress 3200ms linear forwards',
        'star-pop': 'star-pop 320ms ease-out',
        'tip-in': 'tip-in 160ms cubic-bezier(0.22, 1, 0.36, 1) both',
        reveal: 'reveal 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
        halo: 'halo 520ms ease-out forwards',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
