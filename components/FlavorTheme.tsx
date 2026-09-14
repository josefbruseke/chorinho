"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Cada flavor tem um par de temas — claro e escuro — declarado em globals.css.
 * O next-themes continua dono do eixo claro/escuro; aqui só escolhemos qual par.
 *
 * Mantido fora do <html> de propósito: daisyUI cascateia tema a partir de
 * qualquer elemento, então cada route group aninha o seu sem brigar com o
 * atributo que o next-themes escreve na raiz.
 */
export type Flavor = "cliente" | "pos" | "merchant" | "admin";

const PARES: Record<Flavor, { light: string; dark: string }> = {
  cliente: { light: "light", dark: "dark" },
  pos: { light: "pos-light", dark: "pos-dark" },
  merchant: { light: "merchant-light", dark: "merchant-dark" },
  admin: { light: "admin-light", dark: "admin-dark" },
};

export const FlavorTheme = ({
  flavor,
  className = "",
  children,
}: {
  flavor: Flavor;
  className?: string;
  children: React.ReactNode;
}) => {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  // O servidor não sabe o tema do visitante. Se ele chutasse um valor aqui, o
  // cliente discordaria na hidratação — e o React 19 NÃO corrige atributo
  // divergente ("this won't be patched up"), deixando o flavor travado no
  // claro para sempre. Por isso o atributo só existe depois de montar: até lá
  // o bloco herda o data-theme que o next-themes escreve no <html> antes do
  // primeiro paint, que já tem o eixo claro/escuro correto.
  const tema = montado ? PARES[flavor][resolvedTheme === "dark" ? "dark" : "light"] : undefined;

  return (
    <div data-theme={tema} className={className}>
      {children}
    </div>
  );
};
