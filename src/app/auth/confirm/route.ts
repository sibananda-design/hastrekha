import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { recordConsent } from "@/lib/profile";

export const runtime = "nodejs";

/**
 * Token-hash email confirmation (Supabase's recommended SSR flow).
 * Unlike the PKCE `?code=` flow it works even if the link is opened in a different browser.
 * Email template link: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&consent=1
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;

  if (!tokenHash) return NextResponse.redirect(`${url.origin}/login?error=link_expired`);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return NextResponse.redirect(`${url.origin}/login?error=link_expired`);

  if (url.searchParams.get("consent") === "1") await recordConsent(supabase);
  return NextResponse.redirect(`${url.origin}/upload`);
}
