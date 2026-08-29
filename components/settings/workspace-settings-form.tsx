"use client";

import { AlertCircle, Building2, CheckCircle2, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SettingsValues = {
  userId?: string;
  userEmail?: string;
  fullName: string;
  jobTitle?: string;
  organizationId?: string;
  organizationName: string;
  countryCode?: string;
  canManageOrganization: boolean;
  authenticated: boolean;
};

const countries = [
  ["FR", "France"],
  ["DE", "Allemagne"],
  ["BE", "Belgique"],
  ["NL", "Pays-Bas"],
  ["ES", "Espagne"],
  ["IT", "Italie"],
  ["PT", "Portugal"],
] as const;

export function WorkspaceSettingsForm({ values }: { values: SettingsValues }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(values.fullName);
  const [jobTitle, setJobTitle] = useState(values.jobTitle ?? "");
  const [organizationName, setOrganizationName] = useState(values.organizationName);
  const [countryCode, setCountryCode] = useState(values.countryCode ?? "FR");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setError(undefined);
    if (!values.authenticated || !values.userId) {
      setError("Connectez-vous pour enregistrer ces paramètres.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user || user.id !== values.userId) throw new Error("Votre session a expiré. Reconnectez-vous.");
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName.trim(),
        job_title: jobTitle.trim() || null,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw new Error(`Le profil n’a pas pu être mis à jour : ${profileError.message}`);

      if (values.canManageOrganization && values.organizationId) {
        const { data: organization, error: organizationError } = await supabase
          .from("organizations")
          .update({ name: organizationName.trim(), country_code: countryCode, updated_at: new Date().toISOString() })
          .eq("id", values.organizationId)
          .select("id")
          .single();
        if (organizationError || !organization) throw new Error(`Le profil est enregistré, mais pas l’organisation : ${organizationError?.message ?? "accès refusé"}`);
        await supabase.from("audit_events").insert({
          org_id: values.organizationId,
          user_id: user.id,
          entity_type: "organization",
          entity_id: values.organizationId,
          action: "Paramètres de l’organisation mis à jour",
          payload: { country_code: countryCode },
        });
      }
      setMessage("Les paramètres ont été enregistrés.");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Les paramètres n’ont pas pu être enregistrés.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      {!values.authenticated ? (
        <div className="inline-message settings-message"><AlertCircle size={16} />Le mode démonstration est en lecture seule.</div>
      ) : null}
      {message ? <div className="inline-message settings-message" aria-live="polite"><CheckCircle2 size={16} />{message}</div> : null}
      {error ? <div className="inline-message inline-message-error settings-message" role="alert"><AlertCircle size={16} />{error}</div> : null}

      <section className="panel settings-panel">
        <div className="settings-panel-heading">
          <span className="settings-icon"><UserRound size={20} /></span>
          <div><span className="eyebrow">Compte</span><h2>Votre profil</h2><p>Ces informations identifient les actions consignées dans le journal.</p></div>
        </div>
        <div className="settings-fields">
          <label className="field"><span>Nom complet</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} required disabled={!values.authenticated} /></label>
          <label className="field"><span>Fonction</span><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Ex. Responsable conformité" disabled={!values.authenticated} /></label>
          <label className="field field-full"><span>Adresse e-mail</span><input value={values.userEmail ?? "Mode démonstration"} disabled /></label>
        </div>
      </section>

      <section className="panel settings-panel">
        <div className="settings-panel-heading">
          <span className="settings-icon"><Building2 size={20} /></span>
          <div><span className="eyebrow">Espace sécurisé</span><h2>Organisation</h2><p>Seuls les propriétaires et administrateurs peuvent modifier ces informations.</p></div>
        </div>
        <div className="settings-fields">
          <label className="field"><span>Nom de l’organisation</span><input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required disabled={!values.canManageOrganization} /></label>
          <label className="field"><span>Pays principal</span><select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} disabled={!values.canManageOrganization}>{countries.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
        </div>
      </section>

      <div className="settings-actions">
        <button className="button button-primary" type="submit" disabled={!values.authenticated || pending}>
          <Save size={17} />{pending ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}
