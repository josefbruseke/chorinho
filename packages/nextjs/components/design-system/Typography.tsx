import React from "react";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel;
  variant?: "serif" | "sans";
  tone?: "espresso" | "terracotta" | "honey";
  children: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({
  as = "h2",
  variant = "sans",
  tone = "espresso",
  className = "",
  children,
  ...props
}) => {
  const Component = as;

  const sizeStyles = {
    h1: "text-3xl md:text-5xl font-black tracking-tight leading-tight",
    h2: "text-2xl md:text-3xl font-extrabold tracking-tight",
    h3: "text-xl md:text-2xl font-bold",
    h4: "text-lg md:text-xl font-bold",
    h5: "text-base font-semibold",
  }[as];

  const toneStyles = {
    espresso: "text-secondary",
    terracotta: "text-primary",
    honey: "text-accent",
  }[tone];

  const fontStyle = variant === "serif" ? "font-serif tracking-normal" : "font-sans";

  return (
    <Component className={`${sizeStyles} ${toneStyles} ${fontStyle} ${className}`} {...props}>
      {children}
    </Component>
  );
};

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "xs" | "sm" | "base" | "lg";
  tone?: "espresso" | "muted" | "terracotta" | "honey" | "sage";
  weight?: "normal" | "medium" | "semibold" | "bold";
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  size = "base",
  tone = "espresso",
  weight = "normal",
  className = "",
  children,
  ...props
}) => {
  const sizeStyles = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
  }[size];

  const toneStyles = {
    espresso: "text-secondary",
    muted: "text-kraft-ink",
    terracotta: "text-primary",
    honey: "text-accent",
    sage: "text-success",
  }[tone];

  const weightStyles = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  }[weight];

  return (
    <p className={`${sizeStyles} ${toneStyles} ${weightStyles} ${className}`} {...props}>
      {children}
    </p>
  );
};
