import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Records that the user accepted the Terms + entertainment disclaimer (DPDP consent). */
export async function recordConsent(userId: string) {
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq("id", userId)
    .is("terms_accepted_at", null);
}

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  free_credit_used: boolean;
  reading_credits: number;
};
