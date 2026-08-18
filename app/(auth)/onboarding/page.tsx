import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getWorkspaceContext } from "@/lib/auth/workspace";

export const metadata = { title: "Créer votre organisation" };

export default async function OnboardingPage() {
  const workspace = await getWorkspaceContext();
  if (workspace.mode === "demo") redirect("/login");
  if (workspace.mode === "authenticated") redirect("/dashboard");
  return <OnboardingForm defaultName={workspace.userName} />;
}
