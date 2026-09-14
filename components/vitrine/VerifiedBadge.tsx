import { CheckBadgeIcon } from "@heroicons/react/24/solid";

/** "Parceiro verificado" seal shown next to establishment names. */
export const VerifiedBadge = ({ compact = false }: { compact?: boolean }) => (
  <span
    className="inline-flex items-center gap-0.5 text-brand-ink shrink-0 align-middle"
    title="Estabelecimento verificado Chorinho"
  >
    <CheckBadgeIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
    {!compact && <span className="text-xs font-semibold">Verificado</span>}
  </span>
);
