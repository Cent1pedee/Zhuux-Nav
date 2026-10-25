'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useSpring } from 'motion/react';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

/*
 * Magic UI SmoothCursor（改写版）
 *
 * 与注册表原版的差别（都是为了不伤害可用性）：
 * 1. 原版直接 `document.body.style.cursor = 'none'`，会让输入框里失去文本光标。
 *    这里改为给 <html> 加 `.smooth-cursor-on` 类，由 globals.css 精确控制：
 *    只在非表单区域隐藏系统光标，input / textarea / select / contenteditable 仍用系统光标。
 * 2. 原版不判断 reduced-motion，跟随系统的用户会看到一个拖尾很长的箭头。这里直接不启用。
 * 3. 原版在 `pointerType === 'touch'` 之外一律启用；这里仍用 `(any-hover: hover) and (any-pointer: fine)`
 *    做硬门槛（触屏笔记本接鼠标才启用），避免移动端出现一个卡在原地的箭头。
 * 4. 增加 `pointerleave` / `blur` 隐藏，鼠标移出窗口时箭头不会冻在边缘。
 */

const DESKTOP_POINTER_QUERY = '(any-hover: hover) and (any-pointer: fine)';

interface Position {
  x: number;
  y: number;
}

export interface SmoothCursorProps {
  /** 是否启用（由设置面板的「指针样式」控制，默认开） */
  enabled?: boolean;
  /** 自定义光标形状，默认是一个带描边的箭头 */
  cursor?: ReactNode;
  springConfig?: {
    damping: number;
    stiffness: number;
    mass: number;
    restDelta: number;
  };
}

const DEFAULT_SPRING = { damping: 45, stiffness: 400, mass: 1, restDelta: 0.001 };

function DefaultCursor() {
  return (
    <svg width={34} height={37} viewBox="0 0 50 54" fill="none" aria-hidden="true">
      <g filter="url(#smooth-cursor-shadow)">
        <path
          d="M42.68 41.15 27.51 6.8c-.78-1.77-3.3-1.77-4.12 0L7.6 41.15c-.84 1.83.93 3.74 2.81 3.05l13.97-5.15c.5-.19 1.06-.19 1.56 0l13.87 5.15c1.88.69 3.68-1.22 2.87-3.05Z"
          fill="rgb(var(--c-primary-solid))"
        />
        <path
          d="M43.71 40.69 28.54 6.34c-1.19-2.69-4.96-2.65-6.17 0L6.57 40.68c-1.26 2.74 1.4 5.62 4.23 4.58l13.96-5.15c.26-.09.54-.09.79 0l13.87 5.15c2.81 1.04 5.5-1.82 4.29-4.56Z"
          stroke="rgb(var(--c-bg))"
          strokeWidth={2.26}
        />
      </g>
      <defs>
        <filter id="smooth-cursor-shadow" x={0} y={0} width={50} height={54} filterUnits="userSpaceOnUse">
          <feDropShadow dx={0} dy={2} stdDeviation={2.2} floodOpacity={0.35} />
        </filter>
      </defs>
    </svg>
  );
}

export function SmoothCursor({ enabled = true, cursor, springConfig = DEFAULT_SPRING }: SmoothCursorProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [pointerFine, setPointerFine] = useState(false);
  const [visible, setVisible] = useState(false);

  const lastPos = useRef<Position>({ x: 0, y: 0 });
  const velocity = useRef<Position>({ x: 0, y: 0 });
  const lastTime = useRef(0);
  const prevAngle = useRef(0);
  const accumulated = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cursorX = useSpring(0, springConfig);
  const cursorY = useSpring(0, springConfig);
  const rotation = useSpring(0, { ...springConfig, damping: 60, stiffness: 300 });
  const scale = useSpring(1, { ...springConfig, stiffness: 500, damping: 35 });

  /* 是否具备「精细指针」——触屏设备直接不启用 */
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_POINTER_QUERY);
    const sync = () => {
      setPointerFine(mq.matches);
      if (!mq.matches) setVisible(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const active = enabled && pointerFine && !reducedMotion;

  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    root.classList.add('smooth-cursor-on');

    let rafId = 0;
    let pending: PointerEvent | null = null;

    const apply = (e: PointerEvent) => {
      const now = Date.now();
      const dt = now - lastTime.current;
      const pos = { x: e.clientX, y: e.clientY };

      if (dt > 0) {
        velocity.current = {
          x: (pos.x - lastPos.current.x) / dt,
          y: (pos.y - lastPos.current.y) / dt,
        };
      }
      lastTime.current = now;
      lastPos.current = pos;

      setVisible(true);
      cursorX.set(pos.x);
      cursorY.set(pos.y);

      const speed = Math.hypot(velocity.current.x, velocity.current.y);
      if (speed <= 0.1) return;

      /* 按移动方向轻微旋转，让箭头有「跟随甩动」的手感 */
      const angle = (Math.atan2(velocity.current.y, velocity.current.x) * 180) / Math.PI + 90;
      let diff = angle - prevAngle.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      accumulated.current += diff;
      rotation.set(accumulated.current);
      prevAngle.current = angle;

      scale.set(0.94);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => scale.set(1), 150);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      pending = e;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (pending) apply(pending);
      });
    };

    const hide = () => setVisible(false);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);

    return () => {
      root.classList.remove('smooth-cursor-on');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
      if (rafId) cancelAnimationFrame(rafId);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [active, cursorX, cursorY, rotation, scale]);

  if (!active) return null;

  return (
    <motion.div
      aria-hidden="true"
      data-testid="smooth-cursor"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed',
        left: cursorX,
        top: cursorY,
        x: '-50%',
        y: '-50%',
        rotate: rotation,
        scale,
        zIndex: 100,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      {cursor ?? <DefaultCursor />}
    </motion.div>
  );
}
