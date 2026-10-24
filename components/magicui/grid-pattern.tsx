import { useId } from 'react';

import { cn } from '@/lib/utils';

interface GridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  squares?: Array<[x: number, y: number]>;
  strokeDasharray?: string;
  className?: string;
}

/**
 * 网格底纹（Magic UI GridPattern）。
 *
 * 纯 SVG `<pattern>`，比「两个 linear-gradient 平铺」更省合成成本，
 * 且能按 `squares` 单独点亮几格（这里用来在网格上点缀主色方块）。
 * 默认描边色改用主题变量，跟随深浅色切换。
 */
export function GridPattern({
  width = 48,
  height = 48,
  x = -1,
  y = -1,
  strokeDasharray = '0',
  squares,
  className,
  ...props
}: GridPatternProps) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      {...props}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            stroke="rgb(var(--grid-line))"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([sx, sy]) => (
            <rect
              strokeWidth="0"
              key={`${sx}-${sy}`}
              width={width - 1}
              height={height - 1}
              x={sx * width + 1}
              y={sy * height + 1}
              fill="rgb(var(--c-primary) / 0.22)"
            />
          ))}
        </svg>
      )}
    </svg>
  );
}
