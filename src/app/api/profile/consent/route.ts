import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { recordConsent } from "@/lib/profile";
import { unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  const { user } = await getUser();
  if (!user) return unauthorized();
  await recordConsent(user.id);
  return NextResponse.json({ ok: true });
}
