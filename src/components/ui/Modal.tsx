"use client";

import { useEffect, useRef } from "react";

/** Accessible centred modal (bottom sheet on phones). Closes on Escape and backdrop click. */
export function Modal({
  children,
  onClose,
  labelledBy,
  className = "",
}: {
  children: React.ReactNode;
  onClose: () => void;
  labelledBy?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#2b2320]/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative w-full max-w-md animate-sheet-up rounded-t-2xl bg-cream shadow-2xl outline-none sm:rounded-2xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
