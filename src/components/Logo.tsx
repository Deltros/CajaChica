type LogoProps = {
  size?: number;
  className?: string;
};

export function LogoMark({ size = 32, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="caja chica"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="6" y="18" width="52" height="40" rx="4" />
        <line x1="6" y1="30" x2="58" y2="30" />
        <line x1="22" y1="11" x2="42" y2="11" />
        <line x1="22" y1="14.5" x2="42" y2="14.5" />
      </g>
    </svg>
  );
}

export function Logo({
  size = 40,
  className,
  showTagline = true,
}: LogoProps & { showTagline?: boolean }) {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.35,
        color: "var(--ink, #161410)",
        lineHeight: 1,
      }}
    >
      <LogoMark size={size} />
      <div style={{ display: "flex", flexDirection: "column", gap: size * 0.12 }}>
        <span
          style={{
            fontFamily: "var(--font-fraunces), Fraunces, Georgia, serif",
            fontSize: size * 0.72,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          caja chica
        </span>
        {showTagline && (
          <span
            style={{
              fontFamily: "var(--font-geist), system-ui, sans-serif",
              fontSize: size * 0.24,
              fontWeight: 500,
              letterSpacing: "0.22em",
              color: "var(--muted, #7A7063)",
              textTransform: "uppercase",
            }}
          >
            Mantenedor de gastos
          </span>
        )}
      </div>
    </div>
  );
}

export default Logo;
