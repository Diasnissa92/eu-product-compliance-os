export default function WorkspaceLoading() {
  return (
    <main className="workspace-loading" aria-busy="true" aria-label="Chargement de la page">
      <div className="loading-heading"><span className="skeleton-block skeleton-eyebrow" /><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-copy" /></div>
      <div className="loading-grid">{Array.from({ length: 4 }, (_, index) => <span className="skeleton-block skeleton-card" key={index} />)}</div>
      <span className="skeleton-block loading-panel" />
      <span className="sr-only" role="status">Chargement en cours…</span>
    </main>
  );
}
