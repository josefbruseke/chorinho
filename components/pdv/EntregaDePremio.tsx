"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HashtagIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import { QrScanner } from "~~/components/vitrine/QrScanner";
import { useWakeLock } from "~~/hooks/pdv/useWakeLock";
import { centavosParaVisor, digitosParaCentavos, formatarCentavos } from "~~/utils/dinheiro";
import { novaRefDeVenda } from "~~/utils/fila";
import { codigoCurtoValido } from "~~/utils/pass";

type Recompensa = { id: number; titulo: string; selos: number; pontos: number; esgotada: boolean; pronta: boolean };

type Atendimento = {
  cliente: { id: string; nome: string | null };
  atendimento: string;
  cartela: { saldo: number; pontos: number; sequencia: number };
  recompensas: Recompensa[];
};

type PecaNoBalcao = {
  id: string;
  titulo: string;
  programa?: string;
  nivel: number;
  quantidade: number;
  descontoCentavos: number | null;
};

type Etapa =
  | { nome: "lendo"; camera?: boolean; usarCodigo?: boolean; erroCamera?: boolean }
  | { nome: "escolhendo"; dados: Atendimento }
  | { nome: "entregando" }
  | { nome: "entregue"; titulo: string; selos: number }
  | { nome: "peca-usada"; titulo: string; descontoCentavos: number }
  | { nome: "erro"; mensagem: string };

/**
 * A entrega do prêmio no balcão.
 *
 * O atendente lê o passe, vê o que aquele cliente pode levar, e entrega. O
 * carimbo é queimado na mesma transação em que a entrega fica registrada — não
 * existe estado em que o cliente pagou e não recebeu.
 *
 * Duas portas depois da leitura: **entregar prêmio**, que gasta carimbos, e
 * **usar peça**, que queima um colecionável em troca de desconto. A segunda só
 * lista o que vale NESTA loja: uma peça de programa conjunto some sozinha da
 * lista onde a loja não entrou na pool, e o atendente nunca precisa explicar
 * nada ao cliente.
 */
export const EntregaDePremio = () => {
  const [etapa, setEtapa] = useState<Etapa>({ nome: "lendo" });
  const [codigo, setCodigo] = useState("");
  const [loja, setLoja] = useState<string>();
  const [cameraLiberada, setCameraLiberada] = useState(false);
  const [aba, setAba] = useState<"premio" | "peca">("premio");
  const [contaDigitos, setContaDigitos] = useState("");
  const [pecas, setPecas] = useState<PecaNoBalcao[]>();
  useWakeLock();

  const contaCentavos = digitosParaCentavos(contaDigitos);

  useEffect(() => {
    fetch("/api/pos/balcao")
      .then(r => (r.ok ? r.json() : null))
      .then(c => c && setLoja(c.nome))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then(e => setCameraLiberada(e.state === "granted"))
      .catch(() => undefined);
  }, []);

  const identificar = useCallback(async (leitura: { qr?: string; codigo?: string }) => {
    try {
      const r = await fetch("/api/pos/cliente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(leitura),
      });
      const corpo = await r.json();
      if (!r.ok) {
        setEtapa({ nome: "erro", mensagem: corpo?.erro ?? "não foi possível ler o passe" });
        return;
      }
      setEtapa({ nome: "escolhendo", dados: corpo });
    } catch {
      setEtapa({ nome: "erro", mensagem: "Sem internet. A entrega de prêmio precisa de conexão." });
    }
  }, []);

  const entregar = async (dados: Atendimento, recompensa: Recompensa) => {
    setEtapa({ nome: "entregando" });
    try {
      const r = await fetch("/api/pos/resgatar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          atendimento: dados.atendimento,
          recompensa: recompensa.id,
          claimRef: novaRefDeVenda(),
        }),
      });
      const corpo = await r.json();
      if (!r.ok) {
        setEtapa({ nome: "erro", mensagem: corpo?.erro ?? "não foi possível entregar" });
        return;
      }
      setEtapa({ nome: "entregue", titulo: corpo.titulo ?? recompensa.titulo, selos: corpo.selos ?? recompensa.selos });
    } catch {
      setEtapa({ nome: "erro", mensagem: "Sem internet. Tente de novo em instantes." });
    }
  };

  /**
   * As peças válidas deste cliente nesta loja.
   *
   * Refaz a busca a cada mudança do valor da conta porque o desconto vem
   * calculado pelo contrato — o atendente lê o número pronto em vez de fazer
   * conta de cabeça com o cliente esperando.
   */
  const buscarPecas = useCallback(async (atendimento: string, conta: number) => {
    setPecas(undefined);
    try {
      const r = await fetch(`/api/pos/peca?atendimento=${encodeURIComponent(atendimento)}&conta=${conta}`);
      const corpo = await r.json().catch(() => ({}));
      setPecas(r.ok ? (corpo.pecas ?? []) : []);
    } catch {
      setPecas([]);
    }
  }, []);

  useEffect(() => {
    if (etapa.nome !== "escolhendo" || aba !== "peca") return;
    void buscarPecas(etapa.dados.atendimento, contaCentavos);
  }, [etapa, aba, contaCentavos, buscarPecas]);

  const usarPeca = async (dados: Atendimento, peca: PecaNoBalcao) => {
    setEtapa({ nome: "entregando" });
    try {
      const r = await fetch("/api/pos/peca", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          atendimento: dados.atendimento,
          peca: peca.id,
          conta: contaCentavos,
          redemptionRef: novaRefDeVenda(),
        }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) {
        setEtapa({ nome: "erro", mensagem: corpo?.erro ?? "não foi possível usar a peça" });
        return;
      }
      setEtapa({
        nome: "peca-usada",
        titulo: corpo.titulo ?? peca.titulo,
        descontoCentavos: corpo.descontoCentavos ?? 0,
      });
    } catch {
      setEtapa({ nome: "erro", mensagem: "Sem internet. Tente de novo em instantes." });
    }
  };

  const recomecar = () => {
    setCodigo("");
    setContaDigitos("");
    setPecas(undefined);
    setAba("premio");
    setEtapa({ nome: "lendo", camera: cameraLiberada });
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-base-300 bg-base-100 px-3 py-2.5">
        <Link href="/pdv" className="btn btn-ghost btn-sm h-12 gap-1 rounded-xl font-bold">
          <ArrowLeftIcon className="h-4 w-4" />
          Balcão
        </Link>
        <div className="min-w-0 flex-1 text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wider opacity-60">Prêmio ou peça</span>
          <span className="block truncate text-sm font-bold text-secondary">{loja ?? "…"}</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center gap-5 px-4 py-5">
        {etapa.nome === "lendo" && (
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            {etapa.camera && !etapa.usarCodigo && !etapa.erroCamera ? (
              <>
                <QrScanner
                  onScan={texto => void identificar({ qr: texto })}
                  onError={() => setEtapa({ nome: "lendo", erroCamera: true })}
                />
                <p className="m-0 text-center text-sm opacity-75">Leia o passe do cliente</p>
                <button
                  type="button"
                  onClick={() => setEtapa({ nome: "lendo", usarCodigo: true })}
                  className="btn btn-ghost h-12 gap-1.5 rounded-xl font-bold"
                >
                  <HashtagIcon className="h-5 w-5" />
                  Digitar o código
                </button>
              </>
            ) : (
              <>
                {etapa.erroCamera && (
                  <p className="m-0 w-full rounded-2xl border border-warning bg-warning/10 p-3 text-center text-sm font-semibold">
                    Não deu para abrir a câmera. Peça o código de 6 dígitos ao cliente.
                  </p>
                )}

                {!etapa.camera && !etapa.usarCodigo && !etapa.erroCamera && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraLiberada(true);
                        setEtapa({ nome: "lendo", camera: true });
                      }}
                      className="btn btn-primary btn-block h-20 gap-2 rounded-2xl text-lg font-black"
                    >
                      <CameraIcon className="h-7 w-7" />
                      Ler o passe
                    </button>
                    <div className="divider my-0 text-xs opacity-60">ou digite o código</div>
                  </>
                )}

                <form
                  className="flex w-full flex-col gap-3"
                  onSubmit={e => {
                    e.preventDefault();
                    if (codigoCurtoValido(codigo)) void identificar({ codigo: codigo.trim() });
                  }}
                >
                  <input
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    value={codigo}
                    onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    aria-label="Código do cliente"
                    className="input input-bordered h-20 w-full text-center font-mono text-4xl font-black tracking-[0.3em]"
                  />
                  <button
                    type="submit"
                    disabled={!codigoCurtoValido(codigo)}
                    className="btn btn-primary btn-block h-14 rounded-2xl text-lg font-black disabled:opacity-40"
                  >
                    Ver o que ele tem
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {etapa.nome === "escolhendo" && (
          <div className="flex w-full max-w-sm flex-col gap-4">
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4 text-center">
              <span className="block text-sm font-bold text-secondary">{etapa.dados.cliente.nome ?? "Cliente"}</span>
              <span className="mt-1 block font-mono text-4xl font-black leading-none text-secondary">
                {etapa.dados.cartela.saldo}
              </span>
              <span className="text-xs font-semibold opacity-70">
                {etapa.dados.cartela.saldo === 1 ? "carimbo na cartela" : "carimbos na cartela"}
              </span>
            </div>

            {/* Duas portas. Um alvo de 48px cada, lado a lado: no balcão a
                escolha é feita com o polegar, muitas vezes com a outra mão
                segurando o produto. */}
            <div role="tablist" className="tabs tabs-box grid grid-cols-2 p-1">
              <button
                type="button"
                role="tab"
                aria-selected={aba === "premio"}
                onClick={() => setAba("premio")}
                className={`tab h-12 font-black ${aba === "premio" ? "tab-active" : ""}`}
              >
                Prêmio
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aba === "peca"}
                onClick={() => setAba("peca")}
                className={`tab h-12 gap-1.5 font-black ${aba === "peca" ? "tab-active" : ""}`}
              >
                <RectangleStackIcon className="h-4 w-4" />
                Peça
              </button>
            </div>

            {aba === "peca" ? (
              <Pecas
                pecas={pecas}
                contaCentavos={contaCentavos}
                aoDigitarConta={setContaDigitos}
                aoUsar={peca => void usarPeca(etapa.dados, peca)}
              />
            ) : etapa.dados.recompensas.length === 0 ? (
              <p className="m-0 rounded-2xl border border-dashed border-base-300 p-6 text-center text-sm opacity-75">
                Esta loja ainda não cadastrou prêmios.
              </p>
            ) : (
              etapa.dados.recompensas.map(r => (
                <button
                  key={r.id}
                  type="button"
                  disabled={!r.pronta || r.esgotada}
                  onClick={() => void entregar(etapa.dados, r)}
                  className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${
                    r.pronta && !r.esgotada ? "border-primary bg-primary/5" : "border-base-300 bg-base-100 opacity-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-base font-bold text-secondary">{r.titulo}</span>
                    <span className="text-xs opacity-75">
                      {r.esgotada
                        ? "esgotado"
                        : r.pronta
                          ? "pode entregar"
                          : r.selos > etapa.dados.cartela.saldo
                            ? `faltam ${r.selos - etapa.dados.cartela.saldo} carimbos`
                            : `faltam ${r.pontos - etapa.dados.cartela.pontos} pontos da cidade`}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-xl bg-base-200 px-3 py-1.5 text-center font-mono text-lg font-black text-secondary">
                    {r.selos > 0 ? r.selos : r.pontos}
                    <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">
                      {r.selos > 0 ? "carimbos" : "pontos"}
                    </span>
                  </span>
                </button>
              ))
            )}

            <button type="button" onClick={recomecar} className="btn btn-ghost h-12 rounded-xl font-bold">
              Cancelar
            </button>
          </div>
        )}

        {etapa.nome === "entregando" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <span className="loading loading-spinner loading-lg text-brand-ink" />
            <p className="m-0 font-bold opacity-75">Entregando…</p>
          </div>
        )}

        {etapa.nome === "entregue" && (
          <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 text-center">
            <CheckCircleIcon className="h-20 w-20 text-success" />
            <div>
              <h2 className="m-0 font-serif text-2xl font-black text-secondary">Pode entregar</h2>
              <p className="m-0 mt-1 text-base font-bold">{etapa.titulo}</p>
              <p className="m-0 mt-1 text-sm opacity-75">
                {etapa.selos} {etapa.selos === 1 ? "carimbo descontado" : "carimbos descontados"} da cartela
              </p>
            </div>
            <button
              type="button"
              onClick={recomecar}
              className="btn btn-primary btn-block h-14 rounded-2xl text-lg font-black"
            >
              Próximo cliente
            </button>
          </div>
        )}

        {etapa.nome === "peca-usada" && (
          <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 text-center">
            <CheckCircleIcon className="h-20 w-20 text-success" />
            <div>
              <h2 className="m-0 font-serif text-2xl font-black text-secondary">Desconto aplicado</h2>
              <p className="m-0 mt-1 text-base font-bold">{etapa.titulo}</p>
              {etapa.descontoCentavos > 0 ? (
                <p className="m-0 mt-2 font-mono text-4xl font-black leading-none text-brand-ink">
                  −{formatarCentavos(etapa.descontoCentavos)}
                </p>
              ) : (
                <p className="m-0 mt-1 text-sm opacity-75">A peça foi queimada. Aplique o desconto combinado.</p>
              )}
              <p className="m-0 mt-2 text-sm opacity-75">Tire este valor do total antes de fechar a conta.</p>
            </div>
            <button
              type="button"
              onClick={recomecar}
              className="btn btn-primary btn-block h-14 rounded-2xl text-lg font-black"
            >
              Próximo cliente
            </button>
          </div>
        )}

        {etapa.nome === "erro" && (
          <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 text-center">
            <ExclamationTriangleIcon className="h-20 w-20 text-error" />
            <div>
              <h2 className="m-0 font-serif text-2xl font-black text-secondary">Não deu certo</h2>
              <p className="m-0 mt-1 text-sm opacity-80">{etapa.mensagem}</p>
            </div>
            <button type="button" onClick={recomecar} className="btn btn-primary btn-block h-14 rounded-2xl font-black">
              Tentar de novo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * As peças do cliente que valem aqui.
 *
 * O valor da conta é opcional: sem ele a peça ainda pode ser usada, só não dá
 * para mostrar o desconto em reais. Com ele, o número vem calculado pelo
 * contrato — o mesmo que o balcão vai honrar.
 */
const Pecas = ({
  pecas,
  contaCentavos,
  aoDigitarConta,
  aoUsar,
}: {
  pecas?: PecaNoBalcao[];
  contaCentavos: number;
  aoDigitarConta: (digitos: string) => void;
  aoUsar: (peca: PecaNoBalcao) => void;
}) => (
  <div className="flex flex-col gap-3">
    <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
      Valor da conta (para calcular o desconto)
      <div className="flex items-center gap-2 rounded-2xl border border-base-300 bg-base-100 px-4">
        <span className="text-lg font-black opacity-60">R$</span>
        <input
          inputMode="numeric"
          value={contaCentavos > 0 ? centavosParaVisor(contaCentavos) : ""}
          onChange={e => aoDigitarConta(e.target.value)}
          placeholder="0,00"
          aria-label="Valor da conta"
          className="h-14 w-full bg-transparent text-right font-mono text-2xl font-black outline-hidden"
        />
      </div>
    </label>

    {!pecas ? (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-md text-brand-ink" />
      </div>
    ) : pecas.length === 0 ? (
      <p className="m-0 rounded-2xl border border-dashed border-base-300 p-6 text-center text-sm opacity-75">
        Este cliente não tem peça que valha nesta loja.
      </p>
    ) : (
      pecas.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => aoUsar(p)}
          className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border-2 border-primary bg-primary/5 px-4 py-3 text-left transition active:scale-[0.99]"
        >
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-secondary">{p.titulo}</span>
            <span className="text-xs opacity-75">
              {p.programa ?? `nível ${p.nivel}`}
              {p.quantidade > 1 && ` • tem ${p.quantidade}`}
            </span>
          </span>
          <span className="shrink-0 rounded-xl bg-base-200 px-3 py-1.5 text-center font-mono text-lg font-black text-brand-ink">
            {p.descontoCentavos !== null && p.descontoCentavos > 0
              ? `−${formatarCentavos(p.descontoCentavos)}`
              : "usar"}
          </span>
        </button>
      ))
    )}
  </div>
);
