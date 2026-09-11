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
  variant,
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

  // h1-h3 sao titulo de destaque (nome de estabelecimento, headline de tela) e
  // usam a serif editorial Fraunces por padrao, conforme DESIGN_SYSTEM.md;
  // h4-h5 sao rotulo de interface e ficam na sans -- `variant` ainda permite
  // forcar o outro estilo quando o chamador precisar.
  const resolvedVariant = variant ?? (as === "h4" || as === "h5" ? "sans" : "serif");
  const fontStyle = resolvedVariant === "serif" ? "font-serif tracking-normal" : "font-sans";

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
