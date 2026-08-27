import "server-only";

import { cache } from "react";
import type { WorkspaceContext } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { demoTeam, personInitials } from "@/lib/team";
import type { TeamMember, TeamRole } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function normalizeRole(value: string): TeamRole {
  if (["owner", "admin", "editor", "reviewer", "viewer"].includes(value)) return value as TeamRole;
  return "viewer";
}

const getAuthenticatedTeam = cache(async (organizationId: string): Promise<TeamMember[]> => {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("user_id, role, created_at, invited_email, accepted_at")
    .eq("org_id", organizationId)
    .order("created_at");

  if (error) throw new Error(`Impossible de charger l’équipe : ${error.message}`);
  const userIds = (memberships ?? []).map((membership) => membership.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, job_title").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (memberships ?? []).map((membership) => {
    const profile = profileById.get(membership.user_id);
    const fallbackName = membership.invited_email?.split("@")[0] || "Membre invité";
    const fullName = profile?.full_name || fallbackName;
    return {
      userId: membership.user_id,
      fullName,
      initials: personInitials(fullName),
      email: membership.invited_email ?? undefined,
      jobTitle: profile?.job_title ?? undefined,
      role: normalizeRole(membership.role),
      joinedAt: formatDate(membership.created_at),
      status: membership.accepted_at ? "active" : "invited",
    };
  });
});

export async function getWorkspaceTeam(workspace: WorkspaceContext): Promise<TeamMember[]> {
  if (workspace.mode !== "authenticated" || !workspace.organizationId) return demoTeam;
  return getAuthenticatedTeam(workspace.organizationId);
}
