"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { QRCodeSVG } from "qrcode.react";
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, TicketIcon } from "@heroicons/react/24/outline";
import { supabaseBrowser, supabaseConfigurado } from "~~/services/database/browser";
import { decodificarPasse } from "~~/utils/pass";

type Passe = {
  qr: string;
  codigoCurto: string;
  expiraEm: number;
  validadeSegundos: number;
};

/**
 * O que a tela sabe sobre a venda que está acontecendo agora.
 *
 * `lido` é a linha nascendo em `sales` — o caixa acabou de ler o QR. `caiu` é
 * ela virando `confirmada`, com a rede tendo aceitado.
 */
type Andamento = { estado: "lido" } | { estado: "caiu"; carimbos: number };

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
  const [andamento, setAndamento] = useState<Andamento>();
  const emVoo = useRef(false);

  const renovar = useCallback(async () => {
    if (emVoo.current) return;
    emVoo.current = true;
    try {
      const r = await fetch("/api/pass/issue", { method: "POST" });
      const corpo = await r.json();
      if (!r.ok) {
        setErro(
          r.status === 401
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
      if (falta <= 15 && !andamento) renovar();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [passe, renovar, andamento]);

  /**
   * Escuta a venda acontecer, com o celular ainda na mão do cliente.
   *
   * Antes, quem mostrava o passe não via nada: o contador seguia andando e a
   * única forma de saber se o carimbo entrou era trocar de tela. No balcão isso
   * vira a pergunta que ninguém quer fazer — "caiu?" — com o caixa já atendendo
   * o próximo.
   *
   * Eram dois eventos porque eram dois momentos separados por um bloco: o
   * `INSERT` avisava que o caixa tinha lido, e o `UPDATE` para `confirmada`
   * era a rede aceitando, uns doze segundos depois. Sem blockchain a venda já
   * nasce `confirmada`, e o `INSERT` carrega o desfecho — então ele decide
   * sozinho. O `UPDATE` continua assinado porque a fila offline do balcão
   * ainda grava `na_fila` primeiro e resolve depois.
   *
   * O filtro é o id do cliente, que a tela já tem vindo do próprio passe. Quem
   * garante o isolamento é a política de RLS — ela deixa cada um ver só as
   * vendas em que é o cliente, e o Realtime a respeita.
   */
  useEffect(() => {
    const cliente = passe ? decodificarPasse(passe.qr)?.a : undefined;
    if (!cliente || !supabaseConfigurado()) return;

    const desfecho = (linha: unknown) => {
      const venda = linha as { status?: string; stamps_issued?: number | null };
      if (venda.status === "confirmada") setAndamento({ estado: "caiu", carimbos: venda.stamps_issued ?? 1 });
      // `falhou` volta a tela para o QR: o cliente ainda está ali e o caixa vai
      // tentar de novo. Ficar em "lido" o deixaria esperando por algo que não vem.
      else if (venda.status === "falhou") setAndamento(undefined);
      else setAndamento(a => a ?? { estado: "lido" });
    };

    const canal = supabaseBrowser()
      .channel(`passe:${cliente}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sales", filter: `customer_profile_id=eq.${cliente}` },
        ({ new: linha }) => desfecho(linha),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sales", filter: `customer_profile_id=eq.${cliente}` },
        ({ new: linha }) => desfecho(linha),
      )
      .subscribe();

    return () => {
      void supabaseBrowser().removeChannel(canal);
    };
  }, [passe]);

  const proporcao = passe ? restantes / passe.validadeSegundos : 0;

  if (carregando) {
    return (
      <div className="flex justify-center items-center grow py-20">
        <span className="loading loading-spinner loading-lg text-brand-ink" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center grow gap-4 px-6 py-16 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-honey-ink" />
        <h1 className="text-xl font-serif font-black m-0 text-secondary">Não deu para gerar seu passe</h1>
        <p className="m-0 text-sm opacity-75 max-w-xs leading-relaxed">{erro}</p>
        <button type="button" onClick={renovar} className="btn btn-primary h-14 rounded-2xl font-black gap-2 px-8">
          <ArrowPathIcon className="w-5 h-5" />
          Tentar de novo
        </button>
      </div>
    );
  }

  /**
   * A venda em curso toma a tela inteira.
   *
   * Some o QR de propósito: mostrá-lo ao lado de "lemos seu passe" convidaria o
   * caixa a escanear de novo, e o passe já foi queimado — a segunda leitura
   * falharia com "passe já usado", que parece defeito e não é.
   */
  if (andamento) {
    const caiu = andamento.estado === "caiu";
    return (
      <div className="flex grow flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        {caiu ? (
          <CheckCircleIcon className="h-20 w-20 text-success" />
        ) : (
          <span className="loading loading-spinner w-16 text-brand-ink" />
        )}

        <div>
          <h1 className="m-0 font-serif text-3xl font-black text-secondary">
            {caiu
              ? `+${andamento.carimbos} ${andamento.carimbos === 1 ? "carimbo" : "carimbos"}`
              : "Passe lido no balcão"}
          </h1>
          <p className="m-0 mt-2 max-w-xs text-sm leading-relaxed opacity-75">
            {caiu ? "Já está na sua cartela." : "Registrando na rede. Pode guardar o celular — isso termina sozinho."}
          </p>
        </div>

        {caiu && (
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Link href="/carteira" className="btn btn-primary h-14 rounded-2xl font-black">
              Ver minhas cartelas
            </Link>
            <button
              type="button"
              onClick={() => {
                setAndamento(undefined);
                void renovar();
              }}
              className="btn btn-ghost h-12 rounded-2xl font-bold"
            >
              Mostrar o passe de novo
            </button>
          </div>
        )}
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
        {passe && <QRCodeSVG value={passe.qr} size={240} level="M" bgColor="#ffffff" fgColor="#1c2010" />}

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
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Câmera não funciona?</span>
        <p className="m-0 mt-1.5 font-mono text-4xl font-black tracking-[0.3em] text-secondary">
          {passe?.codigoCurto ?? "······"}
        </p>
        <span className="text-xs opacity-70">Dite este código para o atendente</span>
      </div>

      <Link href="/carteira" className="btn btn-ghost h-12 rounded-2xl gap-1.5">
        <TicketIcon className="w-5 h-5" />
        Ver minhas cartelas
      </Link>
    </div>
  );
};

export default Passe;
