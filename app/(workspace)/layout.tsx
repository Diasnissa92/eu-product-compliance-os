import { AppShell } from "@/components/app-shell";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getWorkspaceNotifications } from "@/lib/data/notifications";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const workspace = await getWorkspaceContext();
  if (workspace.mode === "onboarding") redirect("/onboarding");
  const notificationCount = await getWorkspaceNotifications(workspace)
    .then((notifications) => notifications.length)
    .catch(() => 0);

  return <AppShell workspace={workspace} notificationCount={notificationCount}>{children}</AppShell>;
}
