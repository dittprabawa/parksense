import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const cloudConfigured = Boolean(url && key?.startsWith("sb_publishable_"));
let client: SupabaseClient | undefined;

export function supabase() {
  if (!cloudConfigured) throw new Error("Set the Supabase project URL and publishable key, then rebuild ParkSense.");
  return client ??= createClient(url!, key!);
}

export function messageOf(error: unknown) {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message : "Request failed. Check your connection and retry.";
}
