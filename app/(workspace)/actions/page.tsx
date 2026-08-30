import { AlertTriangle, CalendarClock, ListChecks, UserRoundX } from "lucide-react";
import Link from "next/link";
import { ActionCenter } from "@/components/action/action-center";
import { StatCard } from "@/components/dashboard/stat-card";
import { getActionStats } from "@/lib/actions";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getWorkspaceActions } from "@/lib/data/actions";

export const metadata = { title: "Actions" };

export default async function ActionsPage() {
  const workspace = await getWorkspaceContext();
  const actions = await getWorkspaceActions(workspace);
  const stats = getActionStats(actions);

  return (
    <main>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Pilotage de la conformité</span>
          <h1>Centre d’actions</h1>
          <p>Retrouvez dans une seule vue les exigences ouvertes, les retards, les priorités et les responsabilités de tous vos produits.</p>
        </div>
        <Link className="button button-secondary" href="/products">
          <ListChecks size={18} />Voir les dossiers
        </Link>
      </section>

      <section className="stats-grid action-stats" aria-label="Indicateurs d’action">
        <StatCard icon={ListChecks} label="Actions ouvertes" value={stats.total} detail="Tous les produits" tone="navy" />
        <StatCard icon={AlertTriangle} label="En retard" value={stats.overdue} detail="À traiter maintenant" tone="danger" />
        <StatCard icon={CalendarClock} label="Sous 7 jours" value={stats.urgent} detail="Priorités proches" tone="warning" />
        <StatCard icon={UserRoundX} label="Non assignées" value={stats.unassigned} detail="Responsable à définir" tone="success" />
      </section>

      <section className="panel action-panel">
        <div className="action-panel-heading">
          <div><span className="eyebrow">Portefeuille complet</span><h2>Travail à organiser</h2></div>
          {actions.length ? <span className="action-total">{actions.length} ouverte{actions.length > 1 ? "s" : ""}</span> : null}
        </div>
        <ActionCenter actions={actions} />
      </section>
    </main>
  );
}
