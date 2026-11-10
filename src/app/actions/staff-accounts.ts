"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedPrincipal } from "@/lib/auth/dal";
import { hasSupabaseAdminConfig, createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/auth/staff-accounts";
import { createClient } from "@supabase/supabase-js";

export type StaffAccountActionState = {
  error: string | null;
  success: string | null;
};

const initialError = "Unable to complete the staff account request.";

async function getOwner() {
  const principal = await getAuthenticatedPrincipal();
  return principal?.role === "owner" ? principal : null;
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStaffId(formData: FormData): string | null {
  const id = getString(formData, "staffId");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

function getBranchIds(formData: FormData): string[] | null {
  const values = formData.getAll("branchIds");
  if (values.some((value) => typeof value !== "string")) {
    return null;
  }

  const ids = values.map((value) => String(value).trim());
  if (
    ids.length === 0 ||
    ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) ||
    new Set(ids).size !== ids.length
  ) {
    return null;
  }
  return ids;
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function fail(error = initialError): StaffAccountActionState {
  return { error, success: null };
}

function succeed(success: string): StaffAccountActionState {
  revalidatePath("/owner");
  return { error: null, success };
}

async function deleteInvitedUser(userId: string): Promise<void> {
  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(userId);
  if (error) {
    console.error("Failed to remove a partially provisioned Staff identity:", error.message);
  }
}

export async function createStaffAccountAction(
  _previousState: StaffAccountActionState,
  formData: FormData,
): Promise<StaffAccountActionState> {
  const owner = await getOwner();
  if (!owner) {
    return fail("Only an active Owner can create Staff accounts.");
  }

  const fullName = getString(formData, "fullName");
  const email = getString(formData, "email").toLowerCase();
  const branchIds = getBranchIds(formData);
  const siteUrl = getSiteUrl();

  if (fullName.length < 2 || fullName.length > 100 || !isValidEmail(email) || !branchIds) {
    return fail("Enter a valid name, email, and at least one branch.");
  }
  if (!siteUrl) {
    return fail("Staff invitations are not configured yet. Contact your administrator.");
  }
  if (!hasSupabaseAdminConfig()) {
    return fail("Staff account provisioning is not configured yet. Contact your administrator.");
  }

  const branchesById = new Map(owner.branches.map((branch) => [branch.id, branch]));
  if (branchIds.some((id) => !branchesById.has(id))) {
    return fail("Select only active branches available to this Owner.");
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${siteUrl}/staff/update-password`,
  });

  if (error || !data.user) {
    console.error("Staff invitation failed:", error?.message ?? "Missing invited user.");
    return fail("Unable to send the invitation. Check the email and try again.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "staff") {
    console.error("Invited Staff profile was not provisioned correctly:", profileError?.message ?? "Invalid profile.");
    await deleteInvitedUser(data.user.id);
    return fail();
  }

  const { error: assignmentError } = await supabase
    .from("staff_branch_assignments")
    .insert(
      branchIds.map((branchId) => ({
        staff_id: data.user.id,
        branch_id: branchId,
        assigned_by: owner.id,
      })),
    );

  if (assignmentError) {
    console.error("Initial Staff branch assignment failed:", assignmentError.message);
    await deleteInvitedUser(data.user.id);
    return fail("The account invitation could not be completed with the selected branches.");
  }

  return succeed("Staff invitation sent.");
}

export async function updateStaffStatusAction(
  _previousState: StaffAccountActionState,
  formData: FormData,
): Promise<StaffAccountActionState> {
  const owner = await getOwner();
  if (!owner) {
    return fail("Only an active Owner can manage Staff accounts.");
  }

  const staffId = getStaffId(formData);
  const activeValue = getString(formData, "isActive");
  if (!staffId || (activeValue !== "true" && activeValue !== "false")) {
    return fail("Invalid Staff account request.");
  }
  if (activeValue === "true") {
    const supabase = await createServerSupabaseClient();
    const { data: assignments, error } = await supabase
      .from("staff_branch_assignments")
      .select("branch_id")
      .eq("staff_id", staffId);

    if (error) {
      console.error("Unable to verify Staff branch assignments:", error.message);
      return fail();
    }

    const activeBranchIds = new Set(owner.branches.map((branch) => branch.id));
    if (!assignments?.some((assignment) => activeBranchIds.has(assignment.branch_id))) {
      return fail("Assign this Staff member to an active branch before activating the account.");
    }
  }
  if (!hasSupabaseAdminConfig()) {
    return fail("Staff account management is not configured yet. Contact your administrator.");
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ is_active: activeValue === "true" })
    .eq("id", staffId)
    .eq("role", "staff")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Staff account status update failed:", error?.message ?? "Staff profile not found.");
    return fail();
  }

  return succeed(activeValue === "true" ? "Staff account activated." : "Staff account deactivated.");
}

export async function updateStaffBranchesAction(
  _previousState: StaffAccountActionState,
  formData: FormData,
): Promise<StaffAccountActionState> {
  const owner = await getOwner();
  if (!owner) {
    return fail("Only an active Owner can manage Staff branch assignments.");
  }

  const staffId = getStaffId(formData);
  const branchIds = getBranchIds(formData);
  if (!staffId || !branchIds) {
    return fail("Choose at least one valid active branch.");
  }

  const availableBranches = new Set(owner.branches.map((branch) => branch.id));
  if (branchIds.some((id) => !availableBranches.has(id))) {
    return fail("Select only active branches available to this Owner.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", staffId)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "staff" || !profile.is_active) {
    return fail("Only active Staff accounts can be assigned to branches.");
  }

  const { data: currentAssignments, error: assignmentsError } = await supabase
    .from("staff_branch_assignments")
    .select("branch_id")
    .eq("staff_id", staffId);

  if (assignmentsError) {
    console.error("Unable to load current Staff assignments:", assignmentsError.message);
    return fail();
  }

  const currentIds = new Set((currentAssignments ?? []).map((assignment) => assignment.branch_id));
  const additions = branchIds.filter((id) => !currentIds.has(id));
  const removals = [...currentIds].filter((id) => !branchIds.includes(id));

  if (removals.length > 0) {
    const { error } = await supabase
      .from("staff_branch_assignments")
      .delete()
      .eq("staff_id", staffId)
      .in("branch_id", removals);

    if (error) {
      console.error("Unable to remove Staff branch assignments:", error.message);
      return fail("Some assignments could not be removed. Review the current branch list and try again.");
    }
  }

  if (additions.length > 0) {
    const { error } = await supabase.from("staff_branch_assignments").insert(
      additions.map((branchId) => ({
        staff_id: staffId,
        branch_id: branchId,
        assigned_by: owner.id,
      })),
    );
    if (error) {
      console.error("Unable to add Staff branch assignments:", error.message);
      if (removals.length > 0) {
        revalidatePath("/owner");
      }
      return fail("Some previous assignments were removed, but new assignments could not be added.");
    }
  }

  return succeed("Staff branch assignments updated.");
}

export async function sendStaffPasswordResetAction(
  _previousState: StaffAccountActionState,
  formData: FormData,
): Promise<StaffAccountActionState> {
  if (!(await getOwner())) {
    return fail("Only an active Owner can send Staff password reset links.");
  }

  const staffId = getStaffId(formData);
  const siteUrl = getSiteUrl();
  if (!staffId || !siteUrl) {
    return fail("Password reset is not configured for this account.");
  }
  if (!hasSupabaseAdminConfig()) {
    return fail("Staff account management is not configured yet. Contact your administrator.");
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", staffId)
    .maybeSingle();
  if (profileError || !profile || profile.role !== "staff" || !profile.is_active) {
    return fail("Password reset is available only for active Staff accounts.");
  }

  const { data, error: userError } = await admin.auth.admin.getUserById(staffId);
  if (userError || !data.user.email) {
    console.error("Unable to find the Staff login email:", userError?.message ?? "Email missing.");
    return fail();
  }

  const config = getSupabasePublicConfig();
  if (!config) {
    return fail("Authentication is not configured yet. Contact your administrator.");
  }

  const authClient = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { error } = await authClient.auth.resetPasswordForEmail(data.user.email, {
    redirectTo: `${siteUrl}/staff/update-password`,
  });

  if (error) {
    console.error("Staff password reset email failed:", error.message);
    return fail("Unable to send the password reset email. Try again later.");
  }

  return succeed("Password reset link sent.");
}
