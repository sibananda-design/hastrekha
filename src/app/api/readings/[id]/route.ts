import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

/** Permanently deletes a reading, its chat and its palm image. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getUser();
  if (!user) return unauthorized();

  const admin = createAdminClient();
  const { data: reading } = await admin
    .from("readings")
    .select("id, image_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!reading) return jsonError(404, "NOT_FOUND", "Reading not found.");

  await admin.storage.from("palms").remove([reading.image_path]);
  const { error } = await admin.from("readings").delete().eq("id", id).eq("user_id", user.id);
  if (error) return jsonError(500, "DB_ERROR", "We couldn't delete this reading. Please try again.");

  return NextResponse.json({ ok: true });
}
