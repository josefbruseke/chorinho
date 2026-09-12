"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { NextPage } from "next";
import { ArrowRightStartOnRectangleIcon, ShieldCheckIcon, SparklesIcon, WalletIcon } from "@heroicons/react/24/outline";
import { supabaseBrowser } from "~~/services/database/browser";
import type { Tables } from "~~/services/database/types";

const Perfil: NextPage = () => {
  const router = useRouter();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Tables<"profiles"> | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let vivo = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!vivo) return;
      setUsuario(data.user);

      if (data.user) {
        const { data: linha } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
        if (vivo) setPerfil(linha);
      }
      if (vivo) setCarregando(false);
    });

    return () => {
      vivo = false;
    };
  }, []);

  const sair = async () => {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (carregando) {
    return (
      <div className="flex justify-center items-center grow py-20">
        <span className="loading loading-spinner loading-lg text-brand-ink" />
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="flex flex-col items-center justify-center grow px-6 py-20 text-center gap-4">
        <h1 className="text-2xl font-serif font-black m-0 text-secondary">Entre para ver seu perfil</h1>
        <Link href="/entrar?proximo=/perfil" className="btn btn-primary h-14 rounded-2xl font-black px-8">
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 flex flex-col gap-5">
      {/* Quem sou eu é a informação nº 1 desta tela: avatar e nome ganham mais peso que o resto. */}
      <header className="flex items-center gap-4">
        <span className="w-16 h-16 rounded-2xl bg-primary/10 text-brand-ink flex items-center justify-center text-2xl font-serif font-black shrink-0">
          {(perfil?.display_name ?? usuario.email ?? "?").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-serif font-black m-0 text-secondary truncate">
            {perfil?.display_name ?? "Sem nome"}
          </h1>
          <p className="m-0 text-sm opacity-70 truncate">{usuario.email}</p>
        </div>
      </header>

      <section className="rounded-box border border-base-300 bg-base-100 divide-y divide-base-300">
        <div className="flex gap-3 p-4 min-h-12">
          <WalletIcon className="w-5 h-5 text-brand-ink shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <strong className="block text-sm">Sua carteira</strong>
            {perfil?.wallet_address ? (
              <code className="text-xs opacity-75 break-all">{perfil.wallet_address}</code>
            ) : (
              <span className="text-xs opacity-70 leading-relaxed block mt-0.5">
                Ainda não criada. A carteira embutida é gerada no primeiro acesso assim que a integração com o provedor
                estiver ligada — você não precisa fazer nada.
              </span>
            )}
          </div>
        </div>

        <Link
          href="/carteira-e-seguranca"
          className="flex items-center gap-3 p-4 min-h-12 hover:bg-base-200 active:bg-base-200 transition-colors"
        >
          <ShieldCheckIcon className="w-5 h-5 text-brand-ink shrink-0" />
          <div>
            <strong className="block text-sm">Carteira e segurança</strong>
            <span className="text-xs opacity-70">O que fica público na blockchain e como se proteger</span>
          </div>
        </Link>

        <Link
          href="/ajuda"
          className="flex items-center gap-3 p-4 min-h-12 hover:bg-base-200 active:bg-base-200 transition-colors"
        >
          <SparklesIcon className="w-5 h-5 text-brand-ink shrink-0" />
          <div>
            <strong className="block text-sm">Ajuda</strong>
            <span className="text-xs opacity-70">Perguntas frequentes</span>
          </div>
        </Link>
      </section>

      <button type="button" onClick={sair} className="btn btn-ghost h-12 rounded-2xl font-bold gap-2 text-error">
        <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
        Sair da conta
      </button>
    </div>
  );
};

export default Perfil;
