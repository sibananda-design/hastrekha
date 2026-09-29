"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CalendarDays,
  Download,
  Gem,
  Hand,
  HeartHandshake,
  HeartPulse,
  Loader2,
  Maximize2,
  Plus,
  Share2,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import type { Reading } from "@/lib/reading-schema";
import { DISCLAIMER } from "@/lib/constants";
import { downloadReadingPdf, shareReading } from "@/lib/export";
import { ImageZoom } from "@/components/ImageZoom";
import { ChatWidget, type ChatMessage } from "./ChatWidget";

export type ReadingInfo = {
  id: string;
  name: string;
  dob: string;
  gender: string;
  hand: string;
  isFree: boolean;
  questionsTotal: number;
  questionsRemaining: number;
  createdAt: string;
};

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

const LINES = [
  { key: "heart", title: "Heart line", sub: "Hridaya Rekha", color: "#7A1F2B" },
  { key: "head", title: "Head line", sub: "Mastishka Rekha", color: "#2F5E8C" },
  { key: "life", title: "Life line", sub: "Jeevan Rekha", color: "#2F6B3A" },
  { key: "fate", title: "Fate line", sub: "Bhagya Rekha", color: "#C8643B" },
] as const;

const AREAS = [
  { key: "career", title: "Career", icon: Briefcase },
  { key: "love_marriage", title: "Love & Marriage", icon: HeartHandshake },
  { key: "health", title: "Health", icon: HeartPulse },
  { key: "wealth", title: "Wealth", icon: Wallet },
] as const;

const MOUNT_SANSKRIT: Record<string, string> = {
  Jupiter: "Guru",
  Saturn: "Shani",
  Sun: "Surya",
  Mercury: "Budha",
  Venus: "Shukra",
  Moon: "Chandra",
  Mars: "Mangal",
};

function strengthPct(s: string) {
  const v = s.toLowerCase();
  if (/(very|highly|strong|prominent|well)/.test(v)) return 88;
  if (/(balanced|moderate|average|medium)/.test(v)) return 64;
  if (/(subtle|flat|low|weak|less)/.test(v)) return 38;
  return 60;
}

const COLOUR_MAP: Record<string, string> = {
  saffron: "#F4C430",
  maroon: "#7A1F2B",
  gold: "#D4AF37",
  golden: "#D4AF37",
  yellow: "#F2C230",
  orange: "#E8793A",
  red: "#C0392B",
  green: "#2F8F4E",
  blue: "#2F5E8C",
  "sky blue": "#6CB4E4",
  white: "#FFFFFF",
  cream: "#FFFDF8",
  pink: "#E88BA6",
  purple: "#7D4B9E",
  violet: "#7F3FBF",
  silver: "#C0C0C0",
  brown: "#8B5A2B",
  black: "#222222",
  indigo: "#3F3D99",
  turquoise: "#40BFB0",
  peach: "#F6B38E",
};

function swatch(colour: string) {
  const v = colour.toLowerCase();
  const key = Object.keys(COLOUR_MAP)
    .sort((a, b) => b.length - a.length)
    .find((k) => v.includes(k));
  return key ? COLOUR_MAP[key] : "#B8893B";
}

function SectionCard({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-float corner-ticks animate-fade-up p-5 sm:p-7">
      <header className="mb-5 flex items-center justify-between gap-3 border-b border-brass/30 pb-3">
        <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-maroon">
          <Icon className="h-5 w-5 text-brass" /> {title}
        </h2>
        {aside && <span className="chip hidden text-xs sm:inline-flex">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

export function ReadingView({
  reading,
  result,
  imageUrl,
  messages,
}: {
  reading: ReadingInfo;
  result: Reading;
  imageUrl: string | null;
  messages: ChatMessage[];
}) {
  const [zoom, setZoom] = useState(false);
  const [busy, setBusy] = useState<"pdf" | "share" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const meta = { name: reading.name, dob: reading.dob, hand: reading.hand, createdAt: reading.createdAt };

  async function onPdf() {
    setBusy("pdf");
    setNotice(null);
    try {
      await downloadReadingPdf(result, meta, imageUrl);
    } catch {
      setNotice("We couldn't create the PDF. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onShare() {
    setBusy("share");
    setNotice(null);
    try {
      const outcome = await shareReading(result, meta);
      if (outcome === "downloaded") setNotice("Image saved — attach it in the WhatsApp chat that just opened.");
    } catch {
      setNotice("We couldn't create the share image. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const mounts = [...result.mounts].sort(
    (a, b) =>
      Object.keys(MOUNT_SANSKRIT).indexOf(a.name) - Object.keys(MOUNT_SANSKRIT).indexOf(b.name),
  );
  const dominant = mounts.reduce<(typeof mounts)[number] | null>(
    (best, m) => (!best || strengthPct(m.strength) > strengthPct(best.strength) ? m : best),
    null,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-1.5 text-terracotta-dark">
            <Sparkles className="h-4 w-4" /> Samudrika Shastra reading
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-maroon sm:text-4xl lg:text-[2.6rem]">
            {reading.name}&apos;s palm reading
          </h1>
          <p className="mt-1 text-umber">Read on {dateFmt.format(new Date(reading.createdAt))}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onPdf} disabled={busy !== null} className="btn-secondary">
            {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
          <button onClick={onShare} disabled={busy !== null} className="btn-secondary">
            {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Share on WhatsApp
          </button>
          <Link href="/upload" className="btn-primary min-h-11">
            <Plus className="h-4 w-4" /> New reading
          </Link>
        </div>
      </div>
      {notice && (
        <p role="status" className="mt-4 rounded-xl bg-blush px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Left: image + info */}
        <aside className="lg:col-span-5">
          <div className="space-y-5 lg:sticky lg:top-24">
            <div className="card-float p-4 sm:p-5">
              <div className="relative mx-auto max-w-[360px]">
                <div className="arch relative aspect-[4/5] overflow-hidden border-4 border-cream bg-blush-2 shadow-[0_0_0_1px_#b8893b]">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={`${reading.name}'s palm`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-umber">
                      <Hand className="h-12 w-12" />
                    </div>
                  )}
                </div>
                {imageUrl && (
                  <button
                    onClick={() => setZoom(true)}
                    className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-cream/95 text-maroon shadow-md ring-1 ring-brass/40"
                    aria-label="Zoom palm photo"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </button>
                )}
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-blush p-4 text-sm">
                <div>
                  <dt className="eyebrow text-umber">Name</dt>
                  <dd className="font-semibold text-ink">{reading.name}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-umber">Date of birth</dt>
                  <dd className="font-semibold text-ink">{dateFmt.format(new Date(reading.dob + "T00:00:00"))}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-umber">Zodiac sign</dt>
                  <dd className="font-semibold text-ink">{result.zodiac_sign}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-umber">Hand</dt>
                  <dd className="font-semibold text-ink">{reading.hand === "right" ? "Right hand" : "Left hand"}</dd>
                </div>
              </dl>
            </div>

            {dominant && (
              <div className="card flex items-center gap-4 p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#593b00] text-[#f3be6a]">
                  <Star className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-semibold text-ink">
                    Strongest mount: {dominant.name} ({MOUNT_SANSKRIT[dominant.name] ?? dominant.name})
                  </p>
                  <p className="text-sm text-umber">{dominant.meaning}</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right: prediction cards */}
        <div className="space-y-6 lg:col-span-7">
          <section className="card-float relative animate-fade-up overflow-hidden p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blush-2" />
            <p className="eyebrow relative flex items-center gap-1.5 text-terracotta-dark">
              <Sparkles className="h-4 w-4" /> Overview
            </p>
            <p className="relative mt-3 text-[1.075rem] leading-relaxed text-ink">{result.summary}</p>
          </section>

          <SectionCard icon={Hand} title="Palm Lines" aside="4 major rekhas">
            <div className="space-y-3">
              {LINES.map((l) => (
                <div key={l.key} className="rounded-xl bg-blush p-4">
                  <p className="flex flex-wrap items-baseline gap-x-2 font-semibold text-ink">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                    {l.title}
                    <span className="text-sm font-normal italic text-umber">{l.sub}</span>
                  </p>
                  <p className="mt-1.5 text-umber">{result.lines[l.key]}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={Sparkles} title="Life Areas">
            <div className="grid gap-3 sm:grid-cols-2">
              {AREAS.map(({ key, title, icon: Icon }) => (
                <div key={key} className="rounded-xl border border-line bg-blush/60 p-4">
                  <p className="flex items-center justify-between font-semibold text-maroon">
                    {title} <Icon className="h-5 w-5 text-brass" />
                  </p>
                  <p className="mt-2 text-umber">{result.life_areas[key]}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={Star} title="Mounts & Traits" aside="7 planetary mounts">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {mounts.map((m) => {
                const pct = strengthPct(m.strength);
                return (
                  <div key={m.name} className="rounded-xl border border-line bg-cream p-3" title={m.meaning}>
                    <p className="flex items-baseline justify-between gap-2 text-sm font-semibold text-ink">
                      <span>
                        {MOUNT_SANSKRIT[m.name] ?? m.name}{" "}
                        <span className="font-normal text-umber">({m.name})</span>
                      </span>
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blush-3">
                      <div className="h-full rounded-full bg-maroon" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs font-semibold capitalize text-terracotta-dark">{m.strength}</p>
                    <p className="mt-1 text-xs leading-snug text-umber">{m.meaning}</p>
                  </div>
                );
              })}
            </div>
            {result.traits.length > 0 && (
              <div className="mt-5">
                <p className="eyebrow mb-2 text-umber">Personality traits</p>
                <div className="flex flex-wrap gap-2">
                  {result.traits.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Gem} title="Remedies & Lucky Items">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-blush p-3">
                <p className="eyebrow text-umber">Lucky colour</p>
                <p className="mt-2 flex items-center gap-2 font-semibold text-ink">
                  <span
                    className="h-5 w-5 shrink-0 rounded-full ring-1 ring-brass/50"
                    style={{ background: swatch(result.remedies.lucky_colour) }}
                  />
                  {result.remedies.lucky_colour}
                </p>
              </div>
              <div className="rounded-xl bg-blush p-3">
                <p className="eyebrow text-umber">Lucky number</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-maroon">{result.remedies.lucky_number}</p>
              </div>
              <div className="rounded-xl bg-blush p-3">
                <p className="eyebrow text-umber">Lucky day</p>
                <p className="mt-2 flex items-center gap-1.5 font-semibold text-ink">
                  <CalendarDays className="h-4 w-4 text-brass" /> {result.remedies.lucky_day}
                </p>
              </div>
              <div className="rounded-xl bg-blush p-3">
                <p className="eyebrow text-umber">Gemstone</p>
                <p className="mt-2 flex items-center gap-1.5 font-semibold text-ink">
                  <Gem className="h-4 w-4 text-brass" /> {result.remedies.gemstone}
                </p>
              </div>
            </div>
            {result.remedies.simple_remedies.length > 0 && (
              <div className="mt-4 rounded-xl border border-brass/30 bg-cream p-4">
                <p className="font-semibold text-ink">Simple remedies</p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-umber">
                  {result.remedies.simple_remedies.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
          </SectionCard>

          <p className="px-2 text-center text-sm italic text-umber">{DISCLAIMER}</p>
        </div>
      </div>

      {zoom && imageUrl && <ImageZoom src={imageUrl} alt={`${reading.name}'s palm`} onClose={() => setZoom(false)} />}

      <ChatWidget reading={reading} initialMessages={messages} />
    </div>
  );
}
