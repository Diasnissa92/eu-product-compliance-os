import Link from "next/link";

export default function NotFound() {
  return (
    <main className="centered-page">
      <div className="empty-card">
        <span className="eyebrow">Erreur 404</span>
        <h1>Cette page n’existe pas.</h1>
        <p>Retournez au cockpit pour poursuivre votre revue de conformité.</p>
        <Link className="button button-primary" href="/dashboard">
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}
