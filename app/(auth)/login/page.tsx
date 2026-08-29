import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getWorkspaceContext } from "@/lib/auth/workspace";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const workspace = await getWorkspaceContext();
  if (workspace.mode === "authenticated") redirect("/dashboard");
  if (workspace.mode === "onboarding") redirect("/onboarding");
  return <LoginForm initialError={query.error === "confirmation" ? "Le lien de connexion est invalide ou a expiré. Demandez un nouveau lien." : undefined} />;
}
