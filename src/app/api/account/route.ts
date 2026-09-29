import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Deletes the account: palm images, readings, messages and profile.
 * Payments are kept for tax records with user_id anonymised (FK is ON DELETE SET NULL).
 */
export async function DELETE() {
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  const admin = createAdminClient();

  // Remove every image in the user's folder (paginate in case there are many).
  for (;;) {
    const { data: files } = await admin.storage.from("palms").list(user.id, { limit: 100 });
    if (!files?.length) break;
    await admin.storage.from("palms").remove(files.map((f) => `${user.id}/${f.name}`));
    if (files.length < 100) break;
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("account: delete failed", error);
    return jsonError(500, "DELETE_FAILED", "We couldn't delete your account. Please try again or contact support.");
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
