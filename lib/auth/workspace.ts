import "server-only";

import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceContext = {
  mode: "demo" | "onboarding" | "authenticated";
  userId?: string;
  userEmail?: string;
  userName: string;
  userInitials: string;
  jobTitle?: string;
  role: string;
  organizationId?: string;
  organizationName: string;
  organizationInitials: string;
  organizationCountry?: string;
};

export const demoWorkspace: WorkspaceContext = {
  mode: "demo",
  userName: "Hugo Dias",
  userInitials: "HD",
  role: "Administrateur",
  organizationName: "Nordhavn Design",
  organizationInitials: "ND",
};

const workspaceRoleCopy: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  editor: "Contributeur",
  reviewer: "Vérificateur",
  viewer: "Lecture seule",
};

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EU";
}

export const getWorkspaceContext = cache(async function getWorkspaceContext(): Promise<WorkspaceContext> {
  if (!isSupabaseConfigured) return demoWorkspace;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return demoWorkspace;

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("full_name, job_title").eq("id", user.id).maybeSingle(),
    supabase
      .from("organization_members")
      .select("org_id, role, accepted_at, organizations!inner(id, name, slug, country_code)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  const userName = profile?.full_name || user.user_metadata.full_name || user.email?.split("@")[0] || "Utilisateur";
  if (!membership) {
    return {
      mode: "onboarding",
      userId: user.id,
      userEmail: user.email,
      userName,
      userInitials: initials(userName),
      jobTitle: profile?.job_title ?? undefined,
      role: profile?.job_title || "Administrateur",
      organizationName: "Organisation à créer",
      organizationInitials: "EU",
    };
  }

  const organization = membership.organizations;
  if (!membership.accepted_at) await supabase.rpc("accept_my_organization_invitations");
  return {
    mode: "authenticated",
    userId: user.id,
    userEmail: user.email,
    userName,
    userInitials: initials(userName),
    jobTitle: profile?.job_title ?? undefined,
    role: workspaceRoleCopy[membership.role] ?? membership.role,
    organizationId: organization.id,
    organizationName: organization.name,
    organizationInitials: initials(organization.name),
    organizationCountry: organization.country_code ?? undefined,
  };
});
