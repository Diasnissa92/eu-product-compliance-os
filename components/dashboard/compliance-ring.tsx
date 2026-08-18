export function ComplianceRing({ value, size = 112 }: { value: number; size?: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="compliance-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`Score de conformité : ${value} %`}>
        <circle className="ring-track" cx="50" cy="50" r={radius} />
        <circle
          className="ring-progress"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span><strong>{value}</strong><small>%</small></span>
    </div>
  );
}
