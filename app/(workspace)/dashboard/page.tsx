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
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getPortfolioStats, getWorkspaceProducts } from "@/lib/data/products";

export const metadata = { title: "Vue d’ensemble" };

const demoAlerts = [
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

export default async function DashboardPage() {
  const workspace = await getWorkspaceContext();
  const products = await getWorkspaceProducts(workspace);
  const portfolioStats = getPortfolioStats(products);
  const readinessScore = products.length ? Math.round(products.reduce((total, product) => total + product.score, 0) / products.length) : 0;
  const alerts = workspace.mode === "demo" ? demoAlerts : products
    .filter((product) => product.status !== "compliant")
    .slice(0, 3)
    .map((product) => ({
      icon: product.status === "blocking" ? Ban : product.status === "risk" ? FileWarning : CalendarClock,
      tone: product.status === "blocking" ? "danger" : product.status === "risk" ? "warning" : "neutral",
      title: product.status === "blocking" ? "Action bloquante" : "Dossier à compléter",
      product: product.name,
      detail: `${product.score}% de préparation réglementaire`,
      href: `/products/${product.id}`,
    }));
  const formattedDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <main>
      <section className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">{formattedDate}</span>
          <h1>Bonjour {workspace.userName.split(" ")[0]},</h1>
          <p>Voici l’état de préparation réglementaire de votre portefeuille.</p>
        </div>
        <Link className="button button-primary" href="/products/new"><Plus size={18} />Ajouter un produit</Link>
      </section>

      <section className="stats-grid" aria-label="Indicateurs du portefeuille">
        <StatCard icon={Boxes} label="Produits suivis" value={portfolioStats.total} detail={workspace.mode === "demo" ? "4 catégories actives" : `${new Set(products.map((product) => product.category)).size} catégorie(s) active(s)`} tone="navy" />
        <StatCard icon={CheckCircle2} label="Conformes" value={portfolioStats.compliant} detail="Prêts pour le marché" tone="success" />
        <StatCard icon={AlertTriangle} label="À surveiller" value={portfolioStats.attention} detail={`${alerts.length} action(s) prioritaire(s)`} tone="warning" />
        <StatCard icon={Ban} label="Bloquants" value={portfolioStats.blocking} detail="Action immédiate" tone="danger" />
      </section>

      <section className="dashboard-grid">
        <article className="panel readiness-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Indice portefeuille</span><h2>Préparation au marché UE</h2></div>
            <span className="trend-badge"><TrendingUp size={14} />{workspace.mode === "demo" ? "+8 pts ce mois" : `${readinessScore}% préparé`}</span>
          </div>
          <div className="readiness-content">
            <ComplianceRing value={readinessScore} size={132} />
            <div className="readiness-copy">
              <strong>{products.length ? "Votre portefeuille progresse" : "Votre espace est prêt"}</strong>
              <p>{products.length ? `${portfolioStats.attention + portfolioStats.blocking} produit(s) nécessitent encore une action avant la mise sur le marché.` : "Ajoutez votre premier produit pour générer une checklist réglementaire."}</p>
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
            <span className="counter-badge">{alerts.length}</span>
          </div>
          {alerts.length ? <div className="alert-list">
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
          </div> : <div className="empty-state compact-empty"><CircleCheckBig size={22} /><strong>Aucune action ouverte</strong><p>Les priorités apparaîtront ici.</p></div>}
        </article>
      </section>

      <section className="panel recent-products">
        <div className="panel-heading panel-heading-spaced">
          <div><span className="eyebrow">Portefeuille</span><h2>Produits récemment modifiés</h2></div>
          <Link className="text-link" href="/products">Voir tous les produits <ArrowRight size={16} /></Link>
        </div>
        {products.length ? <ProductTable products={products.slice(0, 4)} compact /> : <div className="empty-state"><Boxes size={28} /><strong>Aucun produit enregistré</strong><p>Créez votre premier dossier de conformité.</p><Link className="button button-primary button-small" href="/products/new"><Plus size={16} />Ajouter un produit</Link></div>}
      </section>

      <footer className="legal-note"><CircleCheckBig size={16} />Les résultats sont une aide à la décision et doivent être validés selon votre contexte réglementaire.</footer>
    </main>
  );
}
