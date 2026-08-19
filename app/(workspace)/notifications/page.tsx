import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileClock,
  Files,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getWorkspaceNotifications } from "@/lib/data/notifications";
import { getNotificationStats } from "@/lib/notifications";
import type { ComplianceNotification } from "@/lib/types";

export const metadata = { title: "Alertes" };

const notificationCopy = {
  expired: "Expiré",
  expiring: "Échéance",
  rejected: "Refusé",
  review: "En analyse",
} satisfies Record<ComplianceNotification["kind"], string>;

function NotificationIcon({ notification }: { notification: ComplianceNotification }) {
  if (notification.kind === "expired") return <CircleAlert size={20} />;
  if (notification.kind === "rejected") return <AlertTriangle size={20} />;
  if (notification.kind === "expiring") return <CalendarClock size={20} />;
  return <Clock3 size={20} />;
}

export default async function NotificationsPage() {
  const workspace = await getWorkspaceContext();
  const notifications = await getWorkspaceNotifications(workspace);
  const stats = getNotificationStats(notifications);

  return (
    <main>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Veille documentaire</span>
          <h1>Alertes et échéances</h1>
          <p>Priorisez les preuves à corriger, à valider ou à renouveler dans votre organisation.</p>
        </div>
        <Link className="button button-secondary" href="/documents">
          <Files size={18} />Voir le registre
        </Link>
      </section>

      <section className="stats-grid notification-stats" aria-label="Indicateurs d’alerte">
        <StatCard icon={BellRing} label="Alertes actives" value={stats.total} detail="Toutes les actions" tone="navy" />
        <StatCard icon={AlertTriangle} label="Critiques" value={stats.critical} detail="Expirées ou refusées" tone="danger" />
        <StatCard icon={CalendarClock} label="Échéances" value={stats.deadlines} detail="Dans les 90 jours" tone="warning" />
        <StatCard icon={FileClock} label="En analyse" value={stats.review} detail="Validation attendue" tone="success" />
      </section>

      <section className="panel notification-panel">
        <div className="notification-panel-heading">
          <div>
            <span className="eyebrow">File d’actions</span>
            <h2>À traiter maintenant</h2>
          </div>
          {notifications.length ? <span className="notification-total">{notifications.length} active{notifications.length > 1 ? "s" : ""}</span> : null}
        </div>

        {notifications.length ? (
          <div className="notification-list">
            {notifications.map((notification) => (
              <article className="notification-row" key={notification.id}>
                <span className={`notification-icon notification-${notification.tone}`}>
                  <NotificationIcon notification={notification} />
                </span>
                <div className="notification-copy">
                  <div className="notification-title-line">
                    <strong>{notification.title}</strong>
                    <span className={`notification-kind notification-kind-${notification.tone}`}>{notificationCopy[notification.kind]}</span>
                  </div>
                  <p>{notification.detail}</p>
                  <small>{notification.productName} · {notification.documentName}</small>
                </div>
                <Link className="notification-action" href={notification.actionHref}>
                  {notification.actionLabel}<ChevronRight size={17} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state notification-empty">
            <CheckCircle2 size={31} />
            <strong>Aucune alerte active</strong>
            <p>Vos documents validés ne présentent actuellement aucune échéance sous 90 jours.</p>
            <Link className="button button-secondary button-small" href="/documents">Consulter les documents</Link>
          </div>
        )}
      </section>
    </main>
  );
}
