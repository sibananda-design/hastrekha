"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Lock, MessageCircleMore, ScrollText, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = { open: () => void; on: (evt: string, cb: (resp: unknown) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type Status = "idle" | "starting" | "checkout" | "verifying" | "success";

export function PaymentModal({
  reason,
  onClose,
  onPaid,
}: {
  reason?: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    void loadCheckout();
  }, []);

  async function pay() {
    setError(null);
    setStatus("starting");
    const ok = await loadCheckout();
    if (!ok || !window.Razorpay) {
      setStatus("idle");
      setError("We couldn't load the payment window. Please check your connection and try again.");
      return;
    }

    let order: { orderId: string; amount: number; currency: string; keyId: string; prefill: Record<string, string> };
    try {
      const res = await fetch("/api/payments/order", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "We couldn't start the payment.");
      order = json;
    } catch (e) {
      setStatus("idle");
      setError((e as Error).message || "We couldn't start the payment. Please try again.");
      return;
    }

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "Hastrekha AI",
      description: "1 palm reading + 10 astrologer questions",
      prefill: order.prefill,
      theme: { color: "#7A1F2B" },
      handler: async (resp: RazorpayResponse) => {
        done.current = true;
        setStatus("verifying");
        try {
          const res = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resp),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error?.message);
          setStatus("success");
          setTimeout(onPaid, 1200);
        } catch (e) {
          setStatus("idle");
          setError(
            (e as Error).message ||
              "Payment received, but we couldn't confirm it yet. Your credit will appear shortly — no need to pay again.",
          );
        }
      },
      modal: {
        ondismiss: () => {
          if (done.current) return;
          setStatus("idle");
          setError("Payment was cancelled. No money was taken — you can try again anytime.");
        },
      },
    });
    rzp.on("payment.failed", () => {
      done.current = false;
      setStatus("idle");
      setError("The payment didn't go through. No credit was changed — please try again or use another method.");
    });
    setStatus("checkout");
    rzp.open();
  }

  const busy = status === "starting" || status === "checkout" || status === "verifying";

  return (
    <Modal onClose={busy ? () => {} : onClose} labelledBy="pay-title">
      <div className="relative overflow-hidden rounded-t-2xl bg-maroon px-6 pb-6 pt-7 text-cream">
        <button
          onClick={onClose}
          disabled={busy}
          className="absolute right-3 top-3 rounded-lg p-2 text-cream/80 hover:text-cream disabled:opacity-40"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="eyebrow text-[#f3be6a]">Unlock a new reading</p>
        <h2 id="pay-title" className="mt-1 font-serif text-3xl font-semibold">
          ₹99 <span className="text-lg font-normal text-cream/80">incl. GST</span>
        </h2>
        {reason && <p className="mt-2 text-sm text-cream/85">{reason}</p>}
      </div>

      <div className="space-y-5 px-6 py-6">
        {status === "success" ? (
          <div className="flex flex-col items-center py-6 text-center" role="status">
            <CheckCircle2 className="h-14 w-14 text-success" />
            <p className="mt-3 font-serif text-2xl text-maroon">Payment successful</p>
            <p className="mt-1 text-umber">1 reading credit added to your account.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
                <span>
                  <strong className="text-ink">1 new palm reading</strong>
                  <span className="block text-sm text-umber">Lines, life areas, mounts, traits and remedies</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircleMore className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
                <span>
                  <strong className="text-ink">10 questions to the astrologer</strong>
                  <span className="block text-sm text-umber">Kept with that reading forever</span>
                </span>
              </li>
            </ul>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-umber">
              {["UPI", "Cards", "Net banking", "Wallets"].map((m) => (
                <span key={m} className="rounded-md border border-line bg-blush px-2 py-1">
                  {m}
                </span>
              ))}
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-[#93000a]">
                {error}
              </p>
            )}

            <button onClick={pay} disabled={busy} className="btn-primary w-full text-base">
              {busy ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {status === "verifying" ? "Confirming payment…" : "Opening secure checkout…"}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> {error ? "Try again" : "Pay ₹99 securely"}
                </>
              )}
            </button>
            <p className="text-center text-xs text-umber">Powered by Razorpay · Receipt sent to your email</p>
          </>
        )}
      </div>
    </Modal>
  );
}
