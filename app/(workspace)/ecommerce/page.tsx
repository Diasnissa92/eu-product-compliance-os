import { ShoppingBag } from "lucide-react";
import { EcommerceAuditWorkbench } from "@/components/professional/ecommerce-audit-workbench";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getProfessionalOperationsData } from "@/lib/data/professional";

export const metadata = { title: "Audit e-commerce" };

export default async function EcommercePage() {
  const workspace = await getWorkspaceContext();
  const data = await getProfessionalOperationsData(workspace);
  return <main><section className="page-heading"><div><span className="eyebrow">Vente à distance</span><h1>Audit des fiches e-commerce</h1><p>Contrôlez les informations de sécurité et de traçabilité visibles avant l’achat, conformément au GPSR.</p></div><span className="heading-symbol heading-symbol-blue"><ShoppingBag size={24} /></span></section><EcommerceAuditWorkbench products={data.products} audits={data.ecommerceAudits} persistence={workspace.mode === "authenticated" && workspace.organizationId && workspace.userId ? { organizationId: workspace.organizationId, userId: workspace.userId } : undefined} /></main>;
}

