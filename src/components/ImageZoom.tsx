"use client";

import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

/** Full-screen photo viewer. Tap/click to zoom 2.5x at that point; drag or move to pan. */
export function ImageZoom({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function pointTo(clientX: number, clientY: number) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setOrigin(`${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`);
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#1c1512]/95" role="dialog" aria-modal="true" aria-label="Palm photo">
      <div className="flex items-center justify-end gap-2 p-3">
        <button
          onClick={() => setZoomed((z) => !z)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-cream/10 text-cream hover:bg-cream/20"
          aria-label={zoomed ? "Zoom out" : "Zoom in"}
        >
          {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
        </button>
        <button
          onClick={onClose}
          autoFocus
          className="flex h-11 w-11 items-center justify-center rounded-full bg-cream/10 text-cream hover:bg-cream/20"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <div
          ref={boxRef}
          className="relative max-h-full overflow-hidden rounded-xl"
          onClick={(e) => {
            pointTo(e.clientX, e.clientY);
            setZoomed((z) => !z);
          }}
          onMouseMove={(e) => zoomed && pointTo(e.clientX, e.clientY)}
          onTouchMove={(e) => zoomed && pointTo(e.touches[0].clientX, e.touches[0].clientY)}
          style={{ cursor: zoomed ? "zoom-out" : "zoom-in", touchAction: zoomed ? "none" : "auto" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="block max-h-[82vh] w-auto max-w-full select-none transition-transform duration-200"
            style={{ transform: zoomed ? "scale(2.5)" : "none", transformOrigin: origin }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
