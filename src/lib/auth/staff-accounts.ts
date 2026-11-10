import "server-only";

import { createSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AuthenticatedPrincipal } from "./roles";

export type ManagedStaffAccount = {
  id: string;
  fullName: string;
  email: string | null;
  emailConfirmed: boolean | null;
  isActive: boolean;
  branches: Array<{ id: string; name: string }>;
};

export type StaffManagementData = {
  accounts: ManagedStaffAccount[];
  adminReady: boolean;
  invitationReady: boolean;
};

export async function getStaffManagementData(
  principal: AuthenticatedPrincipal,
): Promise<StaffManagementData> {
  if (principal.role !== "owner") {
    throw new Error("Only an owner can access staff account management.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("role", "staff")
    .order("full_name");

  if (profilesError) {
    throw new Error("Unable to load staff profiles.");
  }

  const staffIds = (profiles ?? []).map((profile) => profile.id);
  let assignments: Array<{ staff_id: string; branch_id: string }> = [];
  if (staffIds.length > 0) {
    const { data, error } = await supabase
      .from("staff_branch_assignments")
      .select("staff_id, branch_id")
      .in("staff_id", staffIds);

    if (error) {
      throw new Error("Unable to load staff branch assignments.");
    }

    assignments = data ?? [];
  }

  const adminReady = hasSupabaseAdminConfig();
  const emails = new Map<string, string>();
  const confirmedEmails = new Set<string>();
  if (adminReady) {
    const admin = createSupabaseAdminClient();
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (error) {
        throw new Error("Unable to load Staff login details.");
      }

      for (const user of data.users) {
        if (user.email) {
          emails.set(user.id, user.email);
          if (user.email_confirmed_at) {
            confirmedEmails.add(user.id);
          }
        }
      }

      if (data.users.length < 1000) {
        break;
      }
    }
  }

  const branchNames = new Map(principal.branches.map((branch) => [branch.id, branch.name]));
  const assignedByStaff = new Map<string, Set<string>>();
  for (const assignment of assignments) {
    const branchIds = assignedByStaff.get(assignment.staff_id) ?? new Set<string>();
    branchIds.add(assignment.branch_id);
    assignedByStaff.set(assignment.staff_id, branchIds);
  }

  const accounts = (profiles ?? []).map((profile) => ({
    id: profile.id,
    fullName: profile.full_name || "Staff member",
    email: emails.get(profile.id) ?? null,
    emailConfirmed: adminReady ? confirmedEmails.has(profile.id) : null,
    isActive: profile.is_active,
    branches: [...(assignedByStaff.get(profile.id) ?? [])].map((id) => ({
      id,
      name: branchNames.get(id) ?? "Inactive branch",
    })),
  }));

  return {
    accounts,
    adminReady,
    invitationReady: adminReady && Boolean(getSiteUrl()),
  };
}

export function getSiteUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const isLocalHttp = url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (
      (url.protocol !== "https:" && !isLocalHttp) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}
