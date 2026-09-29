"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Profile } from "@/lib/profile";
import { PaymentModal } from "@/components/PaymentModal";
import { ReadingsPanel } from "@/components/ReadingsPanel";

type PaymentOptions = { onSuccess?: () => void; reason?: string };

type AppCtx = {
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
  openPayment: (opts?: PaymentOptions) => void;
  openReadings: () => void;
};

const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export function creditsLabel(p: Profile | null) {
  if (!p) return "";
  if (p.reading_credits > 0 && !p.free_credit_used) return "1 free reading";
  if (p.reading_credits > 0) return `${p.reading_credits} reading${p.reading_credits > 1 ? "s" : ""} available`;
  return "0 readings – ₹99";
}

export function AppProvider({ initialProfile, children }: { initialProfile: Profile | null; children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [payment, setPayment] = useState<PaymentOptions | null>(null);
  const [readingsOpen, setReadingsOpen] = useState(false);
  const closeReadings = useCallback(() => setReadingsOpen(false), []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) return null;
      const { profile } = (await res.json()) as { profile: Profile | null };
      setProfile(profile);
      return profile;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<AppCtx>(
    () => ({
      profile,
      refreshProfile,
      openPayment: (opts) => setPayment(opts ?? {}),
      openReadings: () => setReadingsOpen(true),
    }),
    [profile, refreshProfile],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {payment && (
        <PaymentModal
          reason={payment.reason}
          onClose={() => setPayment(null)}
          onPaid={async () => {
            await refreshProfile();
            const cb = payment.onSuccess;
            setPayment(null);
            cb?.();
          }}
        />
      )}
      <ReadingsPanel open={readingsOpen} onClose={closeReadings} />
    </Ctx.Provider>
  );
}
