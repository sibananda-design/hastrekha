import type { Metadata } from "next";
import { LegalPage, SUPPORT_EMAIL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what personal data Hastrekha AI collects, why, and your rights under India&apos;s Digital
        Personal Data Protection Act, 2023 (DPDP Act). By ticking the consent box at sign-in you consent to the
        processing described here.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> your Google email and name, or your mobile number.</li>
        <li><strong>Reading details:</strong> name, date of birth, gender and which hand you photographed.</li>
        <li>
          <strong>Palm photos:</strong> we treat these as sensitive, biometric-like personal data. They are resized on
          your device before upload and stored in a private, encrypted storage bucket.
        </li>
        <li><strong>Chat messages</strong> you send to the astrologer and its answers.</li>
        <li><strong>Payment records:</strong> order and payment IDs and amounts from Razorpay. We never see or store your card or UPI details.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To generate your palm reading and answer your chat questions.</li>
        <li>To manage your credits and payments, and prevent free-reading abuse.</li>
        <li>To keep the service secure and to track AI cost per reading.</li>
      </ul>
      <p>
        We do <strong>not</strong> use your palm photos for anything other than your reading, do not sell your data, and
        do not use it for advertising.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li>
          <strong>OpenAI</strong> (AI model provider) receives your palm photo and details to generate the reading, and
          your reading and questions to answer chats. Data sent through its API is not used to train its models.
        </li>
        <li><strong>Supabase</strong> hosts our database, sign-in and private photo storage.</li>
        <li><strong>Vercel</strong> hosts the website and server functions.</li>
        <li><strong>Razorpay</strong> processes payments.</li>
        <li>An SMS provider delivers OTP codes to your phone.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Palm photos, readings and chats are kept until you delete the reading or your account. When you delete them,
        they are removed permanently. Payment records are kept for tax and accounting purposes with your identity
        removed. To prevent repeat free readings we keep a one-way hash of your phone number or email.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>Access and correct your data in the app.</li>
        <li>Delete a reading (My Readings → delete) or your whole account (profile menu → Delete my account).</li>
        <li>Withdraw consent at any time by deleting your account.</li>
        <li>Raise a grievance with us, and if unresolved, with the Data Protection Board of India.</li>
      </ul>

      <h2>Contact / Grievance officer</h2>
      <p>
        Email <a className="text-maroon underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We respond
        within 30 days.
      </p>
    </LegalPage>
  );
}
