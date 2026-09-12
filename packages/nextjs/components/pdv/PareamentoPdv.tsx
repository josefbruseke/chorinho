"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CameraIcon, CheckCircleIcon, ExclamationTriangleIcon, HashtagIcon } from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";
import { QrScanner } from "~~/components/vitrine/QrScanner";

/**
 * A instalação do balcão, feita uma vez.
 *
 * Três caminhos para a mesma coisa, do menos trabalhoso ao mais:
 *
 * 1. **O link já traz o código.** O painel oferece "usar este aparelho" e um
 *    QR; os dois abrem `/pdv?parear=XXXX`. Chegando assim, a tela não pergunta
 *    nada — pareia e mostra o nome da loja.
 * 2. **A câmera lê o QR** da tela do lojista. Serve para o tablet do caixa, que
 *    não é o aparelho onde o painel está aberto.
 * 3. **Digitar as oito letras**, que continua existindo para quando a câmera
 *    não abre ou o QR não está à mão.
 *
 * Antes só existia o terceiro, e ele obrigava alguém a transcrever um código
 * entre dois aparelhos — o passo em que mais gente desiste. Depois disso o
 * atendente nunca mais digita nada para começar o turno, que é a diferença
 * entre o programa ser usado e virar "o tablet que ninguém sabe a senha".
 */
export const PareamentoPdv = ({ aoParear }: { aoParear: () => void }) => {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState<string>();
  const [camera, setCamera] = useState(false);
  const tentado = useRef(false);

  const doLink = useSearchParams().get("parear");

  const parear = useCallback(
    async (bruto: string) => {
      const limpo = bruto
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);
      if (limpo.length !== 8) {
        setErro("código inválido");
        return;
      }

      setEnviando(true);
      setErro(undefined);
      setCamera(false);
      try {
        const r = await fetch("/api/pos/parear", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ codigo: limpo, aparelho: navigator.userAgent.slice(0, 60) }),
        });
        const corpo = await r.json();
        if (!r.ok) {
          setErro(corpo?.erro ?? "não foi possível parear este aparelho");
          return;
        }
        setPronto(corpo.loja);
        // Um instante para o atendente ler o nome da loja e ter certeza de que
        // pareou no lugar certo antes da tela trocar.
        setTimeout(aoParear, 1200);
      } catch {
        setErro("Sem internet. O pareamento precisa de conexão — só desta vez.");
      } finally {
        setEnviando(false);
      }
    },
    [aoParear],
  );

  // O código que veio na URL vale uma tentativa só. Sem a trava, um código
  // recusado tentaria de novo a cada render e o erro piscaria sem parar.
  useEffect(() => {
    if (!doLink || tentado.current) return;
    tentado.current = true;
    void parear(doLink);
  }, [doLink, parear]);

  if (pronto) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <CheckCircleIcon className="h-20 w-20 text-success" />
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Balcão pronto</h1>
        <p className="m-0 text-base opacity-80">{pronto}</p>
      </div>
    );
  }

  // Chegou pelo link: não faz sentido mostrar formulário enquanto a tentativa
  // automática ainda está em voo.
  if (doLink && enviando) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="m-0 font-bold opacity-75">Ligando este aparelho ao balcão…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <BrandLogo className="h-10" />

      <div className="text-center">
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Ligar este aparelho ao balcão</h1>
        <p className="m-0 mt-1.5 max-w-xs text-sm leading-relaxed opacity-75">
          No painel da loja, em <strong>Terminais</strong>, crie um terminal. Aponte a câmera para o QR que aparece lá —
          ou digite o código. Só precisa fazer isso uma vez neste aparelho.
        </p>
      </div>

      {camera ? (
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <QrScanner onScan={texto => void parear(extrairCodigo(texto))} onError={() => setCamera(false)} />
          <button
            type="button"
            onClick={() => setCamera(false)}
            className="btn btn-ghost h-12 gap-1.5 rounded-xl font-bold"
          >
            <HashtagIcon className="h-5 w-5" />
            Digitar o código
          </button>
        </div>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            onClick={() => setCamera(true)}
            className="btn btn-primary btn-block h-20 gap-2 rounded-2xl text-lg font-black"
          >
            <CameraIcon className="h-7 w-7" />
            Ler o QR do painel
          </button>

          <div className="divider my-0 text-xs opacity-60">ou digite o código</div>

          <form
            className="flex flex-col gap-3"
            onSubmit={e => {
              e.preventDefault();
              if (codigo.length === 8) void parear(codigo);
            }}
          >
            <input
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={8}
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="ABCD2345"
              aria-label="Código do terminal"
              className="input input-bordered h-20 w-full text-center font-mono text-3xl font-black tracking-[0.25em]"
            />

            <button
              type="submit"
              disabled={codigo.length !== 8 || enviando}
              className="btn btn-secondary btn-block h-14 rounded-2xl text-lg font-black disabled:opacity-40"
            >
              {enviando ? <span className="loading loading-spinner loading-sm" /> : "Ligar ao balcão"}
            </button>
          </form>
        </div>
      )}

      {erro && (
        <p className="m-0 inline-flex max-w-xs items-start gap-2 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          {erro}
        </p>
      )}

      <p className="m-0 max-w-xs text-center text-xs leading-relaxed opacity-65">
        Perdeu o aparelho? O lojista desliga este terminal pelo painel e ele para de carimbar na hora.
      </p>
    </div>
  );
};

/**
 * O QR do painel carrega a URL inteira; a câmera de um celular qualquer também
 * pode ter lido só o código. Aceita os dois para ninguém precisar saber qual é.
 */
const extrairCodigo = (texto: string) => {
  try {
    return new URL(texto).searchParams.get("parear") ?? texto;
  } catch {
    return texto;
  }
};
