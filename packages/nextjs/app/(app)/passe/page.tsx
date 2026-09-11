"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { QRCodeSVG } from "qrcode.react";
import { ArrowPathIcon, ExclamationTriangleIcon, TicketIcon } from "@heroicons/react/24/outline";

type Passe = {
  qr: string;
  codigoCurto: string;
  expiraEm: number;
  validadeSegundos: number;
};

/**
 * O passe que o cliente mostra no balcão — a tela mais usada do aplicativo.
 *
 * O código vale dois minutos e se renova sozinho antes de vencer. É isso que
 * impede alguém de fotografar a tela e usar os carimbos depois. O cliente não
 * precisa entender nada disso: para ele, o código simplesmente está sempre
 * pronto.
 */
const Passe: NextPage = () => {
  const [passe, setPasse] = useState<Passe | null>(null);
  const [restantes, setRestantes] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const emVoo = useRef(false);

  const renovar = useCallback(async () => {
    if (emVoo.current) return;
    emVoo.current = true;
    try {
      const r = await fetch("/api/pass/issue", { method: "POST" });
      const corpo = await r.json();
      if (!r.ok) {
        setErro(
          r.status === 409
            ? "Sua carteira ainda está sendo criada. Tente de novo em instantes."
            : r.status === 401
              ? "Entre na sua conta para abrir o passe."
              : (corpo?.erro ?? "não foi possível gerar o passe"),
        );
        setPasse(null);
        return;
      }
      setErro(null);
      setPasse(corpo);
    } catch {
      setErro("Sem conexão. O passe precisa de internet para ser gerado.");
    } finally {
      emVoo.current = false;
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    renovar();
  }, [renovar]);

  // Renova 15 segundos antes de vencer: nunca pode existir uma janela em que a
  // tela mostra um código morto enquanto o caixa tenta escanear.
  useEffect(() => {
    if (!passe) return;

    const tick = () => {
      const falta = Math.max(0, passe.expiraEm - Math.floor(Date.now() / 1000));
      setRestantes(falta);
      if (falta <= 15) renovar();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [passe, renovar]);

  const proporcao = passe ? restantes / passe.validadeSegundos : 0;

  if (carregando) {
    return (
      <div className="flex justify-center items-center grow py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center grow gap-4 px-6 py-16 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-warning" />
        <h1 className="text-xl font-serif font-black m-0 text-secondary">Não deu para gerar seu passe</h1>
        <p className="m-0 text-sm opacity-75 max-w-xs leading-relaxed">{erro}</p>
        <button type="button" onClick={renovar} className="btn btn-primary rounded-2xl font-bold gap-2">
          <ArrowPathIcon className="w-5 h-5" />
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-5 py-5 grow">
      <header className="text-center">
        <h1 className="text-2xl font-serif font-black m-0 text-secondary">Mostre no balcão</h1>
        <p className="m-0 mt-1 text-sm opacity-75">O caixa escaneia e o carimbo cai na hora</p>
      </header>

      {/* Fundo claro fixo: câmera de celular barato lê muito mais rápido código
          escuro sobre claro, e isso vale também no tema escuro. */}
      <div className="w-full max-w-xs rounded-3xl border-2 border-base-300 bg-qr-surface p-6 shadow-lg flex flex-col items-center gap-4">
        {passe && <QRCodeSVG value={passe.qr} size={240} level="M" bgColor="#ffffff" fgColor="#261c14" />}

        <div className="w-full flex flex-col gap-1.5">
          <div className="h-1.5 w-full rounded-full bg-qr-muted/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                restantes <= 20 ? "bg-warning" : "bg-primary"
              }`}
              style={{ width: `${Math.max(2, proporcao * 100)}%` }}
            />
          </div>
          <p className="m-0 text-center text-xs text-qr-muted">
            {restantes > 0 ? `Vale por mais ${restantes}s — renova sozinho` : "Renovando…"}
          </p>
        </div>
      </div>

      {/* Saída para quando a câmera do balcão não coopera. Dígitos grandes e
          espaçados: alguém vai ler em voz alta, com fila esperando. */}
      <div className="w-full max-w-xs rounded-box border border-base-300 bg-base-100 p-4 text-center">
        <span className="text-xs font-bold uppercase tracking-wider opacity-60">Câmera não funciona?</span>
        <p className="m-0 mt-1.5 font-mono text-3xl font-black tracking-[0.3em] text-secondary">
          {passe?.codigoCurto ?? "······"}
        </p>
        <span className="text-xs opacity-65">Dite este código para o atendente</span>
      </div>

      <Link href="/carteira" className="btn btn-ghost btn-sm rounded-xl gap-1.5">
        <TicketIcon className="w-4 h-4" />
        Ver minhas cartelas
      </Link>
    </div>
  );
};

export default Passe;
