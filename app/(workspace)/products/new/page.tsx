import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NewProductForm } from "@/components/product/new-product-form";
import { getWorkspaceContext } from "@/lib/auth/workspace";

export const metadata = { title: "Ajouter un produit" };

export default async function NewProductPage() {
  const workspace = await getWorkspaceContext();
  return (
    <main>
      <Link className="back-link" href="/products"><ArrowLeft size={16} />Annuler et revenir aux produits</Link>
      <NewProductForm persistence={workspace.mode === "authenticated" && workspace.organizationId ? { organizationId: workspace.organizationId } : undefined} />
    </main>
  );
}
