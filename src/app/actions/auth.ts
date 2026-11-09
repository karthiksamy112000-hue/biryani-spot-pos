"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedPrincipal } from "@/lib/auth/dal";
import type { PortalRole } from "@/lib/auth/roles";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
};

const invalidCredentialsMessage = "Unable to sign in with those details.";

export async function signInAction(
  expectedRole: PortalRole,
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (expectedRole !== "owner" && expectedRole !== "staff") {
    return { error: invalidCredentialsMessage };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length === 0) {
    return { error: "Enter a valid email address and password." };
  }

  if (!getSupabasePublicConfig()) {
    return { error: "Authentication is not configured yet. Contact your administrator." };
  }

  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    return { error: invalidCredentialsMessage };
  }

  const principal = await getAuthenticatedPrincipal();
  if (!principal || principal.role !== expectedRole) {
    await supabase.auth.signOut();
    return { error: "This account is not enabled for this portal." };
  }

  redirect(expectedRole === "owner" ? "/owner" : "/staff");
}