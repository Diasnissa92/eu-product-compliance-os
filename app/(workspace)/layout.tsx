import { AppShell } from "@/components/app-shell";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const workspace = await getWorkspaceContext();
  if (workspace.mode === "onboarding") redirect("/onboarding");
  return <AppShell workspace={workspace}>{children}</AppShell>;
}
