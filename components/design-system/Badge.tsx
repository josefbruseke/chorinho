import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "chorinho" | "verified" | "terracotta" | "neutral" | "warning";
  size?: "sm" | "md";
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "md",
  className = "",
  children,
  ...props
}) => {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs font-semibold tracking-wide",
    md: "px-3 py-1 text-xs md:text-sm font-bold tracking-tight",
  }[size];

  const variantStyles = {
    chorinho: "bg-honey-soft text-honey-ink border border-honey-edge",
    verified: "bg-success/12 text-success border border-success/30",
    terracotta: "bg-primary/10 text-brand-ink border border-primary/25",
    neutral: "bg-craft text-base-content/70 border border-base-300",
    warning: "bg-red-50 text-red-700 border border-red-200",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
