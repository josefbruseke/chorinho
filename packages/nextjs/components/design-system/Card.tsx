import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "warm" | "craft" | "highlight";
  interactive?: boolean;
  notched?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = "default",
  interactive = false,
  notched = false,
  className = "",
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-white border-[#ebe3d5]",
    warm: "bg-[#fdfbf7] border-[#ebe3d5]",
    craft: "bg-[#f4ede2] border-[#e2d5c3]",
    highlight: "bg-[#fff7ed] border-[#fed7aa]",
  }[variant];

  const interactiveStyles = interactive
    ? "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
    : "shadow-sm";

  return (
    <div
      className={`relative rounded-2xl border ${variantStyles} ${interactiveStyles} overflow-hidden ${className}`}
      {...props}
    >
      {notched && (
        <>
          <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fbf8f2] border-r border-[#ebe3d5] z-10" />
          <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-[#fbf8f2] border-l border-[#ebe3d5] z-10" />
        </>
      )}
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", children, ...props }) => (
  <div className={`p-4 md:p-6 border-b border-[#ebe3d5]/60 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", children, ...props }) => (
  <div className={`p-4 md:p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", children, ...props }) => (
  <div className={`p-4 md:p-6 border-t border-[#ebe3d5]/60 bg-black/[0.02] ${className}`} {...props}>
    {children}
  </div>
);
