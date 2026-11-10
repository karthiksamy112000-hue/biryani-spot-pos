"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createBrowserSupabaseClient,
  createBrowserSupabaseRecoveryClient,
} from "@/lib/supabase/browser";

type FormStatus = "checking" | "ready" | "saving" | "complete" | "invalid" | "unavailable";

export function StaffPasswordForm() {
  const [status, setStatus] = useState<FormStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function verifySession() {
      try {
        const supabase = createBrowserSupabaseRecoveryClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session) {
          if (active) {
            setStatus("invalid");
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", data.session.user.id)
          .maybeSingle();

        if (active) {
          setStatus(
            !profileError && profile?.role === "staff" && profile.is_active
              ? "ready"
              : profileError ? "unavailable" : "invalid",
          );
        }
        if (!profileError && (profile?.role !== "staff" || !profile.is_active)) {
          await supabase.auth.signOut();
        }
      } catch (verificationError) {
        console.error("Staff password link verification failed:", verificationError);
        if (active) {
          setStatus("unavailable");
        }
      }
    }

    void verifySession();

    return () => {
      active = false;
    };
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setStatus("saving");
    try {
      const { error: updateError } = await createBrowserSupabaseRecoveryClient().auth.updateUser({ password });
      if (updateError) {
        setError("Unable to update the password. Request a new secure link and try again.");
        setStatus("ready");
        return;
      }
    } catch (updateError) {
      console.error("Staff password update failed:", updateError);
      setError("Unable to update the password. Request a new secure link and try again.");
      setStatus("ready");
      return;
    }

    setStatus("complete");
    try {
      const { error: recoverySignOutError } =
        await createBrowserSupabaseRecoveryClient().auth.signOut();
      const { error: appSignOutError } =
        await createBrowserSupabaseClient().auth.signOut();
      if (recoverySignOutError || appSignOutError) {
        console.error(
          "Password updated but a browser session could not be cleared:",
          recoverySignOutError?.message ?? appSignOutError?.message,
        );
        setError("Your password was updated. Please sign out and use it to sign in again.");
        return;
      }
    } catch (signOutError) {
      console.error(
        "Password updated but a browser session could not be cleared:",
        signOutError,
      );
      setError("Your password was updated. Please sign out and use it to sign in again.");
      return;
    }

    router.replace("/staff/login");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Back to Biryani Spot portal selection">
          <span className="brand-monogram" aria-hidden="true">BS</span>
          <span className="brand-label"><span>Biryani Spot</span><span>Staff access</span></span>
        </Link>
        <span className="topbar-label">SECURE ACCESS</span>
      </header>
      <section className="auth-main" aria-labelledby="password-title">
        <div className="auth-panel auth-panel--owner">
          <p className="eyebrow">STAFF ACCOUNT</p>
          <h1 id="password-title">Set your password</h1>
          <p className="auth-description">Choose a private password to finish setting up or recovering your Staff account.</p>
          {status === "checking" && <p className="auth-description" role="status">Verifying your secure link...</p>}
          {status === "invalid" && (
            <p className="auth-error" role="alert">This link is invalid or expired. Ask your Owner to send a new invitation or reset link.</p>
          )}
          {status === "unavailable" && (
            <p className="auth-error" role="alert">Unable to verify this link right now. Check your connection and try again.</p>
          )}
          {status === "complete" && (
            <>
              <p className="auth-description" role="status">Password updated. Sign in with your new password.</p>
              {error && <p className="auth-error" role="alert">{error}</p>}
            </>
          )}
          {status === "ready" || status === "saving" ? (
            <form className="auth-form" onSubmit={updatePassword}>
              <label htmlFor="staff-new-password">New password</label>
              <input autoComplete="new-password" id="staff-new-password" minLength={8} name="password" required type="password" />
              <label htmlFor="staff-confirm-password">Confirm password</label>
              <input autoComplete="new-password" id="staff-confirm-password" minLength={8} name="confirmation" required type="password" />
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" disabled={status === "saving"} type="submit">
                {status === "saving" ? "Updating password..." : "Save password"}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          ) : null}
          <Link className="back-link" href="/staff/login"><span aria-hidden="true">←</span> Staff sign in</Link>
        </div>
      </section>
    </main>
  );
}
