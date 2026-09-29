import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { jsonError, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/**
 * Called after Checkout succeeds. The credit is granted here only after the server verifies
 * Razorpay's HMAC signature; the webhook (payment.captured) grants it too, idempotently.
 */
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return unauthorized();

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(400, "BAD_REQUEST", "Invalid payment response.");
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body.data;

  if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return jsonError(400, "BAD_SIGNATURE", "We couldn't verify this payment. If money was deducted, it will be credited shortly.");
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("user_id")
    .eq("razorpay_order_id", razorpay_order_id)
    .single();
  if (!payment || payment.user_id !== user.id) {
    return jsonError(404, "NOT_FOUND", "We couldn't find this payment.");
  }

  const { error } = await admin.rpc("grant_payment_credit", {
    p_order_id: razorpay_order_id,
    p_payment_id: razorpay_payment_id,
  });
  if (error) {
    console.error("payments: grant failed", error);
    return jsonError(500, "DB_ERROR", "Payment received — your credit will appear in a moment.");
  }

  const { data: profile } = await admin.from("profiles").select("reading_credits").eq("id", user.id).single();
  return NextResponse.json({ ok: true, reading_credits: profile?.reading_credits ?? 0 });
}
