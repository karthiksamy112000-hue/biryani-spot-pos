import "server-only";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AuthenticatedPrincipal, PortalRole } from "./roles";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
};

type BranchRow = {
  id: string;
  name: string;
};

export async function getAuthenticatedPrincipal(): Promise<AuthenticatedPrincipal | null> {
  if (!getSupabasePublicConfig()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return null;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profileData) {
    return null;
  }

  const profile = profileData as ProfileRow;
  if (!profile.is_active || (profile.role !== "owner" && profile.role !== "staff")) {
    return null;
  }

  const role = profile.role as PortalRole;
  let branches: BranchRow[] = [];

  if (role === "owner") {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order");

    if (error || !data) {
      return null;
    }

    branches = data as BranchRow[];
  } else {
    const { data: assignments, error: assignmentError } = await supabase
      .from("staff_branch_assignments")
      .select("branch_id")
      .eq("staff_id", profile.id);

    if (assignmentError || !assignments?.length) {
      return null;
    }

    const branchIds = assignments.map((assignment) => assignment.branch_id);
    const { data, error } = await supabase
      .from("branches")
      .select("id, name")
      .in("id", branchIds)
      .eq("is_active", true)
      .order("display_order");

    if (error || !data?.length) {
      return null;
    }

    branches = data as BranchRow[];
  }

  return {
    id: profile.id,
    displayName: profile.full_name || authData.user.email || "Team member",
    role,
    branches,
  };
}