/** Palm-inside-a-lotus emblem, redrawn from the Stitch "sacred lotus palm" logo. */
export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Hastrekha AI emblem">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* lotus petals (brass) */}
        <g stroke="#B8893B" strokeWidth="2.4">
          <path d="M50 94 C42 86 40 78 50 70 C60 78 58 86 50 94 Z" />
          <path d="M30 60 C28 44 34 34 40 30 M70 60 C72 44 66 34 60 30" />
          <path d="M22 84 C30 88 40 86 46 80 M78 84 C70 88 60 86 54 80" />
          <path d="M14 76 C22 72 30 74 36 80 M86 76 C78 72 70 74 64 80" />
        </g>
        {/* outer petals (maroon) */}
        <g stroke="#7A1F2B" strokeWidth="2.6">
          <path d="M8 54 C18 52 26 60 30 72 C36 76 44 78 50 78 C56 78 64 76 70 72 C74 60 82 52 92 54 C86 58 82 66 76 74 C68 80 60 82 50 82 C40 82 32 80 24 74 C18 66 14 58 8 54 Z" />
          {/* hand */}
          <path d="M36 64 L34 30 C34 26 40 26 40 30 L41 44 L41 16 C41 12 47 12 47 16 L47 42 L48 12 C48 8 54 8 54 12 L54 42 L55 18 C55 14 61 14 61 18 L61 48 L63 36 C64 32 69 33 68 37 L64 60 C62 70 56 76 50 76 C42 76 37 71 36 64 Z" />
        </g>
        {/* star */}
        <path
          d="M50 50 L52 57 L59 58 L52 60 L50 67 L48 60 L41 58 L48 57 Z"
          fill="#D4AF37"
          stroke="#B8893B"
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={compact ? "h-9 w-9" : "h-11 w-11"} />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-[1.3rem] font-semibold text-maroon">Hastrekha AI</span>
        {!compact && (
          <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-terracotta-dark">
            Your palm, your path
          </span>
        )}
      </span>
    </span>
  );
}
