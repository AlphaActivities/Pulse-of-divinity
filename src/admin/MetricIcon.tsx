import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  index: number;
}

export default function MetricIcon({ icon: Icon, index }: Props) {
  const revealDelay = index * 80;

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
          stroke="rgba(201, 162, 39, 0.28)"
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
          stroke="rgba(201, 162, 39, 0.16)"
          strokeWidth="0.5"
          strokeDasharray="1 3"
          pathLength={100}
        />
      </svg>
      <span className="metric-icon-halo" />
      <span className="metric-icon-dot metric-icon-dot-a" />
      <span className="metric-icon-dot metric-icon-dot-b" />
      <div className="metric-icon-center">
        <Icon size={18} strokeWidth={1.3} />
      </div>
    </div>
  );
}
