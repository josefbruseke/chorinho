import { del, get, set } from "idb-keyval";

/**
 * A fila do balcão sem internet.
 *
 * Comércio de bairro tem wifi ruim. Se a venda só existisse quando o servidor
 * responde, o atendente teria que escolher entre segurar a fila e deixar o
 * cliente sem carimbo — e ele vai escolher a fila, sempre. Então a venda é
 * gravada no aparelho primeiro e sobe depois.
 *
 * Guardamos em IndexedDB, e não em `localStorage`, porque escrita síncrona
 * trava a interface no meio de um toque. E o esvaziamento é nosso, não do
 * Background Sync: ele não existe no Safari do iPhone, e o atendente precisa
 * *ver* o que ainda está pendente.
 */

const CHAVE = "chorinho.pdv.fila";
const EVENTO = "chorinho:fila";

export type VendaNaFila = {
  /** Gerado no aparelho. É o que impede crédito em dobro quando reenviamos. */
  saleRef: string;
  qr?: string;
  codigo?: string;
  /** Lida do próprio QR, só para mostrar na lista enquanto está offline. */
  carteira?: string;
  boostBps?: number;
  criadaEm: number;
  tentativas: number;
  ultimoErro?: string;
};

/** Uma referência de venda por aparelho e por toque. */
export const novaRefDeVenda = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const avisar = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO));
};

/** Assina mudanças na fila — é o que mantém o contador do cabeçalho vivo. */
export const observarFila = (aoMudar: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENTO, aoMudar);
  return () => window.removeEventListener(EVENTO, aoMudar);
};

export const lerFila = async (): Promise<VendaNaFila[]> => {
  try {
    return (await get<VendaNaFila[]>(CHAVE)) ?? [];
  } catch {
    // Aba anônima, cota estourada, storage bloqueado: a fila some, mas o PDV
    // continua funcionando online.
    return [];
  }
};

/**
 * Toda escrita passa por aqui, encadeada.
 *
 * Dois toques rápidos disparariam dois `get`/`set` concorrentes e o segundo
 * sobrescreveria o primeiro — uma venda apagada sem ninguém perceber.
 */
let corrente: Promise<unknown> = Promise.resolve();

const alterar = <T>(fn: (atual: VendaNaFila[]) => { proxima: VendaNaFila[]; retorno: T }): Promise<T> => {
  const proximo = corrente.then(async () => {
    const atual = await lerFila();
    const { proxima, retorno } = fn(atual);
    if (proxima.length === 0) await del(CHAVE);
    else await set(CHAVE, proxima);
    avisar();
    return retorno;
  });
  corrente = proximo.catch(() => undefined);
  return proximo;
};

export const enfileirar = (venda: Omit<VendaNaFila, "criadaEm" | "tentativas">) =>
  alterar(atual => {
    const ja = atual.some(v => v.saleRef === venda.saleRef);
    const proxima = ja ? atual : [...atual, { ...venda, criadaEm: Date.now(), tentativas: 0 }];
    return { proxima, retorno: proxima };
  });

export const removerDaFila = (saleRefs: string[]) =>
  alterar(atual => {
    const fora = new Set(saleRefs);
    const proxima = atual.filter(v => !fora.has(v.saleRef));
    return { proxima, retorno: proxima };
  });

export const marcarFalha = (falhas: { saleRef: string; erro: string }[]) =>
  alterar(atual => {
    const porRef = new Map(falhas.map(f => [f.saleRef, f.erro]));
    const proxima = atual.map(v =>
      porRef.has(v.saleRef) ? { ...v, tentativas: v.tentativas + 1, ultimoErro: porRef.get(v.saleRef) } : v,
    );
    return { proxima, retorno: proxima };
  });

export const limparFila = () => alterar(() => ({ proxima: [], retorno: [] }));
