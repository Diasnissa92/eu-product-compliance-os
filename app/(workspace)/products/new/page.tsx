import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NewProductForm } from "@/components/product/new-product-form";

export const metadata = { title: "Ajouter un produit" };

export default function NewProductPage() {
  return (
    <main>
      <Link className="back-link" href="/products"><ArrowLeft size={16} />Annuler et revenir aux produits</Link>
      <NewProductForm />
    </main>
  );
}
