import type { TeamMember, TeamRole } from "@/lib/types";

export const teamRoleCopy: Record<TeamRole, { label: string; description: string }> = {
  owner: { label: "Propriétaire", description: "Contrôle total de l’organisation et de l’équipe." },
  admin: { label: "Administrateur", description: "Gère l’équipe, les produits et les validations." },
  editor: { label: "Contributeur", description: "Ajoute les preuves et traite les exigences." },
  reviewer: { label: "Vérificateur", description: "Commente et participe à la revue réglementaire." },
  viewer: { label: "Lecture seule", description: "Consulte les dossiers sans pouvoir les modifier." },
};

export const assignableTeamRoles: TeamRole[] = ["admin", "editor", "reviewer", "viewer"];

export function personInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EU";
}

export const demoTeam: TeamMember[] = [
  {
    userId: "demo-hugo",
    fullName: "Hugo Dias",
    initials: "HD",
    email: "hugo@nordhavn.eu",
    jobTitle: "Responsable conformité",
    role: "owner",
    joinedAt: "18 août 2026",
    status: "active",
  },
  {
    userId: "demo-sofia",
    fullName: "Sofia Martin",
    initials: "SM",
    email: "sofia@nordhavn.eu",
    jobTitle: "Spécialiste réglementaire",
    role: "reviewer",
    joinedAt: "19 août 2026",
    status: "active",
  },
  {
    userId: "demo-lucas",
    fullName: "Lucas Bernard",
    initials: "LB",
    email: "lucas@nordhavn.eu",
    jobTitle: "Responsable achats",
    role: "editor",
    joinedAt: "20 août 2026",
    status: "active",
  },
];
