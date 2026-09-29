"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Hand, Loader2, Plus, ScrollText, Trash2, X } from "lucide-react";

type Item = {
  id: string;
  name: string;
  hand: "left" | "right";
  created_at: string;
  questions_total: number;
  questions_remaining: number;
  is_free: boolean;
  thumb: string | null;
};

const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function ReadingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/readings", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setItems((await res.json()).readings);
    } catch {
      setError("We couldn't load your readings. Please check your connection.");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, load, onClose]);

  // Close when navigating.
  useEffect(() => {
    onClose();
    setConfirmId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function remove(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/readings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev?.filter((r) => r.id !== id) ?? null);
      setConfirmId(null);
      if (pathname === `/reading/${id}`) router.push("/upload");
    } catch {
      setError("We couldn't delete that reading. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[#2b2320]/40" onClick={onClose} aria-hidden />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="readings-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-sm animate-slide-in flex-col bg-cream shadow-2xl outline-none"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="readings-title" className="flex items-center gap-2 font-serif text-xl text-maroon">
            <ScrollText className="h-5 w-5 text-brass" /> My Readings
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-umber hover:bg-blush" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {error && (
            <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-[#93000a]">
              {error}
            </p>
          )}
          {!items && !error && (
            <div className="flex justify-center py-12 text-umber">
              <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
            </div>
          )}
          {items?.length === 0 && (
            <div className="px-4 py-12 text-center text-umber">
              <Hand className="mx-auto mb-3 h-10 w-10 text-brass" />
              <p>No readings yet. Your first reading will appear here.</p>
            </div>
          )}
          {items?.map((r) => {
            const used = r.questions_total - r.questions_remaining;
            const active = pathname === `/reading/${r.id}`;
            return (
              <div
                key={r.id}
                className={`rounded-xl border p-3 transition ${
                  active ? "border-brass bg-blush" : "border-line bg-cream hover:bg-blush/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Link href={`/reading/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-t-[28px] rounded-b-lg border border-line bg-blush-2">
                      {r.thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.thumb} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{r.name}</span>
                      <span className="block text-sm text-umber">
                        {fmt.format(new Date(r.created_at))} · {r.hand === "right" ? "Right" : "Left"} hand
                      </span>
                      <span className="block text-xs text-umber">
                        {used} of {r.questions_total} question{r.questions_total > 1 ? "s" : ""} used
                        {r.is_free ? " · Free" : ""}
                      </span>
                    </span>
                  </Link>
                  <button
                    onClick={() => setConfirmId(r.id)}
                    className="rounded-lg p-2 text-umber hover:bg-danger-bg hover:text-danger"
                    aria-label={`Delete reading for ${r.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {confirmId === r.id && (
                  <div className="mt-3 rounded-lg bg-danger-bg/60 p-3 text-sm">
                    <p className="text-ink">
                      Delete this reading? The palm photo, reading and chat will be removed permanently.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => remove(r.id)}
                        disabled={deleting}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-danger px-3 font-semibold text-white disabled:opacity-60"
                      >
                        {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="min-h-9 rounded-lg px-3 font-semibold text-umber hover:bg-cream"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="border-t border-line p-4">
          <Link href="/upload" className="btn-primary w-full">
            <Plus className="h-5 w-5" /> New reading
          </Link>
        </footer>
      </aside>
    </div>
  );
}
