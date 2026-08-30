import { FileSpreadsheet } from "lucide-react";
import { ProductImporter } from "@/components/professional/product-importer";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getProfessionalOperationsData } from "@/lib/data/professional";

export const metadata = { title: "Import produits" };
export default async function ProductImportPage() { const workspace = await getWorkspaceContext(); const data = await getProfessionalOperationsData(workspace); return <main><section className="page-heading"><div><span className="eyebrow">Gestion en volume</span><h1>Importer des produits</h1><p>Prévisualisez, validez et créez vos dossiers en masse à partir d’un fichier CSV français ou anglais.</p></div><span className="heading-symbol heading-symbol-mint"><FileSpreadsheet size={25} /></span></section><ProductImporter history={data.imports} persistence={workspace.mode === "authenticated" && workspace.organizationId ? { organizationId: workspace.organizationId } : undefined} /></main>; }

