import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  startIcon,
  endIcon,
  className = "",
  disabled,
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[#c2410c] focus:ring-offset-2";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5",
  }[size];

  const variantStyles = {
    // Terracota acolhedor
    primary: "bg-[#c2410c] hover:bg-[#9a3412] text-white shadow-sm hover:shadow-md",
    // Espresso torrado escuro
    secondary: "bg-[#261c14] hover:bg-[#38291e] text-[#fbf8f2] shadow-sm",
    // Âmbar / Mel do agrado
    accent: "bg-[#d97706] hover:bg-[#b45309] text-white shadow-sm",
    // Borda artesanal suave
    outline: "border-2 border-[#ebe3d5] hover:border-[#c2410c] bg-transparent text-[#261c14] hover:bg-[#f4ede2]/40",
    // Ghost sem fundo
    ghost: "bg-transparent hover:bg-[#ebe3d5]/40 text-[#261c14]",
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        startIcon
      )}
      <span>{children}</span>
      {!isLoading && endIcon}
    </button>
  );
};
