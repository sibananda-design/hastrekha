import type { Metadata } from "next";
import { LegalPage, SUPPORT_EMAIL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy">
      <p>Each paid reading costs ₹99 (inclusive of applicable taxes) and includes 1 palm reading plus 10 chat questions.</p>

      <h2>Automatic protection</h2>
      <ul>
        <li>A reading credit is used only when your reading is successfully generated.</li>
        <li>If your photo is rejected as unclear, or the AI fails, your credit stays in your account automatically.</li>
        <li>If a chat answer fails, that question is returned to you automatically.</li>
        <li>If money was deducted but no credit appeared, it is usually added within a few minutes once Razorpay confirms the payment.</li>
      </ul>

      <h2>Refund requests</h2>
      <ul>
        <li>
          If you paid but have not used the credit, you can request a full refund within 7 days of purchase by emailing{" "}
          <a className="text-maroon underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your Razorpay
          payment ID.
        </li>
        <li>Once a paid credit has been used to generate a reading, it is not refundable, as the service has been delivered.</li>
        <li>For duplicate or failed-but-charged payments we refund in full.</li>
        <li>Approved refunds are issued to the original payment method via Razorpay, usually within 5–7 working days.</li>
        <li>When a refund is issued, one unused reading credit is removed from your account.</li>
      </ul>

      <h2>Cancellation</h2>
      <p>There are no subscriptions. You can stop using the service or delete your account at any time.</p>
    </LegalPage>
  );
}
