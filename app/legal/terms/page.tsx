import Link from "next/link";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata = { title: "Conditions du service · EU Product Compliance OS" };

export default function TermsPage() {
  const legal = getLegalConfig();
  return <main className="centered-page"><article className="empty-card" style={{maxWidth: 900, textAlign: "left"}}>
    <span className="eyebrow">Version pré-commerciale · 1 septembre 2026</span><h1>Conditions du service</h1>
    <p><strong>Éditeur :</strong> {legal.entityName || "Identité légale à configurer avant commercialisation"}.</p>
    <h2>1. Objet</h2><p>Le service aide les professionnels à organiser les informations produit, documents, évaluations, actions, veilles et preuves utiles à leurs démarches de conformité dans l’Union européenne.</p>
    <h2>2. Pas de certification automatique</h2><p>Le service n’est pas un organisme notifié et ne délivre pas de certification, de marquage CE, d’avis juridique contraignant ni de garantie qu’un produit est conforme. Une sortie automatisée peut conclure qu’une information manque ou qu’une revue humaine est nécessaire. L’utilisateur reste responsable de la qualification exacte de son produit, des informations fournies et des décisions de mise sur le marché.</p>
    <h2>3. Compte et organisation</h2><p>L’accès au workspace nécessite un compte authentifié. Chaque organisation dispose d’un espace séparé. Les administrateurs de l’organisation gèrent les membres et leurs droits. Les identifiants ne doivent pas être partagés.</p>
    <h2>4. Données et documents</h2><p>L’utilisateur garantit qu’il est autorisé à charger et traiter les données et documents transmis. Les liens publics, notamment passeports publiés ou liens fournisseurs, doivent être utilisés en tenant compte de leur nature publique ou de jeton d’accès.</p>
    <h2>5. Sources réglementaires</h2><p>Le moteur privilégie les sources officielles et conserve une version de ses évaluations. Les textes peuvent évoluer, être modifiés, complétés par des actes délégués, des normes, des mesures nationales ou des décisions d’autorités. Une règle non suffisamment déterminée doit rester en revue humaine plutôt qu’être présentée comme certaine.</p>
    <h2>6. Abonnements</h2><p>Les conditions tarifaires, quotas, durée, renouvellement et résiliation seront présentés avant paiement. Aucun paiement n’est activé tant que l’identité légale de l’éditeur et le compte de facturation du service ne sont pas validés. Les paiements seront traités par un prestataire de paiement externe ; le service n’a pas vocation à stocker les données brutes de carte.</p>
    <h2>7. Disponibilité et sécurité</h2><p>Des mesures raisonnables de sécurité, contrôle d’accès et journalisation sont appliquées. Aucun service informatique ne peut promettre l’absence absolue d’incident. Les vulnérabilités identifiées comme critiques sont traitées prioritairement.</p>
    <h2>8. Responsabilité</h2><p>L’utilisateur doit vérifier les résultats avant toute décision réglementaire, commerciale ou de sécurité. Les limitations de responsabilité applicables devront être finalisées avec l’identité juridique de l’éditeur et le droit contractuel retenu avant ouverture commerciale.</p>
    <h2>9. Contact</h2><p>{legal.email || "Adresse de contact à configurer avant lancement commercial."}</p>
    <Link className="inline-link" href="/legal">Retour aux informations juridiques</Link>
  </article></main>;
}
