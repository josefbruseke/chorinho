"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HashtagIcon,
  InboxArrowDownIcon,
} from "@heroicons/react/24/outline";
import { BarraPdv } from "~~/components/pdv/BarraPdv";
import { PareamentoPdv } from "~~/components/pdv/PareamentoPdv";
import { TecladoDeValor } from "~~/components/pdv/TecladoDeValor";
import { QrScanner } from "~~/components/vitrine/QrScanner";
import { useFilaOffline } from "~~/hooks/pdv/useFilaOffline";
import { useWakeLock } from "~~/hooks/pdv/useWakeLock";
import { formatarCentavos } from "~~/utils/dinheiro";
import { novaRefDeVenda } from "~~/utils/fila";
import { codigoCurtoValido, decodificarPasse } from "~~/utils/pass";

/**
 * O terminal do balcão.
 *
 * Duas perguntas, nessa ordem: quanto foi a compra, e quem é o cliente. As
 * etapas são estado, não rota — trocar de URL no meio de uma venda, num tablet
 * com wifi ruim, é a forma mais confiável de perder a venda.
 */

/**
 * A espera do balcão, contada em voz alta.
 *
 * O carimbo só existe quando a rede confirma, e isso leva de dez a vinte
 * segundos. Um spinner mudo por vinte segundos é um atendente concluindo que
 * travou e apertando tudo de novo — então a tela diz o número, e diz que o
 * cliente já pode ir embora.
 */
const Esperando = ({ centavos }: { centavos: number }) => {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSegundos(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="loading loading-spinner loading-lg text-brand-ink" />
      <p className="m-0 font-bold opacity-70">Registrando {formatarCentavos(centavos)}…</p>
      <p className="m-0 max-w-xs text-sm opacity-60">
        A rede confirma em alguns segundos{segundos > 3 ? ` (${segundos}s)` : ""}. Pode liberar o cliente — o carimbo
        aparece na carteira dele sozinho.
      </p>
    </div>
  );
};

type Etapa =
  | { nome: "valor" }
  | { nome: "cliente"; camera?: boolean; usarCodigo?: boolean; erroCamera?: boolean }
  | { nome: "enviando" }
  | { nome: "recibo"; carimbos: number; saldo?: number; sequencia?: number; cliente?: string; naFila?: boolean }
  | { nome: "erro"; mensagem: string };

export const TerminalPdv = () => {
  const [etapa, setEtapa] = useState<Etapa>({ nome: "valor" });
  const [centavos, setCentavos] = useState(0);
  const [codigo, setCodigo] = useState("");
  const [previa, setPrevia] = useState<number | null>(null);
  const [loja, setLoja] = useState<string>();

  const [semAcesso, setSemAcesso] = useState<string>();
  const [precisaParear, setPrecisaParear] = useState(false);
  const [cameraLiberada, setCameraLiberada] = useState(false);
  const enviando = useRef(false);

  const { fila, online, sincronizando, sincronizar } = useFilaOffline();
  useWakeLock();

  /**
   * A câmera só abre sozinha depois que o aparelho já autorizou uma vez.
   *
   * Abrir de cara joga o pedido de permissão do navegador na cara do atendente
   * no meio da primeira venda — e uma recusa apressada ali fica gravada. Na
   * primeira vez ele decide com o balcão vazio; da segunda em diante a câmera
   * abre direto, sem toque extra.
   */
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then(estado => setCameraLiberada(estado.state === "granted"))
      .catch(() => undefined);
  }, []);

  // O nome da loja aparece antes de qualquer digitação: é assim que o atendente
  // percebe na hora que entrou com a conta errada.
  const carregarBalcao = useCallback(async () => {
    try {
      const r = await fetch("/api/pos/balcao");
      const corpo = await r.json();
      if (r.ok) {
        setLoja(corpo.nome);
        setPrecisaParear(false);
        setSemAcesso(undefined);
      } else if (r.status === 401) {
        setPrecisaParear(true);
      } else {
        setSemAcesso(corpo?.erro);
      }
    } catch {
      // Sem internet: o balcão continua registrando para a fila com o que já
      // sabe. Não é motivo para pedir pareamento de novo.
    }
  }, []);

  useEffect(() => {
    void carregarBalcao();
  }, [carregarBalcao]);

  // Prévia dos carimbos: o atendente confere o número antes de pedir o passe,
  // e um valor abaixo do piso da loja aparece como zero, não como surpresa.
  useEffect(() => {
    if (centavos === 0 || !online) {
      setPrevia(null);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const r = await fetch("/api/pos/previa", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ valorCentavos: centavos }),
        });
        const corpo = await r.json();
        setPrevia(r.ok && typeof corpo?.carimbos === "number" ? corpo.carimbos : null);
      } catch {
        setPrevia(null);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [centavos, online]);

  const registrar = useCallback(
    async (leitura: { qr?: string; codigo?: string }) => {
      if (enviando.current) return;
      enviando.current = true;
      setEtapa({ nome: "enviando" });

      const saleRef = novaRefDeVenda();
      const carteira = leitura.qr ? decodificarPasse(leitura.qr)?.a : undefined;

      const paraFila = async (motivo?: string) => {
        const { enfileirar } = await import("~~/utils/fila");
        await enfileirar({ saleRef, qr: leitura.qr, codigo: leitura.codigo, carteira, valorCentavos: centavos });
        setEtapa({ nome: "recibo", carimbos: 0, naFila: true, cliente: motivo });
      };

      if (leitura.qr && !carteira) {
        enviando.current = false;
        setEtapa({ nome: "erro", mensagem: "Este QR não é um passe do Chorinho." });
        return;
      }

      if (!navigator.onLine) {
        await paraFila();
        enviando.current = false;
        return;
      }

      try {
        const r = await fetch("/api/pos/stamp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ saleRef, ...leitura, valorCentavos: centavos }),
        });
        const corpo = await r.json();

        if (r.ok) {
          setEtapa({
            nome: "recibo",
            carimbos: corpo.carimbos ?? 0,
            saldo: corpo.saldo,
            sequencia: corpo.sequencia,
            cliente: corpo.cliente,
          });
        } else if (r.status >= 500 || r.status === 503) {
          // Problema nosso, não do atendente: guarda e tenta de novo sozinho.
          await paraFila();
        } else {
          setEtapa({ nome: "erro", mensagem: corpo?.erro ?? "Não foi possível registrar esta venda." });
        }
      } catch {
        await paraFila();
      } finally {
        enviando.current = false;
      }
    },
    [centavos],
  );

  const novaVenda = () => {
    setCentavos(0);
    setCodigo("");
    setPrevia(null);
    setEtapa({ nome: "valor" });
  };

  if (precisaParear) {
    return <PareamentoPdv aoParear={carregarBalcao} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <BarraPdv loja={loja} online={online} pendentes={fila.length} sincronizando={sincronizando} />

      <div className="flex flex-1 flex-col items-center gap-5 px-4 py-5">
        {semAcesso && (
          <div className="w-full max-w-sm rounded-2xl border border-warning bg-warning/10 p-4 text-center text-sm font-semibold">
            {semAcesso}
          </div>
        )}

        {etapa.nome === "valor" && (
          <>
            <TecladoDeValor centavos={centavos} aoMudar={setCentavos} />

            <div className="w-full max-w-sm">
              {previa !== null && centavos > 0 && (
                <p className="m-0 mb-2 text-center text-sm font-bold text-brand-ink">
                  {previa === 0
                    ? "Esta compra não atinge o mínimo para carimbo"
                    : `Vale ${previa} ${previa === 1 ? "carimbo" : "carimbos"}`}
                </p>
              )}
              <button
                type="button"
                disabled={centavos === 0}
                onClick={() => setEtapa({ nome: "cliente", camera: cameraLiberada })}
                className="btn btn-primary btn-block h-16 rounded-2xl text-lg font-black disabled:opacity-40"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {etapa.nome === "cliente" && (
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <button
              type="button"
              onClick={novaVenda}
              className="btn btn-ghost btn-sm self-start gap-1 rounded-xl font-bold"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {formatarCentavos(centavos)}
            </button>

            {etapa.camera && !etapa.usarCodigo && !etapa.erroCamera ? (
              <>
                <QrScanner
                  onScan={texto => void registrar({ qr: texto })}
                  onError={() => setEtapa({ nome: "cliente", erroCamera: true })}
                />
                <p className="m-0 text-center text-sm opacity-70">Aponte para o QR na tela do cliente</p>
                <button
                  type="button"
                  onClick={() => setEtapa({ nome: "cliente", usarCodigo: true })}
                  className="btn btn-ghost btn-sm gap-1.5 rounded-xl"
                >
                  <HashtagIcon className="h-4 w-4" />
                  Digitar o código de 6 dígitos
                </button>
              </>
            ) : (
              <>
                {etapa.erroCamera && (
                  <div className="w-full rounded-2xl border border-warning bg-warning/10 p-3 text-center text-sm font-semibold">
                    Não deu para abrir a câmera. Peça o código de 6 dígitos ao cliente.
                  </div>
                )}

                {/* Primeira venda deste aparelho: a câmera ainda não foi
                    autorizada. O botão é grande porque escanear é o caminho
                    normal — digitar é a saída. */}
                {!etapa.camera && !etapa.usarCodigo && !etapa.erroCamera && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraLiberada(true);
                        setEtapa({ nome: "cliente", camera: true });
                      }}
                      className="btn btn-primary btn-block h-20 gap-2 rounded-2xl text-lg font-black"
                    >
                      <CameraIcon className="h-7 w-7" />
                      Escanear o passe
                    </button>
                    <p className="m-0 -mt-1 text-center text-xs opacity-65">
                      O navegador vai pedir acesso à câmera. É só na primeira vez.
                    </p>
                    <div className="divider my-0 text-xs opacity-60">ou digite o código</div>
                  </>
                )}

                <form
                  className="flex w-full flex-col gap-3"
                  onSubmit={e => {
                    e.preventDefault();
                    if (codigoCurtoValido(codigo)) void registrar({ codigo: codigo.trim() });
                  }}
                >
                  <input
                    autoFocus
                    inputMode="numeric"
                    pattern="\d*"
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
                    className="btn btn-primary btn-block h-16 rounded-2xl text-lg font-black disabled:opacity-40"
                  >
                    Confirmar carimbo
                  </button>
                </form>
                {(etapa.camera || etapa.usarCodigo) && !etapa.erroCamera && (
                  <button
                    type="button"
                    onClick={() => {
                      setCameraLiberada(true);
                      setEtapa({ nome: "cliente", camera: true });
                    }}
                    className="btn btn-ghost btn-sm gap-1.5 rounded-xl"
                  >
                    <CameraIcon className="h-4 w-4" />
                    Voltar para a câmera
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {etapa.nome === "enviando" && <Esperando centavos={centavos} />}

        {etapa.nome === "recibo" && (
          <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 text-center">
            {etapa.naFila ? (
              <>
                <InboxArrowDownIcon className="h-20 w-20 text-honey-ink" />
                <div>
                  <h2 className="m-0 text-2xl font-serif font-black text-secondary">Guardado na fila</h2>
                  <p className="m-0 mt-1 text-sm opacity-75">
                    Sem internet agora. O carimbo sobe sozinho assim que a conexão voltar — o cliente já pode ir.
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-20 w-20 text-success" />
                <div>
                  <h2 className="m-0 text-3xl font-serif font-black text-secondary">
                    {etapa.carimbos > 0
                      ? `+${etapa.carimbos} ${etapa.carimbos === 1 ? "carimbo" : "carimbos"}`
                      : "Venda registrada"}
                  </h2>
                  <p className="m-0 mt-1 text-sm opacity-75">
                    {etapa.cliente ? `${etapa.cliente} — ` : ""}
                    {formatarCentavos(centavos)}
                    {etapa.saldo !== undefined ? ` · ${etapa.saldo} na cartela` : ""}
                  </p>
                  {etapa.sequencia !== undefined && etapa.sequencia > 1 && (
                    <p className="m-0 mt-1 text-sm font-bold text-honey-ink">
                      {etapa.sequencia} visitas seguidas — avise o cliente!
                    </p>
                  )}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={novaVenda}
              className="btn btn-primary btn-block h-16 rounded-2xl text-lg font-black"
            >
              Nova venda
            </button>
          </div>
        )}

        {etapa.nome === "erro" && (
          <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 text-center">
            <ExclamationTriangleIcon className="h-20 w-20 text-error" />
            <div>
              <h2 className="m-0 text-2xl font-serif font-black text-secondary">Não deu certo</h2>
              <p className="m-0 mt-1 text-sm opacity-80">{etapa.mensagem}</p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => setEtapa({ nome: "cliente", camera: cameraLiberada })}
                className="btn btn-primary btn-block h-14 rounded-2xl font-black"
              >
                Tentar de novo
              </button>
              <button type="button" onClick={novaVenda} className="btn btn-ghost btn-block rounded-2xl font-bold">
                Começar outra venda
              </button>
            </div>
          </div>
        )}
      </div>

      {fila.length > 0 && etapa.nome === "valor" && (
        <footer className="border-t border-base-300 bg-base-100 px-4 py-2.5">
          <button
            type="button"
            onClick={() => void sincronizar()}
            disabled={!online || sincronizando}
            className="btn btn-ghost btn-block btn-sm justify-between rounded-xl font-bold"
          >
            <span>
              {fila.length} {fila.length === 1 ? "venda aguardando" : "vendas aguardando"}
            </span>
            <span className="opacity-70">{sincronizando ? "enviando…" : online ? "enviar agora" : "sem internet"}</span>
          </button>
          <Link href="/pdv/fila" className="block text-center text-xs opacity-60 underline">
            ver a fila
          </Link>
        </footer>
      )}
    </div>
  );
};
