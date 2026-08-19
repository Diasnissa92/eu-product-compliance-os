import { CalendarClock, CheckCircle2, FileClock, Files, Upload } from "lucide-react";
import Link from "next/link";
import { DocumentRegister } from "@/components/document/document-register";
import { StatCard } from "@/components/dashboard/stat-card";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getDocumentStats, getWorkspaceDocuments } from "@/lib/data/documents";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const workspace = await getWorkspaceContext();
  const documents = await getWorkspaceDocuments(workspace);
  const stats = getDocumentStats(documents);

  return (
    <main>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Coffre de preuves</span>
          <h1>Documents réglementaires</h1>
          <p>Centralisez les preuves de vos produits, suivez leur validation et anticipez les renouvellements.</p>
        </div>
        <Link className="button button-primary" href="/products">
          <Upload size={18} />Ajouter une preuve
        </Link>
      </section>

      <section className="stats-grid documents-stats" aria-label="Indicateurs documentaires">
        <StatCard icon={Files} label="Documents" value={stats.total} detail="Toutes les preuves" tone="navy" />
        <StatCard icon={CheckCircle2} label="Vérifiés" value={stats.verified} detail="Validés pour le dossier" tone="success" />
        <StatCard icon={FileClock} label="En analyse" value={stats.review} detail="À examiner" tone="warning" />
        <StatCard icon={CalendarClock} label="Échéances" value={stats.alerts} detail="Expirées ou sous 30 jours" tone="danger" />
      </section>

      <section className="panel documents-panel">
        {documents.length ? (
          <DocumentRegister documents={documents} />
        ) : (
          <div className="empty-state">
            <Files size={28} />
            <strong>Votre coffre est vide</strong>
            <p>Ouvrez un dossier produit pour ajouter votre première preuve.</p>
            <Link className="button button-primary button-small" href="/products">Choisir un produit</Link>
          </div>
        )}
      </section>
    </main>
  );
}
