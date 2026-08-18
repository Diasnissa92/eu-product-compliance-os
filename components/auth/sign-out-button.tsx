"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <button className="account-sign-out" type="button" onClick={signOut} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={15} /></button>;
}
