import { AlertTriangle, Ban, CheckCircle2, Clock3 } from "lucide-react";
import { complianceStatusCopy } from "@/lib/status";
import type { ComplianceStatus } from "@/lib/types";

const icons = {
  compliant: CheckCircle2,
  incomplete: Clock3,
  risk: AlertTriangle,
  blocking: Ban,
};

export function StatusPill({ status, compact = false }: { status: ComplianceStatus; compact?: boolean }) {
  const Icon = icons[status];
  return (
    <span className={`status-pill status-${status}`}>
      <Icon size={14} strokeWidth={2.4} />
      {compact ? complianceStatusCopy[status].shortLabel : complianceStatusCopy[status].label}
    </span>
  );
}
