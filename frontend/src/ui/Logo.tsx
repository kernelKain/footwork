type LogoVariant = "mark" | "wordmark" | "mono";

export function Logo({
  variant = "mark",
  size = 32,
  decorative = false,
}: {
  variant?: LogoVariant;
  size?: number;
  decorative?: boolean;
}) {
  const mono = variant === "mono";
  const line = mono ? "var(--color-text)" : "var(--color-mint)";
  const beat = mono ? "var(--color-text)" : "var(--color-amber)";
  const width = variant === "mark" ? size : Math.round(size * 6.4);
  return (
    <svg
      className={variant === "mark" ? "ui-logo ui-logo-mark" : "ui-logo"}
      width={width}
      height={size}
      viewBox={variant === "mark" ? "0 0 32 32" : "0 0 220 32"}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Footwork"}
      aria-hidden={decorative || undefined}
      data-logo={decorative ? undefined : variant}
    >
      {decorative ? null : <title>Footwork</title>}
      <path
        d="M10 24 V8 H22 H10 V16 H20"
        fill="none"
        stroke={line}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="24" r="3.6" fill={line} />
      <rect x="19.5" y="2.5" width="8" height="8" rx="1.5" fill={beat} />
      {variant === "mark" ? null : (
        <text
          x="40"
          y="23"
          fill="var(--color-text)"
          fontFamily="system-ui, Segoe UI, sans-serif"
          fontSize="20"
          fontWeight="700"
        >
          Footwork
        </text>
      )}
    </svg>
  );
}
