import { TeamManagement } from "@/components/team/team-management";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { getWorkspaceTeam } from "@/lib/data/team";

export const metadata = { title: "Équipe" };

export default async function TeamPage() {
  const workspace = await getWorkspaceContext();
  const members = await getWorkspaceTeam(workspace);
  const canManage = ["Propriétaire", "Administrateur", "owner", "admin"].includes(workspace.role);

  return (
    <main>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Collaboration sécurisée</span>
          <h1>Équipe et responsabilités</h1>
          <p>Invitez les personnes utiles, définissez leur rôle et gardez une responsabilité claire sur chaque dossier.</p>
        </div>
      </section>

      <TeamManagement
        authenticated={workspace.mode === "authenticated"}
        canManage={canManage}
        currentUserId={workspace.userId}
        members={members}
        organizationId={workspace.organizationId}
      />
    </main>
  );
}
