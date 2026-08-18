# EU Product Compliance OS

Le cockpit de conformité qui aide les marques, fabricants et importateurs à savoir si un produit est prêt à être commercialisé dans l'Union européenne.

## V1 — premier vertical slice

Ce dépôt contient le premier socle navigable de la V1 :

- tableau de bord portefeuille et alertes ;
- registre produits avec recherche et filtres ;
- fiche produit réglementaire ;
- checklist de conformité pilotée par un moteur de statut ;
- coffre documentaire et historique d'audit ;
- parcours guidé de création d'un produit ;
- architecture prête à recevoir authentification, base de données, extraction documentaire, alertes et abonnement.

Les données sont volontairement des données de démonstration. Aucune décision juridique réelle n'est produite à ce stade.

## Démarrage

```bash
npm install
npm run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000).

## Vérifications

```bash
npm run lint
npm run test
npm run build
```

## Stack

- Next.js 16 (App Router)
- React 19 et TypeScript
- CSS natif avec design system léger
- Vitest pour le moteur de conformité

## Prochain lot

1. Persistance PostgreSQL et modèle multi-tenant.
2. Authentification et espaces organisation.
3. Téléversement réel avec stockage objet.
4. Extraction structurée des documents et validation humaine.
5. Moteur de règles versionné par catégorie et marché.
6. Alertes, partage sécurisé, journal d'audit et facturation Stripe.

> EU Product Compliance OS est un outil d'aide à la conformité. Il ne remplace pas un conseil juridique ou un organisme notifié lorsque ceux-ci sont requis.
