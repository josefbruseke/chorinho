"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { NextPage } from "next";
import { ArrowLeftIcon, EnvelopeIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";
import { supabaseBrowser } from "~~/services/database/browser";

const MarcaGoogle = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
    />
    <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
    <path
      fill="#EA4335"
      d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
    />
  </svg>
);

const Formulario = () => {
  const router = useRouter();
  const params = useSearchParams();
  const proximo = params.get("proximo") ?? "/mapa";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const comEmail = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    setAviso(null);

    const supabase = supabaseBrowser();
    const resultado =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({
            email,
            password: senha,
            options: { emailRedirectTo: `${location.origin}/auth/callback?proximo=${encodeURIComponent(proximo)}` },
          });

    setCarregando(false);

    if (resultado.error) {
      setErro(resultado.error.message);
      return;
    }

    if (modo === "criar" && !resultado.data.session) {
      setAviso("Enviamos um link de confirmação para o seu e-mail. Abra e volte por aqui.");
      return;
    }

    router.push(proximo);
    router.refresh();
  };

  const comGoogle = async () => {
    setCarregando(true);
    setErro(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?proximo=${encodeURIComponent(proximo)}` },
    });
    if (error) {
      setCarregando(false);
      setErro(
        error.message.includes("provider is not enabled")
          ? "O login com Google ainda não foi ativado no projeto."
          : error.message,
      );
    }
  };

  return (
    <div className="w-full max-w-sm flex flex-col gap-5">
      <button
        type="button"
        onClick={comGoogle}
        disabled={carregando}
        className="btn rounded-2xl font-bold gap-2.5 bg-base-100 border-base-300 hover:bg-base-200"
      >
        <MarcaGoogle className="w-5 h-5" />
        Continuar com Google
      </button>

      <div className="flex items-center gap-3 text-xs opacity-55">
        <span className="h-px bg-base-300 flex-1" />
        ou com e-mail
        <span className="h-px bg-base-300 flex-1" />
      </div>

      <form onSubmit={comEmail} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider opacity-70">E-mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="input input-bordered rounded-2xl bg-base-100"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider opacity-70">Senha</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="pelo menos 8 caracteres"
            className="input input-bordered rounded-2xl bg-base-100"
          />
        </label>

        <button type="submit" disabled={carregando} className="btn btn-primary rounded-2xl font-bold gap-2 mt-1">
          {carregando ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              <EnvelopeIcon className="w-5 h-5" />
              {modo === "entrar" ? "Entrar" : "Criar conta"}
            </>
          )}
        </button>
      </form>

      {erro && (
        <p className="m-0 flex gap-2 items-start text-sm text-error bg-error/10 border border-error/30 rounded-box px-3.5 py-2.5">
          <ExclamationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
          {erro}
        </p>
      )}

      {aviso && (
        <p className="m-0 text-sm bg-success/10 text-success border border-success/30 rounded-box px-3.5 py-2.5">
          {aviso}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setModo(m => (m === "entrar" ? "criar" : "entrar"));
          setErro(null);
          setAviso(null);
        }}
        className="btn btn-ghost btn-sm rounded-xl font-semibold"
      >
        {modo === "entrar" ? "Não tenho conta ainda" : "Já tenho conta"}
      </button>
    </div>
  );
};

const Entrar: NextPage = () => (
  <div className="flex flex-col items-center justify-center grow px-5 py-12 gap-6">
    <Link href="/" className="flex flex-col items-center gap-2 group">
      <BrandLogo className="w-14 h-14 group-hover:scale-105 transition-transform" />
      <span className="font-black text-xl tracking-tight">Chorinho</span>
    </Link>

    <header className="text-center max-w-sm">
      <h1 className="text-2xl font-serif font-black m-0 text-secondary">Entrar no Chorinho</h1>
      <p className="m-0 mt-1.5 text-sm opacity-75 leading-relaxed">
        Sua carteira é criada sozinha ao entrar. Você não precisa saber nada de blockchain — e nunca vai pagar taxa.
      </p>
    </header>

    <Suspense fallback={<span className="loading loading-spinner loading-lg text-primary" />}>
      <Formulario />
    </Suspense>

    <p className="m-0 text-center text-xs opacity-65 max-w-xs leading-relaxed">
      Ao entrar você concorda com os{" "}
      <Link href="/termos" className="text-primary underline underline-offset-2">
        Termos
      </Link>{" "}
      e a{" "}
      <Link href="/privacidade" className="text-primary underline underline-offset-2">
        Política de Privacidade
      </Link>
      .
    </p>

    <Link href="/" className="btn btn-ghost btn-sm rounded-xl gap-1.5">
      <ArrowLeftIcon className="w-4 h-4" />
      Voltar ao site
    </Link>
  </div>
);

export default Entrar;
