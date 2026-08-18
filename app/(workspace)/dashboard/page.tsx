import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleCheckBig,
  FileWarning,
  Plus,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { ComplianceRing } from "@/components/dashboard/compliance-ring";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProductTable } from "@/components/product/product-table";
import { portfolioStats, products } from "@/lib/demo-data";

export const metadata = { title: "Vue d’ensemble" };

const alerts = [
  {
    icon: Ban,
    tone: "danger",
    title: "Rapport EN 71 manquant",
    product: "Jeu TinySteps 24 pcs",
    detail: "Exigence bloquante avant commercialisation",
    href: "/products/tinysteps-wooden-set",
  },
  {
    icon: FileWarning,
    tone: "warning",
    title: "Rapport RED rejeté",
    product: "Écouteurs Pulse Air",
    detail: "La référence produit ne correspond pas",
    href: "/products/pulse-air",
  },
  {
    icon: CalendarClock,
    tone: "neutral",
    title: "Preuve à renouveler",
    product: "Lampe Luma Mini",
    detail: "Déclaration matière · 12 février 2027",
    href: "/products/luma-mini",
  },
];

export default function DashboardPage() {
  return (
    <main>
      <section className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">Mardi 18 août 2026</span>
          <h1>Bonjour Hugo,</h1>
          <p>Voici l’état de préparation réglementaire de votre portefeuille.</p>
        </div>
        <Link className="button button-primary" href="/products/new"><Plus size={18} />Ajouter un produit</Link>
      </section>

      <section className="stats-grid" aria-label="Indicateurs du portefeuille">
        <StatCard icon={Boxes} label="Produits suivis" value={portfolioStats.total} detail="4 catégories actives" tone="navy" />
        <StatCard icon={CheckCircle2} label="Conformes" value={portfolioStats.compliant} detail="Prêts pour le marché" tone="success" />
        <StatCard icon={AlertTriangle} label="À surveiller" value={portfolioStats.attention} detail="3 actions ouvertes" tone="warning" />
        <StatCard icon={Ban} label="Bloquants" value={portfolioStats.blocking} detail="Action immédiate" tone="danger" />
      </section>

      <section className="dashboard-grid">
        <article className="panel readiness-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Indice portefeuille</span><h2>Préparation au marché UE</h2></div>
            <span className="trend-badge"><TrendingUp size={14} /> +8 pts ce mois</span>
          </div>
          <div className="readiness-content">
            <ComplianceRing value={75} size={132} />
            <div className="readiness-copy">
              <strong>Une base solide</strong>
              <p>3 produits sur 5 nécessitent encore une action avant une mise sur le marché sans réserve.</p>
              <div className="readiness-legend">
                <span><i className="legend-success" />{portfolioStats.compliant} conformes</span>
                <span><i className="legend-warning" />{portfolioStats.attention} à revoir</span>
                <span><i className="legend-danger" />{portfolioStats.blocking} bloquant</span>
              </div>
            </div>
          </div>
        </article>

        <article className="panel alert-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Priorités</span><h2>Actions requises</h2></div>
            <span className="counter-badge">3</span>
          </div>
          <div className="alert-list">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <Link href={alert.href} className="alert-row" key={alert.title}>
                  <span className={`alert-icon alert-${alert.tone}`}><Icon size={18} /></span>
                  <span><strong>{alert.title}</strong><small>{alert.product} · {alert.detail}</small></span>
                  <ArrowRight size={16} />
                </Link>
              );
            })}
          </div>
        </article>
      </section>

      <section className="panel recent-products">
        <div className="panel-heading panel-heading-spaced">
          <div><span className="eyebrow">Portefeuille</span><h2>Produits récemment modifiés</h2></div>
          <Link className="text-link" href="/products">Voir tous les produits <ArrowRight size={16} /></Link>
        </div>
        <ProductTable products={products.slice(0, 4)} compact />
      </section>

      <footer className="legal-note"><CircleCheckBig size={16} />Les résultats sont une aide à la décision et doivent être validés selon votre contexte réglementaire.</footer>
    </main>
  );
}
