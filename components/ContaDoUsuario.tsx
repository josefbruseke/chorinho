"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightStartOnRectangleIcon, ChevronDownIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { supabaseBrowser, supabaseConfigurado } from "~~/services/database/browser";

/**
 * Quem está logado, no canto do cabeçalho.
 *
 * No lugar do "Connect Wallet" que o boilerplate trazia: a conta é e-mail ou
 * Google, e acabou. Não há o que conectar.
 */
export const ContaDoUsuario = ({ entrarEm = "/entrar" }: { entrarEm?: string }) => {
  const router = useRouter();
  const [email, setEmail] = useState<string>();
  const [nome, setNome] = useState<string>();
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabaseConfigurado()) {
      setCarregando(false);
      return;
    }
    let vivo = true;
    const supabase = supabaseBrowser();

    supabase.auth.getUser().then(async ({ data }) => {
      if (!vivo) return;
      setEmail(data.user?.email ?? undefined);
      if (data.user) {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.user.id)
          .maybeSingle();
        if (vivo) setNome(perfil?.display_name ?? undefined);
      }
      if (vivo) setCarregando(false);
    });

    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const sair = async () => {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (carregando) return <span className="loading loading-spinner loading-sm opacity-50" />;

  if (!email) {
    return (
      <Link href={entrarEm} className="btn btn-primary min-h-12 rounded-2xl px-5 font-black">
        Entrar
      </Link>
    );
  }

  const rotulo = nome ?? email.split("@")[0];

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="btn btn-ghost min-h-12 gap-1.5 rounded-2xl px-3 font-bold"
      >
        <UserCircleIcon className="h-6 w-6 shrink-0" />
        <span className="hidden max-w-32 truncate sm:inline">{rotulo}</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-60" />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-60 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-lg"
        >
          <p className="m-0 truncate px-3 py-2 text-xs opacity-70">{email}</p>
          <Link
            href="/perfil"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-semibold no-underline hover:bg-base-200"
          >
            <UserCircleIcon className="h-5 w-5" />
            Minha conta
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={sair}
            className="flex min-h-12 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-error hover:bg-error/10"
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
};
