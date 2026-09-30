export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-7 w-7"}
      role="img"
      aria-label="SIGIL"
    >
      <defs>
        <linearGradient id="sigil-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="sigil-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Tactical Rounded Chassis */}
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="9"
        fill="url(#sigil-glow)"
        fillOpacity="0.12"
        stroke="url(#sigil-grad)"
        strokeWidth="1.4"
      />

      {/* Radar Reticle Cross Ticks */}
      <path
        d="M20 5V8 M20 32V35 M5 20H8 M32 20H35"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />

      {/* Geometric Sigil Diamond */}
      <polygon
        points="20,9 31,20 20,31 9,20"
        fill="none"
        stroke="url(#sigil-grad)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Concentric Aperture Ring */}
      <circle
        cx="20"
        cy="20"
        r="6.5"
        stroke="#60a5fa"
        strokeWidth="1.2"
        strokeDasharray="2.5 2"
        fill="none"
      />

      {/* RF Signal Waveform Core Pulse */}
      <path
        d="M12 20h2.5l2-4 3 8 2.5-6 2 3.5 1.5-1.5H28"
        stroke="#38bdf8"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Central Luminous Emitter Node */}
      <circle cx="20" cy="20" r="2.2" fill="#38bdf8" />
      <circle cx="20" cy="20" r="4.2" stroke="#a855f7" strokeWidth="0.8" strokeOpacity="0.7" />
    </svg>
  );
}