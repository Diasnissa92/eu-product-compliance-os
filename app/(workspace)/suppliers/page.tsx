import { Factory } from "lucide-react";
import { SupplierRequestManager } from "@/components/professional/supplier-request-manager";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getProfessionalOperationsData } from "@/lib/data/professional";

export const metadata = { title: "Portail fournisseurs" };

export default async function SuppliersPage() {
  const workspace = await getWorkspaceContext();
  const data = await getProfessionalOperationsData(workspace);
  return <main>
    <section className="page-heading"><div><span className="eyebrow">Collecte de preuves</span><h1>Portail fournisseurs</h1><p>Demandez les pièces manquantes, partagez un accès limité et suivez chaque réponse sans ouvrir votre dossier interne.</p></div><span className="heading-symbol heading-symbol-rose"><Factory size={24} /></span></section>
    <SupplierRequestManager products={data.products} requests={data.supplierRequests} responses={data.supplierResponses} persistence={workspace.mode === "authenticated" && workspace.organizationId && workspace.userId ? { organizationId: workspace.organizationId, userId: workspace.userId } : undefined} />
  </main>;
}

