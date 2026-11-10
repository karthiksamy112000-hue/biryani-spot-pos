"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";

export function createBrowserSupabaseClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase public configuration is missing.");
  }

  return createBrowserClient(config.url, config.publishableKey);
}

export function createBrowserSupabaseRecoveryClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase public configuration is missing.");
  }

  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: true,
      flowType: "implicit",
      persistSession: true,
    },
  });
}