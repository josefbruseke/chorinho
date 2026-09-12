"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";
import { ContaDoUsuario } from "~~/components/ContaDoUsuario";
import { useOutsideClick } from "~~/hooks/scaffold-eth";

export type ItemDeNav = { href: string; label: string; Icon: React.ComponentType<{ className?: string }> };

/**
 * A navegação dos dois back offices: o painel do lojista e o da plataforma.
 *
 * No computador é uma fileira de abas. No celular era a MESMA fileira, rolando
 * na horizontal — e onze seções numa faixa que mostra três é o mesmo que ter
 * três seções. Ninguém rola uma barra que não parece rolável, e "Coleção" e
 * "Conquistas", que ficavam no fim, simplesmente não existiam para quem abria
 * pelo telefone.
 *
 * Agora o celular ganha um botão que diz onde você está e abre a lista inteira
 * de uma vez, em duas colunas, sem rolagem. O lojista atrás do balcão vê as
 * onze seções num toque.
 */
export const NavDeBackOffice = ({
  itens,
  titulo,
  raiz,
  rotulo,
}: {
  itens: ItemDeNav[];
  /** O que aparece ao lado da marca: "Lojista", "Plataforma". */
  titulo: string;
  /** Para onde o logo leva, e o destino do login. */
  raiz: string;
  /** Nome da navegação para quem usa leitor de tela. */
  rotulo: string;
}) => {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // A seção mais específica que casa com a URL. Sem o `sort`, `/painel` casaria
  // com tudo e o botão diria "Visão geral" em qualquer tela.
  const atual =
    [...itens]
      .sort((a, b) => b.href.length - a.href.length)
      .find(i => pathname === i.href || pathname.startsWith(`${i.href}/`)) ?? itens[0];

  useOutsideClick(caixa, () => setAberto(false));

  // Fecha ao trocar de tela: sem isto o menu fica por cima da página que ele
  // mesmo acabou de abrir.
  useEffect(() => setAberto(false), [pathname]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  return (
    <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between gap-2">
          <Link href={raiz} className="group flex min-w-0 shrink items-center gap-2.5">
            <BrandLogo className="h-8 w-8 shrink-0 transition-transform group-hover:scale-105" />
            <span className="truncate font-black tracking-tight">
              Chorinho <span className="font-medium text-base-content/60">{titulo}</span>
            </span>
          </Link>
          <ContaDoUsuario entrarEm={`/entrar?proximo=${raiz}`} />
        </div>

        {/* ---------------------------------------------------- celular */}
        <div ref={caixa} className="relative pb-2.5 sm:hidden">
          <button
            type="button"
            onClick={() => setAberto(a => !a)}
            aria-expanded={aberto}
            aria-haspopup="menu"
            className="flex min-h-12 w-full items-center gap-2 rounded-2xl bg-base-200 px-4 font-bold"
          >
            <atual.Icon className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-left">{atual.label}</span>
            <ChevronDownIcon className={`h-5 w-5 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
          </button>

          {aberto && (
            <nav
              aria-label={rotulo}
              className="absolute inset-x-0 top-full z-50 mt-1 rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-xl"
            >
              <ul className="m-0 grid list-none grid-cols-2 gap-1 p-0">
                {itens.map(({ href, label, Icon }) => {
                  const ativo = href === atual.href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={ativo ? "page" : undefined}
                        className={`flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm transition-colors ${
                          ativo ? "bg-primary/12 font-bold text-primary" : "font-semibold active:bg-base-200"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="min-w-0 truncate">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>

        {/* ------------------------------------------------- computador */}
        {/* Quebra em linha, não rola. A fileira de antes era `w-max` dentro de
            um `overflow-x-auto`: com onze seções, três ficavam além da borda
            direita mesmo num monitor, escondidas atrás de uma rolagem que a
            barra não anunciava. Envolvendo, tudo aparece e tudo fica alinhado
            com o conteúdo da página. */}
        <nav aria-label={rotulo} className="hidden sm:block">
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 pb-2.5">
            {itens.map(({ href, label, Icon }) => {
              const ativo = href === atual.href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-2 whitespace-nowrap rounded-2xl px-4 text-sm transition-colors ${
                      ativo
                        ? "bg-primary/10 font-bold text-primary"
                        : "font-semibold text-base-content/70 hover:bg-base-200 hover:text-base-content"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
};
