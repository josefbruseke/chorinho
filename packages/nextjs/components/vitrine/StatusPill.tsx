import { CheckCircleIcon, MinusCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

export type CouponStatus = "valid" | "used" | "expired";

/**
 * Single source of truth for coupon status colors across the whole app:
 * green = usable, gray = already used, red = expired. Deliberately loud and
 * unambiguous — both customer and waiter must read it at a glance.
 */
const STATUS_STYLES: Record<CouponStatus, { label: string; className: string; Icon: typeof CheckCircleIcon }> = {
  valid: { label: "Válido", className: "badge-success", Icon: CheckCircleIcon },
  used: { label: "Já usado", className: "badge-neutral opacity-70", Icon: MinusCircleIcon },
  expired: { label: "Expirado", className: "badge-error", Icon: XCircleIcon },
};

export const StatusPill = ({ status, large = false }: { status: CouponStatus; large?: boolean }) => {
  const { label, className, Icon } = STATUS_STYLES[status];
  return (
    <span className={`badge ${className} gap-1 font-bold ${large ? "badge-lg text-base py-4 px-4" : "badge-sm"}`}>
      <Icon className={large ? "h-5 w-5" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
};
