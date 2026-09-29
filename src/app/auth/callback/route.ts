import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordConsent } from "@/lib/profile";

export const runtime = "nodejs";

/** OAuth / magic-link return URL. Exchanges the code for a session and records consent. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    const reason = oauthError === "access_denied" ? "oauth_cancelled" : "oauth_failed";
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }
  if (!code) return NextResponse.redirect(`${origin}/login?error=oauth_failed`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  // The login page only lets people continue after ticking the Terms checkbox.
  if (url.searchParams.get("consent") === "1") await recordConsent(supabase);

  return NextResponse.redirect(`${origin}/upload`);
}
