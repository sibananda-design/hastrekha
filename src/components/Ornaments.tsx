/** Kolam corner motif used at page edges (decorative only). */
export function Kolam({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <circle cx="50" cy="50" r="42" strokeDasharray="3 3" />
      <path d="M50 8 L50 92 M8 50 L92 50" />
      <circle cx="50" cy="50" r="18" />
      <polygon points="50,22 78,50 50,78 22,50" />
      <circle cx="50" cy="22" fill="currentColor" r="3" />
      <circle cx="78" cy="50" fill="currentColor" r="3" />
      <circle cx="50" cy="78" fill="currentColor" r="3" />
      <circle cx="22" cy="50" fill="currentColor" r="3" />
    </svg>
  );
}

/** Mandala used as a faint hero backdrop and in the loading state. */
export function Mandala({ className = "", petals = 16 }: { className?: string; petals?: number }) {
  const items = Array.from({ length: petals });
  return (
    <svg aria-hidden viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor">
      <circle cx="100" cy="100" r="96" strokeWidth="0.8" strokeDasharray="2 4" />
      <circle cx="100" cy="100" r="80" strokeWidth="0.8" />
      <circle cx="100" cy="100" r="40" strokeWidth="0.8" />
      {items.map((_, i) => (
        <g key={i} transform={`rotate(${(360 / petals) * i} 100 100)`}>
          <path d="M100 20 C112 40 112 56 100 62 C88 56 88 40 100 20 Z" strokeWidth="1" />
          <circle cx="100" cy="12" r="2" fill="currentColor" stroke="none" />
          <path d="M100 62 L100 80" strokeWidth="0.6" />
        </g>
      ))}
      {items.map((_, i) => (
        <path
          key={`s${i}`}
          transform={`rotate(${(360 / petals) * i + 360 / petals / 2} 100 100)`}
          d="M100 60 C106 70 106 76 100 80 C94 76 94 70 100 60 Z"
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
}

/** Small oil lamp (diya) with a flickering flame. */
export function Diya({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={className}>
      <g className="origin-[32px_30px] animate-flicker">
        <path d="M32 6 C38 16 40 22 32 30 C24 22 26 16 32 6 Z" fill="#F3BE6A" />
        <path d="M32 14 C35 19 36 23 32 28 C28 23 29 19 32 14 Z" fill="#C8643B" />
      </g>
      <path d="M8 36 C14 50 50 50 56 36 Z" fill="#7A1F2B" />
      <path d="M8 36 L56 36" stroke="#B8893B" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 50 C26 54 38 54 42 50" stroke="#B8893B" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
