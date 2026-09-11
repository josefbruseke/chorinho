/**
 * "Chorinho" brand mark:
 * A modern flat-minimalist geometric mark uniting a local counter cup silhouette
 * with the signature golden reward droplet ("o chorinho") and a loyalty stamp notch.
 * Inline SVG so the brand renders crisply everywhere with zero external assets.
 */
export const BrandLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Chorinho"
  >
    {/* Warm organic ceramic tile */}
    <rect width="48" height="48" rx="14" fill="#261C14" />
    <rect x="1" y="1" width="46" height="46" rx="13" stroke="#C2410C" strokeOpacity="0.4" strokeWidth="1.5" />

    {/* Ceramic cup body */}
    <path
      d="M13 19C13 16.7909 14.7909 15 17 15H29C31.2091 15 33 16.7909 33 19V24C33 28.4183 29.4183 32 25 32H21C16.5817 32 13 28.4183 13 24V19Z"
      fill="#C2410C"
    />

    {/* Soft inner coffee foam / cream line */}
    <ellipse cx="23" cy="18" rx="7" ry="2.5" fill="#E8A87C" fillOpacity="0.6" />

    {/* Cup handle */}
    <path
      d="M33 20H34.5C36.433 20 38 21.567 38 23.5C38 25.433 36.433 27 34.5 27H33"
      stroke="#C2410C"
      strokeWidth="3.2"
      strokeLinecap="round"
    />

    {/* The "Chorinho" - that extra golden honey droplet splashing in */}
    <path
      d="M23 9C23 9 26.5 12.2 26.5 14.2C26.5 16.133 24.933 17.7 23 17.7C21.067 17.7 19.5 16.133 19.5 14.2C19.5 12.2 23 9 23 9Z"
      fill="#F59E0B"
    />

    {/* Wooden saucer base */}
    <path d="M11 35C17 37 29 37 35 35" stroke="#EBE3D5" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.9" />
  </svg>
);
