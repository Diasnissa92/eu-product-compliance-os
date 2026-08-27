import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allowedRoles = new Set(["admin", "editor", "reviewer", "viewer"]);
const productionCallback = "https://eu-product-compliance-os.vercel.app/auth/callback?next=/team";

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EU";
}

function getDefaultKey(variableName: "SUPABASE_PUBLISHABLE_KEYS" | "SUPABASE_SECRET_KEYS", legacyName: string) {
  const keys = Deno.env.get(variableName);
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    if (parsed.default) return parsed.default;
  }
  return Deno.env.get(legacyName) || "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Méthode non autorisée." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return response({ error: "Connexion requise." }, 401);

    const url = Deno.env.get("SUPABASE_URL") || "";
    const publishableKey = getDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const secretKey = getDefaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !publishableKey || !secretKey) return response({ error: "Configuration Supabase incomplète." }, 500);

    const callerClient = createClient(url, publishableKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const token = authorization.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser(token);
    if (callerError || !caller) return response({ error: "Session invalide ou expirée." }, 401);

    const payload = await request.json() as { organizationId?: string; email?: string; fullName?: string; role?: string };
    const organizationId = payload.organizationId?.trim();
    const email = payload.email?.trim().toLowerCase();
    const fullName = payload.fullName?.trim() || email?.split("@")[0] || "Membre invité";
    const role = payload.role?.trim() || "viewer";

    if (!organizationId || !email || !/^\S+@\S+\.\S+$/.test(email)) return response({ error: "Organisation ou adresse e-mail invalide." }, 400);
    if (!allowedRoles.has(role)) return response({ error: "Rôle non autorisé." }, 400);

    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: callerMembership } = await admin
      .from("organization_members")
      .select("role")
      .eq("org_id", organizationId)
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) return response({ error: "Droits administrateur requis." }, 403);

    const { data: existingInvitation } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("org_id", organizationId)
      .ilike("invited_email", email)
      .maybeSingle();
    if (existingInvitation) return response({ error: "Cette adresse possède déjà un accès ou une invitation." }, 409);

    const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) return response({ error: "La liste des utilisateurs n’est pas accessible." }, 500);
    let invitedUser = usersPage.users.find((user) => user.email?.toLowerCase() === email);
    let newlyInvited = false;

    if (!invitedUser) {
      const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: productionCallback,
      });
      if (invitationError || !invitation.user) return response({ error: invitationError?.message || "L’invitation Auth n’a pas pu être créée." }, 400);
      invitedUser = invitation.user;
      newlyInvited = true;
    }

    const { data: existingMembership } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("org_id", organizationId)
      .eq("user_id", invitedUser.id)
      .maybeSingle();
    if (existingMembership) return response({ error: "Cette personne est déjà membre de l’organisation." }, 409);

    const { error: profileError } = await admin.from("profiles").upsert({
      id: invitedUser.id,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id", ignoreDuplicates: !newlyInvited });
    if (profileError) {
      if (newlyInvited) await admin.auth.admin.deleteUser(invitedUser.id);
      return response({ error: `Le profil invité n’a pas pu être préparé : ${profileError.message}` }, 500);
    }

    const acceptedAt = newlyInvited ? null : new Date().toISOString();
    const { error: membershipError } = await admin.from("organization_members").insert({
      org_id: organizationId,
      user_id: invitedUser.id,
      role,
      invited_email: email,
      invited_by: caller.id,
      accepted_at: acceptedAt,
    });
    if (membershipError) {
      if (newlyInvited) await admin.auth.admin.deleteUser(invitedUser.id);
      return response({ error: `L’accès à l’organisation n’a pas pu être créé : ${membershipError.message}` }, 500);
    }

    await admin.from("audit_events").insert({
      org_id: organizationId,
      user_id: caller.id,
      entity_type: "organization",
      entity_id: organizationId,
      action: newlyInvited ? "Membre invité" : "Membre ajouté",
      payload: { member_user_id: invitedUser.id, invited_email: email, role },
    });

    return response({
      message: newlyInvited ? `Invitation envoyée à ${email}.` : `${email} a été ajouté à l’organisation.`,
      member: {
        userId: invitedUser.id,
        fullName,
        initials: initials(fullName),
        email,
        role,
        joinedAt: "À l’instant",
        status: newlyInvited ? "invited" : "active",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inattendue.";
    return response({ error: message }, 500);
  }
});
