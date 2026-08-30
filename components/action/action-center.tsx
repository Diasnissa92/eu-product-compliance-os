"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CircleDashed,
  ListChecks,
  Search,
  UserRoundX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import type { ComplianceAction, ComplianceActionPriority } from "@/lib/types";

type ActionFilter = "all" | "overdue" | "urgent" | "unassigned";
type ActionSort = "priority" | "deadline" | "product" | "owner";

const filterOptions: Array<{ value: ActionFilter; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "overdue", label: "En retard" },
  { value: "urgent", label: "Sous 7 jours" },
  { value: "unassigned", label: "Non assignées" },
];

const statusCopy: Record<ComplianceAction["status"], string> = {
  pending: "À examiner",
  missing: "Preuve manquante",
  rejected: "Preuve refusée",
};

const priorityCopy: Record<ComplianceActionPriority, string> = {
  overdue: "En retard",
  urgent: "Prioritaire",
  planned: "Planifiée",
  unscheduled: "À planifier",
};

function ActionIcon({ action }: { action: ComplianceAction }) {
  if (action.priority === "overdue") return <AlertTriangle size={18} />;
  if (action.priority === "unscheduled") return <CircleDashed size={18} />;
  if (!action.assigneeId) return <UserRoundX size={18} />;
  return <CalendarClock size={18} />;
}

function urgencyDetail(action: ComplianceAction) {
  if (action.daysRemaining === undefined) return "Échéance à définir";
  if (action.daysRemaining === 0) return "À traiter aujourd’hui";
  if (action.daysRemaining < 0) {
    const elapsed = Math.abs(action.daysRemaining);
    return `${elapsed} jour${elapsed > 1 ? "s" : ""} de retard`;
  }
  return `Dans ${action.daysRemaining} jour${action.daysRemaining > 1 ? "s" : ""}`;
}

function matchesFilter(action: ComplianceAction, filter: ActionFilter) {
  if (filter === "all") return true;
  if (filter === "unassigned") return !action.assigneeId;
  return action.priority === filter;
}

export function ActionCenter({ actions }: { actions: ComplianceAction[] }) {
  const [filter, setFilter] = useState<ActionFilter>("all");
  const [sort, setSort] = useState<ActionSort>("priority");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("fr"));

  const filteredActions = useMemo(() => {
    const result = actions.filter((action) => {
      if (!matchesFilter(action, filter)) return false;
      if (!deferredQuery) return true;
      return [action.title, action.regulation, action.productName, action.productSku, action.owner]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(deferredQuery);
    });

    return result.toSorted((left, right) => {
      if (sort === "product") return left.productName.localeCompare(right.productName, "fr");
      if (sort === "owner") return (left.owner ?? "zzzz").localeCompare(right.owner ?? "zzzz", "fr");
      if (sort === "deadline") return (left.dueDateValue ?? "9999-12-31").localeCompare(right.dueDateValue ?? "9999-12-31");
      return 0;
    });
  }, [actions, deferredQuery, filter, sort]);

  function countForFilter(value: ActionFilter) {
    return actions.filter((action) => matchesFilter(action, value)).length;
  }

  return (
    <div className="action-center">
      <div className="action-toolbar">
        <label className="search-field" htmlFor="action-search">
          <Search size={17} aria-hidden="true" />
          <input
            id="action-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un produit, une règle ou un responsable"
          />
          {query ? <button className="search-clear" type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche"><X size={15} /></button> : null}
        </label>
        <label className="sort-field">
          <span>Trier</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as ActionSort)}>
            <option value="priority">Par priorité</option>
            <option value="deadline">Par échéance</option>
            <option value="product">Par produit</option>
            <option value="owner">Par responsable</option>
          </select>
        </label>
      </div>

      <div className="filter-tabs action-filter-tabs" role="group" aria-label="Filtrer les actions">
        {filterOptions.map((option) => (
          <button
            className={filter === option.value ? "filter-tab filter-tab-active" : "filter-tab"}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            key={option.value}
          >
            {option.label}<span>{countForFilter(option.value)}</span>
          </button>
        ))}
      </div>

      <p className="results-status" aria-live="polite">{filteredActions.length} action{filteredActions.length > 1 ? "s" : ""} affichée{filteredActions.length > 1 ? "s" : ""}</p>

      {filteredActions.length ? (
        <div className="table-scroll">
          <table className="action-table">
            <thead>
              <tr>
                <th>Action réglementaire</th>
                <th>Produit</th>
                <th>Priorité</th>
                <th>Responsable</th>
                <th>Échéance</th>
                <th><span className="sr-only">Ouvrir</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.map((action) => (
                <tr key={`${action.productId}-${action.id}`}>
                  <td>
                    <div className={`action-cell action-tone-${action.priority}`}>
                      <span className="action-icon"><ActionIcon action={action} /></span>
                      <span><strong>{action.title}</strong><small>{action.regulation} · {statusCopy[action.status]}</small></span>
                    </div>
                  </td>
                  <td><Link className="action-product" href={`/products/${action.productId}`}><strong>{action.productName}</strong><small>{action.productSku}</small></Link></td>
                  <td><span className={`action-priority action-priority-${action.priority}`}>{priorityCopy[action.priority]}</span></td>
                  <td><span className={action.owner ? "action-owner" : "action-owner action-owner-empty"}>{action.owner ?? "Non assigné"}</span></td>
                  <td><span className="action-deadline"><strong>{action.dueDate ?? "Non définie"}</strong><small>{urgencyDetail(action)}</small></span></td>
                  <td><Link className="row-link" href={action.actionHref} aria-label={`Ouvrir ${action.title} pour ${action.productName}`}><ArrowUpRight size={17} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-empty action-empty">
          <ListChecks size={27} />
          <strong>Aucune action dans cette vue</strong>
          <p>Modifiez le filtre ou la recherche pour afficher d’autres résultats.</p>
        </div>
      )}
    </div>
  );
}
