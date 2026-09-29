import type { Metadata } from "next";
import Image from "next/image";
import { BookOpen, ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { Kolam, Mandala } from "@/components/Ornaments";
import { DISCLAIMER } from "@/lib/constants";

export const metadata: Metadata = { title: "Sign in" };

const MESSAGES: Record<string, string> = {
  oauth_cancelled: "Google sign-in was cancelled. You can try again or use your phone number.",
  oauth_failed: "We couldn't complete Google sign-in. Please try again.",
  link_expired: "That sign-in link has expired or was already used. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string }>;
}) {
  const sp = await searchParams;
  const initialError = sp.error ? (MESSAGES[sp.error] ?? MESSAGES.oauth_failed) : null;
  const initialInfo = sp.deleted ? "Your account and all readings have been deleted." : null;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-12">
      {/* backdrop accents */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f3be6a]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-28 h-[30rem] w-[30rem] rounded-full bg-[#ffdbce]/40 blur-3xl" />
      <Kolam className="pointer-events-none absolute left-6 top-6 hidden h-16 w-16 text-brass/30 md:block" />
      <Kolam className="pointer-events-none absolute right-6 top-6 hidden h-16 w-16 text-brass/30 md:block" />

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <section className="card-float corner-ticks relative p-6 sm:p-10 lg:col-span-7">
          <Mandala className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 text-brass/[0.07]" />
          <LoginForm
            initialError={initialError}
            initialInfo={initialInfo}
            emailEnabled={process.env.NEXT_PUBLIC_ENABLE_EMAIL_LOGIN === "true"}
          />
        </section>

        <aside className="hidden flex-col gap-6 lg:col-span-5 lg:flex">
          <div className="card-float overflow-hidden">
            <div className="relative aspect-[4/3]">
              <Image
                src="/sample-palm.jpg"
                alt="An open right palm photographed in warm light"
                fill
                sizes="(min-width: 1024px) 400px, 0px"
                className="object-cover"
                priority
              />
              <svg
                aria-hidden
                viewBox="0 0 400 300"
                className="absolute inset-0 h-full w-full"
                fill="none"
                strokeLinecap="round"
              >
                <path d="M140 140 Q185 118 230 119" stroke="#7A1F2B" strokeWidth="3" opacity=".85" />
                <path d="M238 148 Q195 152 150 176" stroke="#C8643B" strokeWidth="3" opacity=".85" />
                <path d="M241 146 Q196 196 218 246" stroke="#D4AF37" strokeWidth="3" opacity=".9" />
                <circle cx="230" cy="119" r="4.5" fill="#D4AF37" />
                <circle cx="218" cy="246" r="4.5" fill="#7A1F2B" />
              </svg>
              <span className="absolute bottom-3 left-3 rounded-full bg-cream/90 px-3 py-1 text-xs font-semibold text-maroon">
                Heart · Head · Life lines
              </span>
            </div>
            <div className="p-5">
              <p className="eyebrow text-terracotta-dark">What you get</p>
              <p className="mt-1 font-serif text-xl text-ink">A reading in under 20 seconds</p>
              <p className="mt-1 text-sm text-umber">
                Palm lines, life areas, planetary mounts, traits and simple remedies — then ask follow-up questions.
              </p>
            </div>
          </div>

          <div className="flex gap-4 rounded-2xl bg-blush-2 p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-maroon text-cream">
              <BookOpen className="h-6 w-6" />
            </span>
            <div>
              <p className="font-serif text-xl text-ink">Rooted in Samudrika Shastra</p>
              <p className="mt-1 text-sm text-umber">
                Interpretations follow classical Indian palmistry: the four major rekhas and the seven planetary
                mounts, explained warmly and without fear.
              </p>
            </div>
          </div>

          <ul className="space-y-2 px-2 text-sm text-umber">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brass" /> Palm photos stored privately; delete anytime
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brass" /> {DISCLAIMER}
            </li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
