import Link from "next/link";
import { getLegalConfig, getMissingLegalFields } from "@/lib/legal-config";

export const metadata = { title: "Informations juridiques · EU Product Compliance OS" };

export default function LegalPage() {
  const legal = getLegalConfig();
  const missing = getMissingLegalFields(legal);
  return <main className="centered-page"><div className="empty-card" style={{maxWidth: 860, textAlign: "left"}}>
    <span className="eyebrow">Cadre juridique du service</span><h1>Informations juridiques</h1>
    {missing.length ? <p className="form-feedback form-feedback-error"><strong>Commercialisation bloquée :</strong> l’identité légale de l’éditeur n’est pas encore entièrement configurée. Aucun parcours de paiement ne doit être activé tant que ces informations ne sont pas complètes.</p> : null}
    <p><strong>Éditeur :</strong> {legal.entityName || "À configurer"}<br/><strong>Adresse :</strong> {legal.address || "À configurer"}<br/><strong>Immatriculation :</strong> {legal.registration || "À configurer"}<br/><strong>TVA :</strong> {legal.vatNumber || "À configurer"}<br/><strong>Contact :</strong> {legal.email || "À configurer"}</p>
    <p>EU Product Compliance OS est un outil d’assistance à la gestion de conformité produit. Il ne constitue ni un organisme notifié, ni une autorité de surveillance du marché, ni un service de certification. Les résultats automatisés doivent être validés à partir des textes applicables, des caractéristiques réelles du produit et, lorsque nécessaire, par un professionnel compétent.</p>
    <div className="button-row"><Link className="button button-secondary" href="/legal/terms">Conditions du service</Link><Link className="button button-secondary" href="/legal/privacy">Confidentialité</Link><Link className="button button-secondary" href="/legal/dpa">Traitement des données</Link></div>
  </div></main>;
}
