import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

type WebhookEvent = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; status: string } };
    refund?: { entity: { id: string; payment_id: string } };
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const evt = JSON.parse(raw) as WebhookEvent;
  const admin = createAdminClient();

  try {
    switch (evt.event) {
      case "payment.captured":
      case "order.paid": {
        const p = evt.payload.payment?.entity;
        if (p?.order_id) {
          const { error } = await admin.rpc("grant_payment_credit", { p_order_id: p.order_id, p_payment_id: p.id });
          if (error && !error.message.includes("UNKNOWN_ORDER")) throw error;
        }
        break;
      }
      case "payment.failed": {
        const p = evt.payload.payment?.entity;
        if (p?.order_id) {
          await admin
            .from("payments")
            .update({ status: "failed", razorpay_payment_id: p.id, updated_at: new Date().toISOString() })
            .eq("razorpay_order_id", p.order_id)
            .eq("status", "created");
        }
        break;
      }
      case "refund.processed":
      case "refund.created":
      case "payment.refunded": {
        const paymentId = evt.payload.refund?.entity.payment_id ?? evt.payload.payment?.entity.id;
        if (paymentId) {
          const { error } = await admin.rpc("refund_payment", { p_payment_id: paymentId });
          if (error) throw error;
        }
        break;
      }
    }
  } catch (e) {
    console.error("webhook: failed", evt.event, e);
    // Non-2xx makes Razorpay retry; all handlers are idempotent.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
