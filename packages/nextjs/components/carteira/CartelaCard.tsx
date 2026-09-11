import Link from "next/link";
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
 */
export const CartelaCard = ({ cartela }: { cartela: Cartela }) => {
  const info = categoryInfo(cartela.categoria);
  const meta = cartela.meta?.selos ?? 0;
  const falta = Math.max(0, meta - cartela.saldo);
  const proporcao = meta > 0 ? Math.min(1, cartela.saldo / meta) : 0;
  // Bolinha toda preenchida nao informa nada: quem tem 49 carimbos e meta de 12
  // ve a mesma cartela de quem tem exatamente 12. Passando da meta, a cartela
  // diz o que importa -- que ja da para trocar.
  const alcancou = meta > 0 && cartela.saldo >= meta;

  return (
    <Link
      href={`/carteira/${cartela.slug}`}
      className="block rounded-3xl border-2 border-dashed border-kraft-edge bg-gradient-to-br from-base-200 via-kraft to-craft p-5 no-underline transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CategoryIcon iconKey={info.iconKey} className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h3 className="m-0 truncate font-serif text-lg font-black leading-tight text-secondary">{cartela.nome}</h3>
            <span className="text-xs opacity-65">{cartela.bairro ?? cartela.cidade ?? info.label}</span>
          </div>
        </div>

        {cartela.sequencia > 1 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-honey-soft px-2.5 py-1 text-xs font-bold text-honey-ink">
            <FireIcon className="h-3.5 w-3.5" />
            {cartela.sequencia}
          </span>
        )}
      </div>

      <div className="mt-4">
        {alcancou ? (
          <div className="flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-primary-content">
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            <span className="text-xs font-bold">Cartela cheia — é só pedir no balcão</span>
          </div>
        ) : meta > 0 && meta <= LIMITE_DE_BOLINHAS ? (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: meta }).map((_, i) => (
              <span
                key={i}
                className={`h-6 w-6 rounded-full border-2 ${
                  i < cartela.saldo ? "border-primary bg-primary" : "border-kraft-edge bg-base-100/50"
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-base-100/60">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, proporcao * 100)}%` }} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="block font-mono text-2xl font-black leading-none text-secondary">{cartela.saldo}</span>
          <span className="text-xs opacity-65">{cartela.saldo === 1 ? "carimbo" : "carimbos"}</span>
        </div>

        <p className="m-0 min-w-0 flex-1 text-right text-xs leading-snug">
          {cartela.disponiveis > 0 ? (
            <span className="font-bold text-primary">
              {cartela.disponiveis === 1 ? "1 prêmio pronto" : `${cartela.disponiveis} prêmios prontos`}
            </span>
          ) : cartela.meta ? (
            <span className="opacity-75">
              faltam <strong className="text-secondary">{falta}</strong> para {cartela.meta.titulo.toLowerCase()}
            </span>
          ) : (
            <span className="opacity-60">esta loja ainda não cadastrou prêmios</span>
          )}
        </p>
      </div>
    </Link>
  );
};
