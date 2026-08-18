"use client";

import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setMessage(undefined);

    if (!isSupabaseConfigured) {
      setError("La connexion sera disponible dès que les variables Supabase seront ajoutées à Vercel.");
      return;
    }

    setPending(true);
    const supabase = createClient();

    if (mode === "sign-in") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message === "Invalid login credentials" ? "Adresse e-mail ou mot de passe incorrect." : signInError.message);
        setPending(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
      return;
    }

    setMessage("Compte créé. Consultez votre boîte e-mail pour confirmer votre adresse.");
    setPending(false);
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-mark"><ShieldCheck size={24} /></span>
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
        {mode === "sign-up" ? <label className="field"><span>Nom complet</span><input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Hugo Dias" required /></label> : null}
        <label className="field"><span>Adresse e-mail</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@entreprise.fr" required /></label>
        <label className="field"><span>Mot de passe</span><input autoComplete={mode === "sign-in" ? "current-password" : "new-password"} type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" required /></label>
        {error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}
        {message ? <p className="form-feedback form-feedback-success"><CheckCircle2 size={16} />{message}</p> : null}
        <button className="button button-primary button-full" type="submit" disabled={pending}>{pending ? "Chargement…" : mode === "sign-in" ? "Se connecter" : "Créer mon espace"}<ArrowRight size={17} /></button>
      </form>

      <Link className="auth-demo-link" href="/dashboard">Continuer avec la démonstration</Link>
      <small className="auth-legal">Vos données sont isolées par organisation et protégées par des règles d’accès.</small>
    </div>
  );
}
