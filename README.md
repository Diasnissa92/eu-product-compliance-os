# EU Product Compliance OS

Le cockpit de conformité qui aide les marques, fabricants et importateurs à savoir si un produit est prêt à être commercialisé dans l'Union européenne.

## V1 — socle produit connecté

Ce dépôt contient le premier socle navigable de la V1 :

- tableau de bord portefeuille et alertes ;
- registre produits avec recherche et filtres ;
- fiche produit réglementaire ;
- checklist de conformité pilotée par un moteur de statut ;
- coffre documentaire et historique d'audit ;
- parcours guidé de création d'un produit ;
- authentification e-mail et création d'organisation avec Supabase ;
- isolation multi-organisation par Row Level Security (RLS) ;
- enregistrement réel des produits, checklists et événements d'audit ;
- mode démonstration disponible sans compte.

Les utilisateurs non connectés voient des données de démonstration. Une fois connecté, chaque utilisateur accède uniquement aux données de son organisation. Aucune décision juridique automatique n'est produite à ce stade.

## Démarrage

```bash
npm install
cp .env.example .env.local
npm run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000).

Renseigner dans `.env.local` l'URL du projet Supabase et sa clé publique. Ne jamais utiliser ni exposer la clé `service_role` dans l'application.

## Vérifications

```bash
npm run lint
npm run test
npm run build
```

## Stack

- Next.js 16 (App Router)
- React 19 et TypeScript
- Supabase Auth et PostgreSQL avec RLS
- CSS natif avec design system léger
- Vitest pour le moteur de conformité

## Prochain lot

1. Téléversement réel avec stockage objet.
2. Extraction structurée des documents et validation humaine.
3. Moteur de règles versionné par catégorie et marché.
4. Alertes, partage sécurisé et facturation Stripe.

> EU Product Compliance OS est un outil d'aide à la conformité. Il ne remplace pas un conseil juridique ou un organisme notifié lorsque ceux-ci sont requis.
