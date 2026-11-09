"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function signOut() {
    setPending(true);
    const { error } = await createBrowserSupabaseClient().auth.signOut();

    if (error) {
      setPending(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <button className="sign-out-button" disabled={pending} onClick={signOut} type="button">
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}