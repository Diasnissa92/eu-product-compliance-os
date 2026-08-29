"use client";

import { AlertCircle, CheckCircle2, Clock3, MailPlus, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { assignableTeamRoles, personInitials, teamRoleCopy } from "@/lib/team";
import type { TeamMember, TeamRole } from "@/lib/types";

type TeamManagementProps = {
  authenticated: boolean;
  canManage: boolean;
  currentUserId?: string;
  members: TeamMember[];
  organizationId?: string;
};

export function TeamManagement({ authenticated, canManage, currentUserId, members, organizationId }: TeamManagementProps) {
  const [localMembers, setLocalMembers] = useState(members);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [pendingAction, setPendingAction] = useState<string>();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !organizationId && authenticated) return;
    if (localMembers.some((member) => member.email?.toLowerCase() === normalizedEmail)) {
      setError("Cette personne appartient déjà à l’équipe ou possède une invitation en attente.");
      return;
    }

    setPendingAction("invite");
    setMessage(null);
    setError(null);

    if (!authenticated) {
      const name = fullName.trim() || normalizedEmail.split("@")[0];
      setLocalMembers((current) => [...current, {
        userId: `demo-${Date.now()}`,
        fullName: name,
        initials: personInitials(name),
        email: normalizedEmail,
        role,
        joinedAt: "À l’instant",
        status: "invited",
      }]);
      setEmail("");
      setFullName("");
      setMessage("Invitation simulée en mode démonstration.");
      setPendingAction(undefined);
      return;
    }

    try {
      const { data, error: inviteError } = await createClient().functions.invoke("invite-member", {
        body: { organizationId, email: normalizedEmail, fullName: fullName.trim(), role },
      });
      if (inviteError || !data?.member) throw new Error(data?.error || inviteError?.message || "L’invitation n’a pas pu être envoyée.");
      const member = data.member as TeamMember;
      setLocalMembers((current) => [...current.filter((item) => item.userId !== member.userId), member]);
      setEmail("");
      setFullName("");
      setMessage(data.message || `Invitation envoyée à ${normalizedEmail}.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "L’invitation n’a pas pu être envoyée.");
    } finally {
      setPendingAction(undefined);
    }
  }

  async function changeRole(member: TeamMember, nextRole: TeamRole) {
    if (member.role === nextRole || member.role === "owner") return;
    setPendingAction(member.userId);
    setMessage(null);
    setError(null);

    try {
      if (authenticated) {
        const { error: updateError } = await createClient().rpc("update_organization_member_role", {
          p_org_id: organizationId!,
          p_user_id: member.userId,
          p_role: nextRole,
        });
        if (updateError) throw new Error(`Le rôle n’a pas pu être modifié : ${updateError.message}`);
      }
      setLocalMembers((current) => current.map((item) => item.userId === member.userId ? { ...item, role: nextRole } : item));
      setMessage(`Le rôle de ${member.fullName} a été mis à jour.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Le rôle n’a pas pu être modifié.");
    } finally {
      setPendingAction(undefined);
    }
  }

  const activeCount = localMembers.filter((member) => member.status === "active").length;
  const invitedCount = localMembers.length - activeCount;

  return (
    <div className="team-layout">
      <section className="panel team-main-panel">
        <div className="panel-heading team-heading">
          <div><span className="eyebrow">Accès à l’organisation</span><h2>Membres</h2></div>
          <div className="team-summary" aria-label={`${activeCount} membres actifs et ${invitedCount} invitations`}>
            <span><UserRoundCheck size={15} />{activeCount} actif{activeCount > 1 ? "s" : ""}</span>
            {invitedCount ? <span><Clock3 size={15} />{invitedCount} invité{invitedCount > 1 ? "s" : ""}</span> : null}
          </div>
        </div>

        {message ? <div className="inline-message team-message" aria-live="polite"><CheckCircle2 size={16} />{message}</div> : null}
        {error ? <div className="inline-message inline-message-error team-message" role="alert"><AlertCircle size={16} />{error}</div> : null}

        <div className="team-list">
          {localMembers.map((member) => (
            <article className="team-member" key={member.userId}>
              <span className="avatar team-avatar">{member.initials}</span>
              <div className="team-member-identity">
                <strong>{member.fullName}{member.userId === currentUserId ? " (vous)" : ""}</strong>
                <small>{member.email || member.jobTitle || "Membre de l’organisation"}</small>
              </div>
              <span className={`member-status member-status-${member.status}`}>
                {member.status === "active" ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
                {member.status === "active" ? "Actif" : "Invitation envoyée"}
              </span>
              {canManage && member.role !== "owner" ? (
                <label className="member-role-select">
                  <span className="sr-only">Rôle de {member.fullName}</span>
                  <select
                    disabled={pendingAction === member.userId}
                    value={member.role}
                    onChange={(event) => void changeRole(member, event.target.value as TeamRole)}
                  >
                    {assignableTeamRoles.map((value) => <option value={value} key={value}>{teamRoleCopy[value].label}</option>)}
                  </select>
                </label>
              ) : <span className="member-role-fixed"><ShieldCheck size={14} />{teamRoleCopy[member.role].label}</span>}
            </article>
          ))}
        </div>
      </section>

      <aside className="team-side-column">
        <section className="panel invite-panel">
          <span className="invite-icon"><MailPlus size={20} /></span>
          <span className="eyebrow">Nouvel accès</span>
          <h2>Inviter un membre</h2>
          <p>La personne recevra un lien sécurisé pour rejoindre uniquement cette organisation.</p>
          {canManage || !authenticated ? (
            <form className="invite-form" onSubmit={inviteMember}>
              <label className="field"><span>Nom</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ex. Marie Dupont" /></label>
              <label className="field"><span>Adresse e-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="marie@entreprise.fr" required /></label>
              <label className="field"><span>Rôle</span><select value={role} onChange={(event) => setRole(event.target.value as TeamRole)}>{assignableTeamRoles.map((value) => <option value={value} key={value}>{teamRoleCopy[value].label}</option>)}</select></label>
              <small className="role-description">{teamRoleCopy[role].description}</small>
              <button className="button button-primary button-full" disabled={pendingAction === "invite"} type="submit">
                <MailPlus size={16} />{pendingAction === "invite" ? "Envoi…" : "Envoyer l’invitation"}
              </button>
            </form>
          ) : <div className="permission-note"><ShieldCheck size={18} /><p>Seuls le propriétaire et les administrateurs peuvent inviter ou modifier l’équipe.</p></div>}
        </section>

        <section className="panel roles-panel">
          <div className="roles-title"><UsersRound size={18} /><strong>Rôles clairs</strong></div>
          {(["owner", "admin", "editor", "reviewer", "viewer"] as TeamRole[]).map((value) => (
            <div className="role-line" key={value}><strong>{teamRoleCopy[value].label}</strong><small>{teamRoleCopy[value].description}</small></div>
          ))}
        </section>
      </aside>
    </div>
  );
}
