import { QrCode } from "lucide-react";
import { PassportManager } from "@/components/professional/passport-manager";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getProfessionalOperationsData } from "@/lib/data/professional";

export const metadata = { title: "Passeports numériques" };

export default async function PassportsPage() {
  const workspace = await getWorkspaceContext();
  const data = await getProfessionalOperationsData(workspace);
  return <main><section className="page-heading"><div><span className="eyebrow">Identité numérique durable</span><h1>Passeports numériques produit</h1><p>Publiez une fiche stable, maîtrisez les données visibles et associez chaque produit à un QR code téléchargeable.</p></div><span className="heading-symbol heading-symbol-mint"><QrCode size={25} /></span></section><PassportManager products={data.products} persistence={workspace.mode === "authenticated" && workspace.organizationId ? { organizationId: workspace.organizationId } : undefined} /></main>;
}

