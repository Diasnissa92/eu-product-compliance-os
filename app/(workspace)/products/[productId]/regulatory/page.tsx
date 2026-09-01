import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DocumentRegulatoryHints, type DocumentRegulatoryHint } from "@/components/product/document-regulatory-hints";
import { RegulatoryAssessmentWorkbench } from "@/components/product/regulatory-assessment-workbench";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getWorkspaceProduct } from "@/lib/data/products";

export const metadata = { title: "Évaluation réglementaire · EU Product Compliance OS" };

export default async function RegulatoryAssessmentPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const workspace = await getWorkspaceContext();
  if (workspace.mode !== "authenticated" || !workspace.organizationId) redirect("/login");
  const product = await getWorkspaceProduct(workspace, productId);
  if (!product) notFound();
  if (["Lecture seule", "viewer"].includes(workspace.role)) redirect(`/products/${productId}`);

  const documentHints: DocumentRegulatoryHint[] = product.documents.flatMap((document) => {
    const result = document.analysis?.result;
    if (!result || !["completed", "applied"].includes(document.analysis?.status ?? "")) return [];
    if (!result.regulationReferences.length && !result.standards.length && !result.manufacturerName && !result.productReference) return [];
    return [{
      documentName: document.name,
      confidence: result.confidence,
      manufacturerName: result.manufacturerName ?? undefined,
      productReference: result.productReference ?? undefined,
      regulationReferences: result.regulationReferences,
      standards: result.standards,
      warnings: result.warnings,
    }];
  }).slice(0, 12);

  return <main>
    <Link className="back-link" href={`/products/${productId}`}><ArrowLeft size={16}/>Retour au dossier produit</Link>
    <section className="page-heading"><div><span className="eyebrow">Qualification réglementaire</span><h1>{product.name}</h1><p>Répondez uniquement avec des faits vérifiés. Le moteur conserve les inconnues et demande une revue humaine lorsqu’une conclusion sûre n’est pas possible.</p></div><span className="heading-symbol heading-symbol-blue"><ShieldCheck size={25}/></span></section>
    <DocumentRegulatoryHints hints={documentHints}/>
    <RegulatoryAssessmentWorkbench organizationId={workspace.organizationId} productId={product.id} category={product.category}/>
  </main>;
}
