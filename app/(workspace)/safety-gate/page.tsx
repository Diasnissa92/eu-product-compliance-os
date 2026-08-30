import { Radar } from "lucide-react";
import { SafetyGateMonitor } from "@/components/professional/safety-gate-monitor";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getProfessionalOperationsData } from "@/lib/data/professional";

export const metadata = { title: "Veille Safety Gate" };
export default async function SafetyGatePage() { const workspace = await getWorkspaceContext(); const data = await getProfessionalOperationsData(workspace); return <main><section className="page-heading"><div><span className="eyebrow">Surveillance des produits dangereux</span><h1>Veille Safety Gate</h1><p>Structurez vos recherches sur la source officielle, consignez les correspondances et transformez une alerte en incident suivi.</p></div><span className="heading-symbol heading-symbol-amber"><Radar size={25} /></span></section><SafetyGateMonitor products={data.products} watches={data.safetyGateWatches} matches={data.safetyGateMatches} persistence={workspace.mode === "authenticated" && workspace.organizationId && workspace.userId ? { organizationId: workspace.organizationId, userId: workspace.userId } : undefined} /></main>; }

