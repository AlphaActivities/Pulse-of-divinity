import type { LucideIcon } from 'lucide-react';
import type { StatusColor } from './statusConfig';

interface Props {
  icon: LucideIcon;
  index: number;
  color: StatusColor;
}

export default function MetricIcon({ icon: Icon, index, color }: Props) {
  const revealDelay = index * 80;

  const accentRgb = color.accent;

  return (
    <div
      className="metric-icon-system"
      style={{ animationDelay: `${revealDelay}ms` }}
      aria-hidden="true"
    >
      <svg className="metric-icon-orbit-outer" viewBox="0 0 56 56" fill="none">
        <circle
          cx="28"
          cy="28"
          r="26"
          stroke={accentRgb}
          strokeOpacity="0.28"
          strokeWidth="0.5"
          strokeDasharray="2 4"
          pathLength={100}
        />
      </svg>
      <svg className="metric-icon-orbit-inner" viewBox="0 0 56 56" fill="none">
        <circle
          cx="28"
          cy="28"
          r="21"
          stroke={accentRgb}
          strokeOpacity="0.16"
          strokeWidth="0.5"
          strokeDasharray="1 3"
          pathLength={100}
        />
      </svg>
      <span
        className="metric-icon-halo"
        style={{
          background: `radial-gradient(circle, ${hexToRgba(accentRgb, 0.14)} 0%, ${hexToRgba(accentRgb, 0.04)} 55%, transparent 75%)`,
        }}
      />
      <span
        className="metric-icon-dot metric-icon-dot-a"
        style={{ background: hexToRgba(accentRgb, 0.7) }}
      />
      <span
        className="metric-icon-dot metric-icon-dot-b"
        style={{ background: hexToRgba(accentRgb, 0.7) }}
      />
      <div
        className="metric-icon-center"
        style={{
          borderColor: hexToRgba(accentRgb, 0.22),
          color: hexToRgba(accentRgb, 0.72),
        }}
      >
        <Icon size={18} strokeWidth={1.3} />
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
