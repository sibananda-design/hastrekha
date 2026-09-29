import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";

export const LEGAL_UPDATED = "29 September 2026";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@hastrekha.ai";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line/70 bg-sand">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Hastrekha AI home">
            <Wordmark compact />
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm font-semibold text-maroon">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-serif text-4xl font-semibold text-maroon">{title}</h1>
        <p className="mt-2 text-sm text-umber">Last updated: {LEGAL_UPDATED}</p>
        <div className="legal mt-8 space-y-4 text-ink [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-maroon [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_p]:leading-relaxed [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
