import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/http";

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, free_credit_used, reading_credits")
    .eq("id", user.id)
    .single();
  return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
}
