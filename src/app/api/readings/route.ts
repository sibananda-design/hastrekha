import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/http";

/** Past readings for the "My Readings" panel, with 60-minute signed thumbnail URLs. */
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return unauthorized();

  const { data: rows } = await supabase
    .from("readings")
    .select("id, name, hand, image_path, created_at, questions_total, questions_remaining, is_free")
    .order("created_at", { ascending: false })
    .limit(50);

  const readings = rows ?? [];
  let urls: Record<string, string | null> = {};
  if (readings.length) {
    const { data: signed } = await supabase.storage
      .from("palms")
      .createSignedUrls(readings.map((r) => r.image_path), 60 * 60);
    urls = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
  }

  return NextResponse.json(
    {
      readings: readings.map(({ image_path, ...r }) => ({ ...r, thumb: urls[image_path] ?? null })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
