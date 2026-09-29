"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Hand, Loader2, Mail, MessagesSquare, Send, ShieldCheck, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

const RESEND_SECONDS = 30;
const OTP_LENGTH = 6;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function LoginForm({
  initialError,
  initialInfo,
  emailEnabled,
}: {
  initialError: string | null;
  initialInfo: string | null;
  emailEnabled: boolean;
}) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(initialInfo);

  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [sentAt, setSentAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState<null | "google" | "send" | "verify" | "email">(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  function requireConsent() {
    if (agreed) return true;
    setConsentError(true);
    document.getElementById("consent")?.focus();
    return false;
  }

  async function google() {
    setError(null);
    if (!requireConsent()) return;
    setBusy("google");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?consent=1` },
    });
    if (error) {
      setBusy(null);
      setError(
        /provider is not enabled/i.test(error.message)
          ? "Google sign-in isn't available right now. Please use your phone number."
          : "We couldn't start Google sign-in. Please try again.",
      );
    }
  }

  async function sendOtp() {
    setError(null);
    setInfo(null);
    if (!requireConsent()) return;
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setBusy("send");
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "We couldn't send the OTP.");
      setStep("otp");
      setOtp(Array(OTP_LENGTH).fill(""));
      setSentAt(Date.now());
      setSecondsLeft(RESEND_SECONDS);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function verifyOtp(code = otp.join("")) {
    setError(null);
    if (code.length !== OTP_LENGTH) {
      setError("Please enter the 6-digit OTP.");
      return;
    }
    setBusy("verify");
    const { error } = await createClient().auth.verifyOtp({ phone: `+91${phone}`, token: code, type: "sms" });
    if (error) {
      setBusy(null);
      const elapsed = (Date.now() - sentAt) / 1000;
      setError(
        /expired/i.test(error.message) && elapsed > 60
          ? "This OTP has expired. Please tap Resend to get a new one."
          : "That OTP is incorrect. Please check the SMS and try again.",
      );
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
      return;
    }
    await fetch("/api/profile/consent", { method: "POST" }).catch(() => {});
    router.replace("/upload");
    router.refresh();
  }

  async function sendEmail() {
    setError(null);
    if (!requireConsent()) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setBusy("email");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?consent=1` },
    });
    setBusy(null);
    if (error) setError("We couldn't send the sign-in link. Please try again in a minute.");
    else setEmailSent(true);
  }

  function onOtpChange(i: number, value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length > 1) {
      // Paste or SMS autofill of the whole code
      const next = digits.slice(0, OTP_LENGTH).split("");
      const filled = [...next, ...Array(OTP_LENGTH).fill("")].slice(0, OTP_LENGTH);
      setOtp(filled);
      otpRefs.current[Math.min(next.length, OTP_LENGTH - 1)]?.focus();
      if (next.length === OTP_LENGTH) void verifyOtp(next.join(""));
      return;
    }
    const nextOtp = [...otp];
    nextOtp[i] = digits;
    setOtp(nextOtp);
    if (digits && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
    if (digits && nextOtp.every(Boolean)) void verifyOtp(nextOtp.join(""));
  }

  function onOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
  }

  return (
    <div className="relative">
      <div className="mb-6 flex items-center justify-center gap-3 sm:justify-between">
        <span className="hidden items-center gap-2 sm:flex">
          <span className="h-2.5 w-2.5 rounded-full bg-terracotta" />
          <span className="eyebrow text-terracotta-dark">Samudrika Shastra AI</span>
        </span>
        <span className="chip">
          <Sparkles className="h-3.5 w-3.5 text-brass" /> First reading free
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <span className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-blush p-2 shadow-sm ring-1 ring-brass/20">
          <LogoMark className="h-full w-full" />
        </span>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-maroon sm:text-[2.6rem]">Hastrekha AI</h1>
        <p className="mt-1 font-serif text-lg italic text-umber">Your palm, your path</p>
      </div>

      <ol className="my-7 grid grid-cols-3 gap-2 rounded-xl bg-blush px-3 py-4 sm:gap-4">
        {[
          { icon: Hand, title: "Upload your palm", sub: "A clear photo" },
          { icon: Sparkles, title: "Get your reading", sub: "Lines & mounts" },
          { icon: MessagesSquare, title: "Ask the astrologer", sub: "Follow-up questions" },
        ].map(({ icon: Icon, title, sub }, i) => (
          <li key={title} className="flex flex-col items-center text-center">
            <span className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-cream text-maroon shadow-sm">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[0.8rem] font-semibold leading-tight text-ink sm:text-sm">
              {i + 1}. {title}
            </span>
            <span className="hidden text-xs text-umber sm:block">{sub}</span>
          </li>
        ))}
      </ol>

      {(error || info) && (
        <p
          role={error ? "alert" : "status"}
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            error ? "bg-danger-bg text-[#93000a]" : "bg-[#e6f2e8] text-success"
          }`}
        >
          {error || info}
        </p>
      )}

      <button
        onClick={google}
        disabled={busy !== null}
        className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 text-[1.05rem] font-semibold text-ink shadow-sm transition hover:bg-[#fffaf5] disabled:opacity-60"
      >
        {busy === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-sm text-umber">
        <span className="h-px flex-1 bg-line" />
        <span className="flex items-center gap-2">
          <span className="text-brass">◆</span> or continue with phone <span className="text-brass">◆</span>
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {step === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendOtp();
          }}
          className="space-y-3"
        >
          <label htmlFor="phone" className="label">
            Mobile number
          </label>
          <div className="flex overflow-hidden rounded-xl border-[1.5px] border-line bg-cream focus-within:border-brass focus-within:shadow-[0_0_0_3px_rgba(184,137,59,0.15)]">
            <span className="flex items-center gap-1.5 border-r border-line bg-blush-2 px-3 font-semibold text-ink">
              <span aria-hidden>🇮🇳</span> +91
            </span>
            <input
              id="phone"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="min-h-[52px] w-full bg-transparent px-3 text-lg tracking-wide outline-none"
            />
          </div>
          <button type="submit" disabled={busy !== null || phone.length !== 10} className="btn-primary w-full text-base">
            {busy === "send" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
            Send OTP
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verifyOtp();
          }}
          className="space-y-4 rounded-xl bg-blush p-4 sm:p-5"
        >
          <div className="flex items-center justify-between">
            <label htmlFor="otp-0" className="font-semibold text-ink">
              Enter 6-digit OTP
            </label>
            {secondsLeft > 0 ? (
              <span className="flex items-center gap-1 text-sm font-semibold text-terracotta-dark" aria-live="polite">
                <Clock className="h-4 w-4" /> Resend in {secondsLeft}s
              </span>
            ) : (
              <button
                type="button"
                onClick={sendOtp}
                disabled={busy !== null}
                className="text-sm font-semibold text-maroon underline underline-offset-4"
              >
                Resend OTP
              </button>
            )}
          </div>
          <div className="flex justify-between gap-2">
            {otp.map((d, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                value={d}
                onChange={(e) => onOtpChange(i, e.target.value)}
                onKeyDown={(e) => onOtpKey(i, e)}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={i === 0 ? OTP_LENGTH : 1}
                aria-label={`Digit ${i + 1}`}
                className="h-14 w-full min-w-0 rounded-xl border-[1.5px] border-line bg-cream text-center font-serif text-2xl text-ink outline-none focus:border-maroon focus:shadow-[0_0_0_3px_rgba(122,31,43,0.12)]"
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-sm text-umber">
            <span>SMS sent to +91 {phone}</span>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
              className="font-semibold text-maroon"
            >
              Change number
            </button>
          </div>
          <button
            type="submit"
            disabled={busy !== null}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-dark px-4 font-semibold text-cream transition hover:brightness-110 disabled:opacity-60"
          >
            {busy === "verify" ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Verify & continue
          </button>
        </form>
      )}

      {emailEnabled && (
        <div className="mt-5">
          {emailSent ? (
            <p role="status" className="rounded-xl bg-[#e6f2e8] px-4 py-3 text-sm text-success">
              Check your inbox — we sent a sign-in link to {email}.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendEmail();
              }}
              className="flex gap-2"
            >
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="or sign in with email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
              <button type="submit" disabled={busy !== null} className="btn-secondary shrink-0">
                {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                <span className="hidden sm:inline">Email link</span>
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mt-6">
        <label className="flex cursor-pointer items-start gap-3 text-[0.95rem] leading-snug text-ink">
          <input
            id="consent"
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (e.target.checked) setConsentError(false);
            }}
            className="mt-0.5 h-5 w-5 shrink-0 accent-maroon"
            aria-describedby={consentError ? "consent-error" : undefined}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-semibold text-maroon underline underline-offset-2">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-maroon underline underline-offset-2">
              Privacy Policy
            </Link>
            , and understand readings are for entertainment.
          </span>
        </label>
        {consentError && (
          <p id="consent-error" role="alert" className="mt-2 pl-8 text-sm font-semibold text-danger">
            Please tick this box to continue.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-line pt-5 text-xs font-semibold text-umber">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-brass" /> Private & encrypted
        </span>
        <span>18+ only</span>
        <span>For entertainment & self-reflection</span>
      </div>
    </div>
  );
}
