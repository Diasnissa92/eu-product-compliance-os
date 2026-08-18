import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  tone: string;
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-${tone}`}><Icon size={20} /></div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}
