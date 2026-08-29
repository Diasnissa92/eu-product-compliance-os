"use client";

import { CheckCircle2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { createClient } from "@/lib/supabase/client";

export function PasswordUpdateForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      router.replace("/dashboard?password=updated");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Le mot de passe n’a pas pu être modifié.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand"><span className="brand-mark"><BrandMark size={25} /></span><span><strong>EU Compliance</strong><small>Product OS</small></span></div>
      <span className="auth-icon"><KeyRound size={21} /></span>
      <span className="eyebrow">Sécurité du compte</span>
      <h1>Choisir un nouveau mot de passe</h1>
      <p>Utilisez au moins 8 caractères et évitez un mot de passe déjà utilisé ailleurs.</p>
      <form className="auth-form" onSubmit={submit}>
        <label className="field"><span>Nouveau mot de passe</span><input autoFocus autoComplete="new-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label className="field"><span>Confirmer le mot de passe</span><input autoComplete="new-password" type="password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
        {error ? <p className="form-feedback form-feedback-error" role="alert">{error}</p> : null}
        <button className="button button-primary button-full" type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le mot de passe"}<CheckCircle2 size={17} /></button>
      </form>
    </div>
  );
}
