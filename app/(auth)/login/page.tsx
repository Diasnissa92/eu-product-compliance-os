import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getWorkspaceContext } from "@/lib/auth/workspace";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  const workspace = await getWorkspaceContext();
  if (workspace.mode === "authenticated") redirect("/dashboard");
  if (workspace.mode === "onboarding") redirect("/onboarding");
  return <LoginForm />;
}
