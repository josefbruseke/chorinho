import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, FireIcon } from "@heroicons/react/24/solid";
import { CategoryIcon } from "~~/components/vitrine/CategoryIcon";
import { categoryInfo } from "~~/utils/vitrine";

export type Cartela = {
  slug: string;
  nome: string;
  categoria: number;
  bairro: string | null;
  cidade: string | null;
  saldo: number;
  total: number;
  sequencia: number;
  melhorSequencia: number;
  ultimaVisita: string | null;
  meta: { titulo: string; selos: number } | null;
  disponiveis: number;
};

/** Até doze, a bolinha diz mais que qualquer número: o cliente conta de relance. */
const LIMITE_DE_BOLINHAS = 12;

/**
 * A cartela de uma loja.
 *
 * É a cartela de papel que o comércio de bairro já usa há décadas — só que
 * esta não fica amassada no fundo da carteira e não some quando o dono da
 * padaria troca o carimbo.
 *
 * A hierarquia tem uma ordem deliberada: quantos carimbos eu tenho, se já dá
 * para trocar alguma coisa, e só então quanto falta. É a ordem em que a
 * pergunta aparece na cabeça de quem abre a tela na fila do caixa.
 */
export const CartelaCard = ({ cartela }: { cartela: Cartela }) => {
  const info = categoryInfo(cartela.categoria);
  const meta = cartela.meta?.selos ?? 0;
  const falta = Math.max(0, meta - cartela.saldo);
  const proporcao = meta > 0 ? Math.min(1, cartela.saldo / meta) : 0;
  // Bolinha toda preenchida não informa nada: quem tem 49 carimbos e meta de 12
  // veria a mesma cartela de quem tem exatamente 12.
  const alcancou = meta > 0 && cartela.saldo >= meta;

  return (
    <Link
      href={`/carteira/${cartela.slug}`}
      className="block rounded-3xl border-2 border-dashed border-kraft-edge bg-gradient-to-br from-base-200 via-kraft to-craft p-5 no-underline shadow-sm transition active:scale-[0.99]"
    >
      <header className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <CategoryIcon iconKey={info.iconKey} className="h-6.5 w-6.5" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate font-serif text-xl font-black leading-tight text-secondary">{cartela.nome}</h3>
          <span className="text-sm opacity-70">{cartela.bairro ?? cartela.cidade ?? info.label}</span>
        </div>

        {cartela.sequencia > 1 && (
          <span
            title={`${cartela.sequencia} visitas seguidas`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-honey-soft px-3 py-1.5 text-sm font-black text-honey-ink"
          >
            <FireIcon className="h-4 w-4" />
            {cartela.sequencia}
          </span>
        )}

        <ChevronRightIcon className="h-5 w-5 shrink-0 opacity-40" />
      </header>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="block font-mono text-5xl font-black leading-none tracking-tight text-secondary">
            {cartela.saldo}
          </span>
          <span className="text-sm font-semibold opacity-70">{cartela.saldo === 1 ? "carimbo" : "carimbos"}</span>
        </div>

        {cartela.disponiveis > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-base font-black text-primary-content shadow-sm">
            <CheckCircleIcon className="h-5 w-5" />
            {cartela.disponiveis === 1 ? "1 prêmio pronto" : `${cartela.disponiveis} prêmios`}
          </span>
        ) : cartela.meta ? (
          <span className="max-w-[55%] text-right text-sm leading-snug opacity-80">
            faltam <strong className="font-mono text-lg font-black text-secondary">{falta}</strong> para
            <br />
            <span className="font-semibold">{cartela.meta.titulo.toLowerCase()}</span>
          </span>
        ) : (
          <span className="max-w-[55%] text-right text-sm opacity-60">esta loja ainda não cadastrou prêmios</span>
        )}
      </div>

      <div className="mt-4">
        {alcancou ? (
          <div className="h-3 w-full rounded-full bg-primary" />
        ) : meta > 0 && meta <= LIMITE_DE_BOLINHAS ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: meta }).map((_, i) => (
              <span
                key={i}
                className={`h-7 w-7 rounded-full border-2 ${
                  i < cartela.saldo ? "border-primary bg-primary" : "border-kraft-edge bg-base-100/60"
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="h-3 w-full overflow-hidden rounded-full bg-base-100/60">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, proporcao * 100)}%` }} />
          </div>
        )}
      </div>
    </Link>
  );
};
