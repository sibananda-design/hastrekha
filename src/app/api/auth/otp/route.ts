import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIMITS } from "@/lib/env";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

const schema = z.object({ phone: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number.") });

/** Sends an SMS OTP after enforcing 5 requests / phone / hour. Verification happens in the browser. */
export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(400, "BAD_PHONE", body.error.issues[0]?.message ?? "Invalid phone number.");
  const phone = `+91${body.data.phone}`;

  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("otp_requests")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);
  if ((count ?? 0) >= LIMITS.otpPerPhonePerHour) {
    return jsonError(429, "RATE_LIMITED", "Too many OTP requests for this number. Please try again in an hour.");
  }
  await admin.from("otp_requests").insert({ phone });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: "sms" } });
  if (error) {
    console.error("otp: send failed", error.message);
    const msg = /provider|sms|phone.*(disabled|not enabled)/i.test(error.message)
      ? "Phone login isn't available right now. Please continue with Google."
      : "We couldn't send the OTP. Please check the number and try again.";
    return jsonError(400, "OTP_FAILED", msg);
  }
  return NextResponse.json({ ok: true });
}
