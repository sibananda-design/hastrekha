import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";
import { env, PRICE_PAISE } from "@/lib/env";
import { jsonError, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  const { user } = await getUser();
  if (!user) return unauthorized();

  if (!razorpayConfigured()) {
    return jsonError(503, "PAYMENTS_OFF", "Payments are being set up. Please try again soon.");
  }

  let order;
  try {
    order = await createOrder(PRICE_PAISE, `hr_${Date.now()}`, { user_id: user.id, product: "reading_10q" });
  } catch (e) {
    console.error("payments: order failed", e);
    return jsonError(502, "ORDER_FAILED", "We couldn't start the payment. Please try again.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("payments").insert({
    user_id: user.id,
    razorpay_order_id: order.id,
    amount_paise: PRICE_PAISE,
    status: "created",
  });
  if (error) {
    console.error("payments: insert failed", error);
    return jsonError(500, "DB_ERROR", "We couldn't start the payment. Please try again.");
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.razorpayKeyId(),
    prefill: { email: user.email ?? "", contact: user.phone ? `+${user.phone.replace(/^\+/, "")}` : "" },
  });
}
