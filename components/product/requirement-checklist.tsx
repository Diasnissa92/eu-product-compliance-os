"use client";

import { AlertTriangle, Check, ChevronDown, CircleDashed, FileSearch, X } from "lucide-react";
import { useState } from "react";
import { requirementStatusCopy } from "@/lib/status";
import type { Requirement, RequirementStatus } from "@/lib/types";

const statusIcon: Record<RequirementStatus, typeof Check> = {
  verified: Check,
  pending: FileSearch,
  missing: CircleDashed,
  rejected: X,
  "not-applicable": Check,
};

export function RequirementChecklist({ requirements }: { requirements: Requirement[] }) {
  const [openId, setOpenId] = useState<string | null>(requirements[0]?.id ?? null);

  return (
    <div className="requirements-list">
      {requirements.map((requirement) => {
        const Icon = statusIcon[requirement.status];
        const open = openId === requirement.id;
        return (
          <article className={`requirement-item requirement-${requirement.status}`} key={requirement.id}>
            <button
              type="button"
              className="requirement-summary"
              onClick={() => setOpenId(open ? null : requirement.id)}
              aria-expanded={open}
            >
              <span className="requirement-status-icon"><Icon size={17} /></span>
              <span className="requirement-main">
                <strong>{requirement.title}</strong>
                <small>{requirement.regulation}</small>
              </span>
              {requirement.severity === "blocking" ? (
                <span className="severity-badge"><AlertTriangle size={12} />Essentiel</span>
              ) : null}
              <span className={`requirement-state state-${requirement.status}`}>
                {requirementStatusCopy[requirement.status]}
              </span>
              <ChevronDown className={open ? "chevron-open" : ""} size={17} />
            </button>
            {open ? (
              <div className="requirement-detail">
                <p>{requirement.description}</p>
                <dl>
                  <div><dt>Responsable</dt><dd>{requirement.owner ?? "Non assigné"}</dd></div>
                  <div><dt>Échéance</dt><dd>{requirement.dueDate ?? "Aucune échéance"}</dd></div>
                  <div><dt>Niveau</dt><dd>{requirement.severity === "blocking" ? "Bloquant" : requirement.severity}</dd></div>
                </dl>
                <button className="button button-secondary button-small" type="button">Voir les preuves liées</button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
