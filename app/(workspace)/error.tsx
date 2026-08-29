"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function WorkspaceError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({ level: "error", message: "workspace_render_failed", digest: error.digest }));
  }, [error]);

  return (
    <main className="workspace-error" role="alert">
      <section className="workspace-error-card">
        <span><AlertTriangle size={25} /></span>
        <h1>Cette page n’a pas pu être chargée</h1>
        <p>Vos données ne sont pas perdues. Le problème peut être temporaire.</p>
        <button className="button button-primary" type="button" onClick={() => retry()}>
          <RefreshCw size={17} />Réessayer
        </button>
        {error.digest ? <small>Référence technique : {error.digest}</small> : null}
      </section>
    </main>
  );
}
