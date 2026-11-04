export function ProgressRing({
  value,
  children,
  size = 184,
}: {
  value: number;
  children: React.ReactNode;
  size?: number;
}) {
  const radius = 76,
    circumference = 2 * Math.PI * radius;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 184 184" aria-hidden="true">
        <circle cx="92" cy="92" r={radius} className="ring-track" />
        <circle
          cx="92"
          cy="92"
          r={radius}
          className="ring-fill"
          strokeDasharray={circumference}
          strokeDashoffset={
            circumference * (1 - Math.max(0, Math.min(100, value)) / 100)
          }
          transform="rotate(-90 92 92)"
        />
      </svg>
      <div className="ring-content">{children}</div>
    </div>
  );
}
