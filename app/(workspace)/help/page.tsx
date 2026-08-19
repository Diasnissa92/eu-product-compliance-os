import { Bell, CheckCircle2, FileCheck2, FolderLock, HelpCircle, PackagePlus } from "lucide-react";

export const metadata = { title: "Centre d’aide" };

const steps = [
  {
    icon: PackagePlus,
    title: "1. Qualifier le produit",
    text: "Ajoutez son identité, les opérateurs économiques et ses marchés. Le système génère une première checklist réglementaire.",
  },
  {
    icon: FolderLock,
    title: "2. Centraliser les preuves",
    text: "Déposez les déclarations, rapports et certificats dans le coffre documentaire sécurisé du produit.",
  },
  {
    icon: CheckCircle2,
    title: "3. Valider les exigences",
    text: "Liez une preuve à chaque exigence, ajoutez vos notes de revue, puis choisissez son statut de validation.",
  },
  {
    icon: Bell,
    title: "4. Suivre les échéances",
    text: "Renseignez les dates d’expiration des documents. Les alertes regroupent les renouvellements, refus et validations en attente.",
  },
  {
    icon: FileCheck2,
    title: "5. Partager la fiche",
    text: "Prévisualisez la fiche réglementaire, copiez son lien interne, imprimez-la ou téléchargez-la en PDF.",
  },
];

export default function HelpPage() {
  return (
    <main>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Prise en main</span>
          <h1>Centre d’aide</h1>
          <p>Le parcours essentiel pour transformer vos informations produit en dossier réglementaire exploitable.</p>
        </div>
      </section>

      <section className="help-grid">
        {steps.map(({ icon: Icon, title, text }) => (
          <article className="panel help-card" key={title}>
            <span className="help-card-icon"><Icon size={21} /></span>
            <div><h2>{title}</h2><p>{text}</p></div>
          </article>
        ))}
      </section>

      <section className="panel help-disclaimer">
        <HelpCircle size={21} />
        <div>
          <h2>À garder en tête</h2>
          <p>EU Product Compliance OS structure votre travail et vos preuves. Il ne remplace pas l’analyse d’un spécialiste ni la validation juridique applicable à votre produit et à vos marchés.</p>
        </div>
      </section>
    </main>
  );
}
