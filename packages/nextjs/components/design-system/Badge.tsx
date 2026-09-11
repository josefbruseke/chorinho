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
    chorinho: "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]",
    verified: "bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]",
    terracotta: "bg-[#ffedd5] text-[#c2410c] border border-[#fed7aa]",
    neutral: "bg-[#f4ede2] text-[#695343] border border-[#ebe3d5]",
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
