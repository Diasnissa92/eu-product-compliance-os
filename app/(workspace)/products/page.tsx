import { Plus } from "lucide-react";
import Link from "next/link";
import { ProductExportButton } from "@/components/product/product-export-button";
import { ProductTable } from "@/components/product/product-table";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getWorkspaceProducts } from "@/lib/data/products";

export const metadata = { title: "Produits" };

export default async function ProductsPage() {
  const workspace = await getWorkspaceContext();
  const products = await getWorkspaceProducts(workspace);

  return (
    <main>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Registre produits</span>
          <h1>Vos produits</h1>
          <p>Suivez chaque dossier, de la qualification jusqu’à la preuve de conformité.</p>
        </div>
        <div className="heading-actions">
          <ProductExportButton products={products} />
          <Link className="button button-primary" href="/products/new"><Plus size={18} />Ajouter un produit</Link>
        </div>
      </section>

      <section className="panel products-panel">
        {products.length ? <ProductTable products={products} /> : <div className="empty-state"><Plus size={28} /><strong>Votre registre est vide</strong><p>Ajoutez un produit pour lancer son diagnostic réglementaire.</p><Link className="button button-primary button-small" href="/products/new"><Plus size={16} />Ajouter un produit</Link></div>}
      </section>
    </main>
  );
}
