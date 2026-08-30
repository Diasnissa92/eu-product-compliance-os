import { CheckCircle2, Factory, Globe2, Recycle, ShieldCheck, Wrench } from "lucide-react";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type PublicPassport = { identifier: string; name: string; sku?: string; category?: string; manufacturer?: string; originCountry?: string; targetMarkets: string[]; complianceScore: number; publicData: Record<string, Json | undefined>; publishedAt?: string; updatedAt: string };

function parsePassport(value: Json): PublicPassport | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const data = value as Record<string, Json | undefined>;
  if (typeof data.identifier !== "string" || typeof data.name !== "string" || typeof data.updatedAt !== "string") return undefined;
  return { identifier: data.identifier, name: data.name, sku: typeof data.sku === "string" ? data.sku : undefined, category: typeof data.category === "string" ? data.category : undefined, manufacturer: typeof data.manufacturer === "string" ? data.manufacturer : undefined, originCountry: typeof data.originCountry === "string" ? data.originCountry : undefined, targetMarkets: Array.isArray(data.targetMarkets) ? data.targetMarkets.filter((item): item is string => typeof item === "string") : [], complianceScore: typeof data.complianceScore === "number" ? data.complianceScore : 0, publicData: data.publicData && typeof data.publicData === "object" && !Array.isArray(data.publicData) ? data.publicData : {}, publishedAt: typeof data.publishedAt === "string" ? data.publishedAt : undefined, updatedAt: data.updatedAt };
}

function text(value: Json | undefined) { return typeof value === "string" ? value : ""; }

export default async function PublicPassportPage({ params }: { params: Promise<{ identifier: string }> }) {
  if (!isSupabaseConfigured) notFound();
  const { identifier } = await params;
  const { data, error } = await (await createClient()).rpc("get_public_product_passport", { p_identifier: identifier });
  const passport = parsePassport(data);
  if (error || !passport) notFound();
  const materials = Array.isArray(passport.publicData.materials) ? passport.publicData.materials.filter((item): item is string => typeof item === "string") : [];
  const supportUrl = text(passport.publicData.supportUrl);
  return <main className="public-passport-page"><article className="public-passport-card">
    <header className="public-passport-header"><span className="brand-mark"><BrandMark size={28} /></span><div><span className="eyebrow">Passeport numérique produit</span><strong>EU Product Compliance OS</strong></div><span className="passport-live"><CheckCircle2 size={16} />Publié</span></header>
    <section className="public-passport-hero"><div><span className="passport-public-id">{passport.identifier}</span><h1>{passport.name}</h1><p>{passport.sku || "Sans référence"} · {passport.category || "Produit"}</p></div><div className="public-passport-score"><strong>{passport.complianceScore}%</strong><span>avancement documentaire déclaré</span></div></section>
    <section className="public-passport-grid"><article><Factory size={19} /><span>Fabricant</span><strong>{passport.manufacturer || "À préciser"}</strong><small>{passport.originCountry || "Origine à préciser"}</small></article><article><Globe2 size={19} /><span>Marchés ciblés</span><strong>{passport.targetMarkets.length || 0} pays</strong><small>{passport.targetMarkets.join(", ") || "À préciser"}</small></article><article><ShieldCheck size={19} /><span>Mise à jour</span><strong>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(passport.updatedAt))}</strong><small>Fiche publiée par l’opérateur</small></article></section>
    {text(passport.publicData.description) ? <section className="passport-public-section"><h2>Présentation du produit</h2><p>{text(passport.publicData.description)}</p></section> : null}
    <section className="passport-public-details"><article><Recycle size={21} /><div><h2>Matériaux et fin de vie</h2>{materials.length ? <div className="tag-list">{materials.map((material) => <span key={material}>{material}</span>)}</div> : null}<p>{text(passport.publicData.disposalInstructions) || "Consultez les consignes locales applicables."}</p></div></article><article><Wrench size={21} /><div><h2>Entretien et réparation</h2><p>{text(passport.publicData.repairInstructions) || "Consultez la notice du fabricant avant toute intervention."}</p>{supportUrl ? <a className="inline-link" href={supportUrl} target="_blank" rel="noreferrer">Notice et assistance</a> : null}</div></article></section>
    <footer className="public-passport-footer"><ShieldCheck size={17} /><p>Ce passeport fournit des informations déclarées et traçables. Il ne constitue pas, à lui seul, une certification réglementaire.</p></footer>
  </article></main>;
}

