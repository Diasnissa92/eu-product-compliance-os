import Link from "next/link";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata = { title: "DPA · EU Product Compliance OS" };

export default function DpaPage() {
  const legal = getLegalConfig();
  return <main className="centered-page"><article className="empty-card" style={{maxWidth: 900, textAlign: "left"}}>
    <span className="eyebrow">Projet de DPA · 1 septembre 2026</span><h1>Conditions de traitement des données</h1>
    <p>Ce document constitue le socle du contrat de sous-traitance au sens de l’article 28 du RGPD lorsque {legal.entityName || "l’éditeur à identifier"} traite des données personnelles pour le compte d’une organisation cliente. Il doit être complété avec l’identité contractuelle et la liste finale des sous-traitants avant ouverture commerciale.</p>
    <h2>Objet et durée</h2><p>Le traitement couvre l’hébergement et l’exploitation des données nécessaires aux fonctionnalités choisies par le client pendant la durée du contrat, puis pendant la période strictement nécessaire à la restitution, suppression, sécurité et obligations légales.</p>
    <h2>Nature et finalité</h2><p>Stockage, consultation, structuration, recherche, analyse à la demande, génération de documents, collaboration, journalisation, surveillance réglementaire et opérations techniques nécessaires au service.</p>
    <h2>Instructions du client</h2><p>Le service traite les données métier selon les instructions documentées résultant de l’utilisation du produit et du contrat. Une instruction manifestement contraire au droit applicable doit être signalée au client.</p>
    <h2>Confidentialité et sécurité</h2><p>L’accès aux données est limité aux personnes et systèmes autorisés. Le service met en œuvre une isolation par organisation, des politiques RLS, une gestion des rôles, HTTPS, des secrets côté serveur, des journaux d’audit et des contrôles de déploiement.</p>
    <h2>Sous-traitants ultérieurs</h2><p>Les fournisseurs techniques nécessaires au service doivent être inscrits dans une liste maintenue à jour avec leur rôle, localisation et mécanisme de transfert applicable. Aucun engagement commercial ne doit être pris avant validation de cette liste et des accords correspondants.</p>
    <h2>Assistance RGPD</h2><p>Dans la mesure raisonnablement possible, le service assiste le client pour les demandes de personnes concernées, la sécurité, les violations de données et les analyses d’impact lorsque ces obligations concernent les traitements confiés.</p>
    <h2>Violation de données</h2><p>Lorsqu’une violation concernant les données traitées pour le compte du client est confirmée, le client est informé sans retard indu avec les informations disponibles utiles à ses propres obligations.</p>
    <h2>Fin du service</h2><p>À l’issue du contrat, les données sont supprimées ou restituées selon les conditions convenues, sauf conservation imposée par le droit. Les sauvegardes résiduelles suivent leur cycle technique sécurisé.</p>
    <h2>Audit</h2><p>Les informations raisonnablement nécessaires pour démontrer le respect des obligations de sous-traitant peuvent être fournies au client selon des modalités protégeant la sécurité, les secrets d’affaires et les autres clients.</p>
    <Link className="inline-link" href="/legal">Retour aux informations juridiques</Link>
  </article></main>;
}
