/**
 * Marca "Chorinho":
 * Um pé de cana-de-açúcar em traço geométrico flat -- colmo segmentado, duas
 * folhas no topo -- com a gota dourada de caldo ("o chorinho") escorrendo ao
 * lado. SVG inline para a marca renderizar nítida em qualquer lugar sem asset
 * externo. As cores repetem a paleta de globals.css (verde da cana, amarelo do
 * caldo, tinta oliva, bagaço).
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
    {/* Ladrilho oliva escuro */}
    <rect width="48" height="48" rx="14" fill="#1C2010" />
    <rect x="1" y="1" width="46" height="46" rx="13" stroke="#76C112" strokeOpacity="0.4" strokeWidth="1.5" />

    {/* Folhas da cana */}
    <path d="M22 16C17 11 12.5 9 8.5 10.5C11.5 15 16.5 17 22 17.5V16Z" fill="#8FD42E" />
    <path d="M24 15C27.5 8.5 32 6 37.5 6.5C34 12 29 15.5 24 16.5V15Z" fill="#A6DD5A" />

    {/* Colmo */}
    <rect x="20" y="15" width="6" height="25" rx="3" fill="#76C112" />

    {/* Nós do colmo */}
    <path d="M20 23H26M20 31H26" stroke="#1C2010" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.85" />

    {/* O "Chorinho": a gota dourada de caldo escorrendo */}
    <path
      d="M33 22C33 22 36.5 25.2 36.5 27.2C36.5 29.133 34.933 30.7 33 30.7C31.067 30.7 29.5 29.133 29.5 27.2C29.5 25.2 33 22 33 22Z"
      fill="#D8B301"
    />

    {/* Chão de bagaço */}
    <path d="M11 40C17 42 29 42 35 40" stroke="#CEC69C" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.9" />
  </svg>
);
