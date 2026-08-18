import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { ProductTable } from "@/components/product/product-table";
import { products } from "@/lib/demo-data";

export const metadata = { title: "Produits" };

export default function ProductsPage() {
  return (
    <main>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Registre produits</span>
          <h1>Vos produits</h1>
          <p>Suivez chaque dossier, de la qualification jusqu’à la preuve de conformité.</p>
        </div>
        <div className="heading-actions">
          <button className="button button-secondary" type="button"><Download size={17} />Exporter</button>
          <Link className="button button-primary" href="/products/new"><Plus size={18} />Ajouter un produit</Link>
        </div>
      </section>

      <section className="panel products-panel">
        <ProductTable products={products} />
      </section>
    </main>
  );
}
