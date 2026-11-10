"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type SignOutButtonProps = {
  label?: string;
  destination?: "/" | "/staff/login";
  className?: string;
  showError?: boolean;
};

export function SignOutButton({
  label = "Sign out",
  destination = "/",
  className = "sign-out-button",
  showError = false,
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  async function signOut() {
    setPending(true);
    setFailed(false);

    try {
      const { error } = await createBrowserSupabaseClient().auth.signOut();
      if (error) {
        setFailed(true);
        setPending(false);
        return;
      }
    } catch (error) {
      console.error("Sign out failed:", error);
      setFailed(true);
      setPending(false);
      return;
    }

    router.replace(destination);
    router.refresh();
  }

  return (
    <>
      <button className={className} disabled={pending} onClick={signOut} type="button">
        {pending ? "Signing out..." : label}
      </button>
      {showError && failed && <p role="alert">Unable to sign out. Please try again.</p>}
    </>
  );
}