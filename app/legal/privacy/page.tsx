import Link from "next/link";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata = { title: "Confidentialité · EU Product Compliance OS" };

export default function PrivacyPage() {
  const legal = getLegalConfig();
  return <main className="centered-page"><article className="empty-card" style={{maxWidth: 900, textAlign: "left"}}>
    <span className="eyebrow">Version pré-commerciale · 1 septembre 2026</span><h1>Politique de confidentialité</h1>
    <p><strong>Responsable du traitement pour les données de compte :</strong> {legal.entityName || "à identifier avant lancement commercial"}. Contact : {legal.email || "à configurer"}.</p>
    <h2>Données traitées</h2><p>Données de compte et d’organisation, rôles d’équipe, informations produit, documents et métadonnées de conformité, historiques d’actions, audits e-commerce, demandes fournisseurs, veilles Safety Gate, incidents et données techniques nécessaires à la sécurité du service.</p>
    <h2>Finalités</h2><p>Fournir et sécuriser le service, isoler les organisations, exécuter les fonctionnalités demandées, conserver la traçabilité, prévenir les abus, assurer le support et, lorsque la facturation sera activée, gérer l’abonnement.</p>
    <h2>Bases et rôles RGPD</h2><p>Pour les données de compte et la gestion contractuelle, l’éditeur agit comme responsable du traitement selon la finalité concernée. Pour les données métier chargées par une organisation concernant des tiers, l’organisation peut agir comme responsable du traitement et le service comme sous-traitant ; le DPA précise alors les rôles.</p>
    <h2>Prestataires</h2><p>Le service repose notamment sur des prestataires d’hébergement, base de données/authentification, déploiement et, lorsque activé, paiement et services d’intelligence artificielle. La liste contractuelle des sous-traitants, leurs implantations et mécanismes de transfert devra être figée avant commercialisation et tenue à jour dans le DPA.</p>
    <h2>Durée et suppression</h2><p>Les données sont conservées pendant la durée nécessaire au service, aux obligations légales et à la sécurité. Les durées précises par catégorie et la procédure d’export/suppression devront être validées avant lancement commercial. Les données rendues publiques volontairement, comme un passeport produit publié, doivent être dépubliées avant suppression si elles ne doivent plus être accessibles.</p>
    <h2>Droits</h2><p>Selon le RGPD et la situation, les personnes peuvent disposer de droits d’accès, rectification, effacement, limitation, opposition et portabilité. Les demandes seront adressées au contact indiqué ci-dessus. Une réclamation peut également être déposée auprès de l’autorité de contrôle compétente.</p>
    <h2>Sécurité</h2><p>Le service utilise des contrôles d’accès par organisation, des politiques RLS, des restrictions de rôles, des journaux d’audit et des connexions HTTPS. Les secrets de paiement et d’infrastructure ne doivent jamais être exposés au navigateur.</p>
    <Link className="inline-link" href="/legal">Retour aux informations juridiques</Link>
  </article></main>;
}
