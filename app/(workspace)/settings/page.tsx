import { WorkspaceSettingsForm } from "@/components/settings/workspace-settings-form";
import { getWorkspaceContext } from "@/lib/auth/workspace";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const workspace = await getWorkspaceContext();
  const canManageOrganization = workspace.mode === "authenticated" && ["Propriétaire", "Administrateur", "owner", "admin"].includes(workspace.role);

  return (
    <main>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Configuration</span>
          <h1>Paramètres</h1>
          <p>Gérez l’identité utilisée dans vos dossiers et les informations principales de votre organisation.</p>
        </div>
      </section>

      <WorkspaceSettingsForm values={{
        userId: workspace.userId,
        userEmail: workspace.userEmail,
        fullName: workspace.userName,
        jobTitle: workspace.jobTitle,
        organizationId: workspace.organizationId,
        organizationName: workspace.organizationName,
        countryCode: workspace.organizationCountry,
        canManageOrganization,
        authenticated: workspace.mode === "authenticated",
      }} />
    </main>
  );
}
