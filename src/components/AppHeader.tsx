"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, ScrollText, Sparkles, Trash2, User } from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { creditsLabel, useApp } from "@/components/AppProvider";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

export function AppHeader() {
  const { profile, openPayment, openReadings } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<"logout" | "delete" | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function logout() {
    setBusy("logout");
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function deleteAccount() {
    setBusy("delete");
    setDeleteError(null);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      setBusy(null);
      setDeleteError("We couldn't delete your account. Please try again.");
      return;
    }
    await createClient().auth.signOut();
    router.replace("/login?deleted=1");
    router.refresh();
  }

  const outOfCredits = (profile?.reading_credits ?? 0) <= 0;
  const identity = profile?.email || (profile?.phone ? `+${profile.phone.replace(/^\+/, "")}` : "");
  const initial = (profile?.full_name || profile?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-sand/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-12">
        <Link href="/upload" aria-label="Hastrekha AI home" className="shrink-0">
          <span className="sm:hidden">
            <Wordmark compact />
          </span>
          <span className="hidden sm:inline">
            <Wordmark />
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={() => (outOfCredits ? openPayment() : undefined)}
            className={`chip whitespace-nowrap ${outOfCredits ? "cursor-pointer hover:bg-blush-2" : "cursor-default"}`}
            aria-label={`Credits: ${creditsLabel(profile)}${outOfCredits ? ". Buy a reading" : ""}`}
          >
            <Sparkles className="h-3.5 w-3.5 text-brass" />
            <span className="max-sm:text-xs">{creditsLabel(profile)}</span>
          </button>

          <button
            onClick={openReadings}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 font-semibold text-maroon hover:bg-blush"
          >
            <ScrollText className="h-5 w-5" />
            <span className="hidden md:inline">My Readings</span>
            <span className="sr-only md:hidden">My Readings</span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-brass bg-maroon font-semibold text-cream"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Profile menu"
            >
              {initial || <User className="h-5 w-5" />}
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="card-float absolute right-0 top-12 w-64 animate-fade-up overflow-hidden p-1.5"
              >
                <div className="px-3 py-2.5">
                  <p className="truncate font-semibold text-ink">{profile?.full_name || "Welcome"}</p>
                  {identity && <p className="truncate text-sm text-umber">{identity}</p>}
                </div>
                <div className="my-1 h-px bg-line" />
                <button
                  role="menuitem"
                  onClick={logout}
                  disabled={busy !== null}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-ink hover:bg-blush"
                >
                  {busy === "logout" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Log out
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-danger hover:bg-danger-bg/60"
                >
                  <Trash2 className="h-4 w-4" /> Delete my account
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {confirmDelete && (
        <Modal onClose={() => busy === null && setConfirmDelete(false)} labelledBy="del-title">
          <div className="p-6">
            <h2 id="del-title" className="font-serif text-2xl text-maroon">
              Delete your account?
            </h2>
            <p className="mt-2 text-umber">
              This permanently removes your profile, all readings, chats and palm photos. Unused credits will be lost.
              Payment records are kept anonymised for tax purposes.
            </p>
            {deleteError && (
              <p role="alert" className="mt-3 rounded-xl bg-danger-bg px-4 py-3 text-sm text-[#93000a]">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setConfirmDelete(false)} disabled={busy !== null} className="btn-secondary">
                Keep my account
              </button>
              <button
                onClick={deleteAccount}
                disabled={busy !== null}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-danger px-5 font-semibold text-white disabled:opacity-60"
              >
                {busy === "delete" && <Loader2 className="h-4 w-4 animate-spin" />} Delete permanently
              </button>
            </div>
          </div>
        </Modal>
      )}
    </header>
  );
}
