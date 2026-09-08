/**
 * "Floripa em Dobro" brand mark: a coral circle with a bold "2x".
 * Inline SVG so the brand renders identically everywhere with zero assets.
 */
export const BrandLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Floripa em Dobro">
    <circle cx="24" cy="24" r="22" fill="#e8582d" />
    <circle cx="24" cy="24" r="22" fill="none" stroke="#ffc24b" strokeWidth="3" />
    <text
      x="24"
      y="25"
      textAnchor="middle"
      dominantBaseline="central"
      fill="#fff6ef"
      fontSize="20"
      fontWeight="900"
      fontFamily="inherit"
    >
      2x
    </text>
  </svg>
);
