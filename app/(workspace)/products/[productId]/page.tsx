import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  CircleCheckBig,
  Clock3,
  FileCheck2,
  Globe2,
  MapPin,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComplianceRing } from "@/components/dashboard/compliance-ring";
import { DocumentVault } from "@/components/product/document-vault";
import { ProductActions } from "@/components/product/product-actions";
import { RequirementChecklist } from "@/components/product/requirement-checklist";
import { ProductVisual } from "@/components/product-visual";
import { StatusPill } from "@/components/status-pill";
import { countOpenActions } from "@/lib/compliance";
import { getProduct, products } from "@/lib/demo-data";
import { complianceStatusCopy } from "@/lib/status";

export function generateStaticParams() {
  return products.map((product) => ({ productId: product.id }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const product = getProduct(productId);
  if (!product) notFound();

  const openActions = countOpenActions(product.requirements);

  return (
    <main>
      <Link className="back-link" href="/products"><ArrowLeft size={16} />Retour aux produits</Link>

      <section className="product-heading">
        <div className="product-heading-main">
          <ProductVisual tone={product.imageTone} size="large" />
          <div>
            <div className="product-title-line"><h1>{product.name}</h1><StatusPill status={product.status} /></div>
            <p>{product.sku} · {product.category}</p>
            <div className="framework-list">{product.frameworks.map((framework) => <span key={framework}>{framework}</span>)}</div>
          </div>
        </div>
        <ProductActions />
      </section>

      <section className={`status-banner banner-${product.status}`}>
        <span className="banner-icon">{product.status === "compliant" ? <CircleCheckBig size={22} /> : <ShieldAlert size={22} />}</span>
        <div><strong>{complianceStatusCopy[product.status].label}</strong><p>{complianceStatusCopy[product.status].description}</p></div>
        {openActions > 0 ? <span className="banner-action-count">{openActions} action{openActions > 1 ? "s" : ""} ouverte{openActions > 1 ? "s" : ""}</span> : <span className="banner-action-count">Dossier à jour</span>}
      </section>

      <nav className="detail-tabs" aria-label="Sections de la fiche produit">
        <a href="#overview">Vue d’ensemble</a>
        <a href="#requirements">Checklist <span>{product.requirements.length}</span></a>
        <a href="#documents">Documents <span>{product.documents.length}</span></a>
        <a href="#audit">Historique</a>
      </nav>

      <div className="product-detail-grid" id="overview">
        <div className="product-main-column">
          <section className="panel product-info-panel">
            <div className="panel-heading"><div><span className="eyebrow">Qualification</span><h2>Informations produit</h2></div><button className="text-link" type="button">Modifier</button></div>
            <dl className="product-data-grid">
              <div><dt><Building2 size={16} />Fabricant</dt><dd>{product.manufacturer}</dd></div>
              <div><dt><MapPin size={16} />Pays d’origine</dt><dd>{product.originCountry}</dd></div>
              <div><dt><Globe2 size={16} />Marchés de destination</dt><dd>{product.destinationMarkets.join(", ")}</dd></div>
              <div><dt><PackageCheck size={16} />Catégorie</dt><dd>{product.category}</dd></div>
            </dl>
          </section>

          <section className="panel detail-section" id="requirements">
            <div className="panel-heading panel-heading-spaced">
              <div><span className="eyebrow">Diagnostic dynamique</span><h2>Checklist de conformité</h2></div>
              <span className="section-meta">{product.requirements.length - openActions}/{product.requirements.length} exigences clôturées</span>
            </div>
            <RequirementChecklist requirements={product.requirements} />
          </section>

          <section className="panel detail-section" id="documents">
            <div className="panel-heading"><div><span className="eyebrow">Coffre de preuves</span><h2>Documents réglementaires</h2></div></div>
            <DocumentVault documents={product.documents} />
          </section>

          <section className="panel detail-section" id="audit">
            <div className="panel-heading"><div><span className="eyebrow">Traçabilité</span><h2>Historique du dossier</h2></div></div>
            <div className="audit-list">
              {product.audit.map((event) => (
                <article className="audit-row" key={event.id}>
                  <span className="audit-dot" />
                  <div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.date} · {event.actor}</small></div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="product-side-column">
          <section className="panel score-panel">
            <span className="eyebrow">Score du dossier</span>
            <ComplianceRing value={product.score} size={148} />
            <strong>{product.score >= 90 ? "Excellent niveau de preuve" : product.score >= 70 ? "Dossier à consolider" : "Risque élevé"}</strong>
            <p>Calculé à partir du niveau de criticité et de l’état des preuves.</p>
            <div className="score-breakdown">
              <span><Check size={15} />{product.requirements.length - openActions} exigences clôturées</span>
              <span><Clock3 size={15} />{openActions} actions ouvertes</span>
              <span><FileCheck2 size={15} />{product.documents.length} preuves enregistrées</span>
            </div>
          </section>

          <section className="panel deadline-panel">
            <CalendarClock size={20} />
            <div><span>Prochaine échéance</span><strong>{product.nextDeadline ?? "Aucune échéance proche"}</strong></div>
          </section>

          <section className="panel dossier-panel">
            <span className="eyebrow">Fiche réglementaire</span>
            <h3>Un dossier prêt à partager</h3>
            <p>Générez une vue synthétique des preuves et exigences enregistrées.</p>
            <button className="button button-dark button-full" type="button">Prévisualiser la fiche <ArrowRight size={16} /></button>
          </section>
        </aside>
      </div>
    </main>
  );
}
