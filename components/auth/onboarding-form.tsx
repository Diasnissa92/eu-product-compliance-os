"use client";

import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(defaultName);
  const [organizationName, setOrganizationName] = useState("");
  const [countryCode, setCountryCode] = useState("FR");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);

    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Votre session a expiré. Reconnectez-vous.");
      const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, full_name: fullName.trim(), job_title: "Administrateur" });
      if (profileError) throw profileError;
      const suffix = crypto.randomUUID().slice(0, 6);
      const { error: organizationError } = await supabase.from("organizations").insert({
        name: organizationName.trim(),
        slug: `${slugify(organizationName) || "organisation"}-${suffix}`,
        country_code: countryCode,
        created_by: user.id,
      });
      if (organizationError) throw organizationError;
      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "L’organisation n’a pas pu être créée.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-card onboarding-card" onSubmit={submit}>
      <span className="auth-icon"><Building2 size={22} /></span>
      <span className="eyebrow">Première configuration</span>
      <h1>Créez votre organisation</h1>
      <p>Elle isolera vos utilisateurs, produits et documents dans un espace sécurisé.</p>
      <div className="auth-form">
        <label className="field"><span>Votre nom</span><input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
        <label className="field"><span>Nom de l’organisation</span><input autoFocus value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Ex. BATIDIAS" required /></label>
        <label className="field"><span>Pays principal</span><select value={countryCode} onChange={(event) => setCountryCode(event.target.value)}><option value="FR">France</option><option value="PT">Portugal</option><option value="BE">Belgique</option><option value="DE">Allemagne</option><option value="ES">Espagne</option><option value="IT">Italie</option><option value="NL">Pays-Bas</option></select></label>
        {error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}
        <button className="button button-primary button-full" type="submit" disabled={pending}>{pending ? "Création…" : "Créer mon organisation"}<ArrowRight size={17} /></button>
      </div>
      <small className="auth-legal"><ShieldCheck size={14} />Vous devenez automatiquement propriétaire de cet espace.</small>
    </form>
  );
}
