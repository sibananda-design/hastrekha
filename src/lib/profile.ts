import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Records that the signed-in user accepted the Terms + entertainment disclaimer (DPDP consent).
 * Uses the user's own session via the `accept_terms()` function, which only sets their own timestamp.
 */
export async function recordConsent(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("accept_terms");
  if (error) console.error("consent: failed", error.message);
}

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  free_credit_used: boolean;
  reading_credits: number;
};
