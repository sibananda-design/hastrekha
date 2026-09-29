import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { DISCLAIMER } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-blush/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-12">
        <div className="max-w-sm">
          <p className="flex items-center gap-2 font-serif text-xl text-maroon">
            <LogoMark className="h-7 w-7" /> Hastrekha AI
          </p>
          <p className="mt-2 text-sm text-umber">
            Rooted in Samudrika Shastra. {DISCLAIMER}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-umber" aria-label="Legal">
          <Link href="/terms" className="hover:text-maroon">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-maroon">Privacy Policy</Link>
          <Link href="/refund" className="hover:text-maroon">Refund Policy</Link>
        </nav>
      </div>
      <div className="mx-auto max-w-7xl border-t border-line/70 px-4 py-4 text-xs text-umber sm:px-6 lg:px-12">
        © {new Date().getFullYear()} Hastrekha AI · Designed with reverence in India
      </div>
    </footer>
  );
}
