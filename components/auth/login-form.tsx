"use client";

import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { PasswordField } from "@/components/auth/password-field";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const [message, setMessage] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setMessage(undefined);

    if (!isSupabaseConfigured) {
      setError("Le service de connexion n’est pas configuré. Contactez l’administrateur de la plateforme.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 12) {
      setError(mode === "sign-up" ? "Utilisez une adresse e-mail valide et un mot de passe d’au moins 12 caractères." : "Adresse e-mail ou mot de passe incorrect.");
      return;
    }
    if (mode === "sign-up" && fullName.trim().length < 2) {
      setError("Renseignez votre nom complet.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError) throw signInError;
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
        return;
      }
      setMessage("Compte créé. Consultez votre boîte e-mail pour confirmer votre adresse avant de vous connecter.");
    } catch (caughtError) {
      const detail = caughtError instanceof Error ? caughtError.message : "Le service de connexion est momentanément indisponible.";
      setError(detail === "Invalid login credentials" ? "Adresse e-mail ou mot de passe incorrect." : detail);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark"><BrandMark size={25} /></span>
        <span><strong>EU Compliance</strong><small>Product OS</small></span>
      </div>
      <span className="auth-icon"><LockKeyhole size={21} /></span>
      <span className="eyebrow">Espace sécurisé</span>
      <h1>{mode === "sign-in" ? "Accéder à votre espace" : "Créer votre compte"}</h1>
      <p>{mode === "sign-in" ? "Retrouvez vos produits, preuves et actions réglementaires." : "Créez votre organisation et votre premier dossier de conformité."}</p>

      <div className="auth-tabs" role="tablist" aria-label="Mode de connexion">
        <button aria-selected={mode === "sign-in"} className={mode === "sign-in" ? "auth-tab auth-tab-active" : "auth-tab"} role="tab" type="button" onClick={() => setMode("sign-in")}>Connexion</button>
        <button aria-selected={mode === "sign-up"} className={mode === "sign-up" ? "auth-tab auth-tab-active" : "auth-tab"} role="tab" type="button" onClick={() => setMode("sign-up")}>Créer un compte</button>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {mode === "sign-up" ? <label className="field"><span>Nom complet</span><input autoComplete="name" maxLength={160} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Votre nom" required /></label> : null}
        <label className="field"><span>Adresse e-mail</span><input autoComplete="email" maxLength={320} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@entreprise.fr" required /></label>
        <PasswordField label="Mot de passe" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="12 caractères minimum" />
        {mode === "sign-in" ? <Link className="auth-recovery-link" href="/forgot-password">Mot de passe oublié ?</Link> : null}
        {error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}
        {message ? <p className="form-feedback form-feedback-success"><CheckCircle2 size={16} />{message}</p> : null}
        <button className="button button-primary button-full" type="submit" disabled={pending}>{pending ? "Chargement…" : mode === "sign-in" ? "Se connecter" : "Créer mon espace"}<ArrowRight size={17} /></button>
      </form>

      <small className="auth-legal">Vos données sont isolées par organisation et protégées par des règles d’accès.</small>
    </div>
  );
}
