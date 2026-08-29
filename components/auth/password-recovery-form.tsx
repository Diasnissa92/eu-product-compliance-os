"use client";

import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
      const { error: recoveryError } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (recoveryError) throw recoveryError;
      setSent(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "La demande n’a pas pu être envoyée. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand"><span className="brand-mark"><BrandMark size={25} /></span><span><strong>EU Compliance</strong><small>Product OS</small></span></div>
      <span className="auth-icon"><Mail size={21} /></span>
      <span className="eyebrow">Récupération sécurisée</span>
      <h1>Réinitialiser le mot de passe</h1>
      <p>Indiquez l’adresse de votre compte. Si elle existe, vous recevrez un lien sécurisé.</p>
      {sent ? (
        <div className="auth-success-panel" role="status"><CheckCircle2 size={22} /><strong>Consultez votre boîte e-mail</strong><p>Le lien est temporaire. Pensez aussi à vérifier les courriers indésirables.</p></div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <label className="field"><span>Adresse e-mail</span><input autoFocus autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          {error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}
          <button className="button button-primary button-full" type="submit" disabled={pending}>{pending ? "Envoi…" : "Envoyer le lien"}</button>
        </form>
      )}
      <Link className="auth-demo-link" href="/login"><ArrowLeft size={15} />Retour à la connexion</Link>
    </div>
  );
}
