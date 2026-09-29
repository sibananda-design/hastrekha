import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export function razorpayConfigured() {
  return Boolean(env.razorpayKeyId() && env.razorpayKeySecret());
}

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout success signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", env.razorpayKeySecret()).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook_secret) in X-Razorpay-Signature. */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = env.razorpayWebhookSecret();
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export async function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  const auth = Buffer.from(`${env.razorpayKeyId()}:${env.razorpayKeySecret()}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
  });
  if (!res.ok) {
    throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as { id: string; amount: number; currency: string };
}
