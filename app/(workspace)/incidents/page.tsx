import { AlertOctagon } from "lucide-react";
import { IncidentRegister } from "@/components/professional/incident-register";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getProfessionalOperationsData } from "@/lib/data/professional";

export const metadata = { title: "Incidents et rappels" };
export default async function IncidentsPage() { const workspace = await getWorkspaceContext(); const data = await getProfessionalOperationsData(workspace); return <main><section className="page-heading"><div><span className="eyebrow">Vigilance après mise sur le marché</span><h1>Incidents, rappels et actions correctives</h1><p>Documentez les signalements, prenez une décision, pilotez les actions et conservez une chronologie exploitable.</p></div><span className="heading-symbol heading-symbol-red"><AlertOctagon size={25} /></span></section><IncidentRegister products={data.products} incidents={data.incidents} actions={data.correctiveActions} persistence={workspace.mode === "authenticated" && workspace.organizationId && workspace.userId ? { organizationId: workspace.organizationId, userId: workspace.userId } : undefined} /></main>; }

