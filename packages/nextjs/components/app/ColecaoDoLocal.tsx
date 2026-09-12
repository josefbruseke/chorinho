import Link from "next/link";
import { GiftIcon, RectangleStackIcon, TrophyIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { supabaseServer } from "~~/services/database/server";
import { beneficioEmTexto, criterioEmTexto, dataCurta } from "~~/utils/colecao";
import { urlDaMidia } from "~~/utils/midia";

/**
 * O que esta loja oferece além do carimbo: prêmios, peças e conquistas.
 *
 * Componente de servidor, lendo pela RLS como um visitante qualquer — e é essa
 * a garantia de que ninguém vê rascunho de loja nenhuma aqui. O progresso
 * pessoal ("faltam 3 visitas") não entra: ele depende de carteira e mora na
 * carteira do cliente, que é onde ele vai agir.
 */
export const ColecaoDoLocal = async ({ establishmentId }: { establishmentId: string }) => {
  const supabase = await supabaseServer();

  const [{ data: recompensas }, { data: programas }, { data: conquistas }] = await Promise.all([
    supabase
      .from("rewards")
      .select("id, title, description, stamp_cost, point_cost, piece_id")
      .eq("establishment_id", establishmentId)
      .eq("active", true)
      .order("stamp_cost"),
    supabase
      .from("discount_programs")
      .select("id, name, description, kind, base_benefit, cap_cents, product, joint, ends_at")
      .eq("establishment_id", establishmentId)
      .eq("active", true)
      .order("created_at"),
    supabase
      .from("achievements")
      .select("id, title, description, image_path, criterion, target, max_winners, winners, ends_at")
      .eq("establishment_id", establishmentId)
      .eq("active", true)
      .order("target"),
  ]);

  const idsDeProgramas = (programas ?? []).map(p => p.id);
  const { data: pecas } = idsDeProgramas.length
    ? await supabase
        .from("pieces")
        .select("id, title, description, image_path, level, max_supply, ends_at, program_id")
        .in("program_id", idsDeProgramas)
        .eq("active", true)
        .order("level")
    : { data: [] };

  // As vizinhas que aceitaram algum programa conjunto desta loja. É o que
  // transforma "programa conjunto" numa lista de nomes de rua.
  const idsConjuntos = (programas ?? []).filter(p => p.joint).map(p => p.id);
  const { data: membros } = idsConjuntos.length
    ? await supabase
        .from("program_members")
        .select("program_id, establishment_id")
        .in("program_id", idsConjuntos)
        .eq("status", "aceita")
    : { data: [] };

  const idsDeVizinhas = [...new Set((membros ?? []).map(m => m.establishment_id))].filter(id => id !== establishmentId);
  const { data: vizinhas } = idsDeVizinhas.length
    ? await supabase.from("establishments").select("id, slug, name").in("id", idsDeVizinhas)
    : { data: [] };
  const vizinhaPorId = new Map((vizinhas ?? []).map(v => [v.id, v]));

  const temAlgo = (recompensas ?? []).length || (pecas ?? []).length || (conquistas ?? []).length;
  if (!temAlgo) {
    return (
      <p className="m-0 text-xs leading-relaxed opacity-70">
        Esta loja ainda não publicou prêmios nem coleção. Os carimbos já contam — o que eles compram aparece aqui assim
        que o comerciante cadastrar.
      </p>
    );
  }

  const programaPorId = new Map((programas ?? []).map(p => [p.id, p]));

  return (
    <div className="flex flex-col gap-6">
      {(recompensas ?? []).length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 flex items-center gap-1.5 font-serif text-lg font-black text-secondary">
            <GiftIcon className="h-5 w-5 text-brand-ink" />O que os carimbos compram
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {(recompensas ?? []).map(r => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-100 p-3"
              >
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-secondary">{r.title}</strong>
                  {r.description && <span className="text-xs opacity-70">{r.description}</span>}
                  {r.piece_id && (
                    <span className="mt-1 flex items-center gap-1 text-xs font-bold text-brand-ink">
                      <RectangleStackIcon className="h-3.5 w-3.5" />
                      vem com uma peça da coleção
                    </span>
                  )}
                </div>
                <span className="shrink-0 rounded-xl bg-base-200 px-3 py-1.5 text-center font-mono text-base font-black text-secondary">
                  {r.stamp_cost > 0 ? r.stamp_cost : r.point_cost}
                  <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">
                    {r.stamp_cost > 0 ? "carimbos" : "pontos"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(pecas ?? []).length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 flex items-center gap-1.5 font-serif text-lg font-black text-secondary">
            <RectangleStackIcon className="h-5 w-5 text-brand-ink" />A coleção
          </h2>
          <p className="m-0 text-xs opacity-70">
            Tiragem fechada. Se conseguem gastando carimbos ou conquistando — e podem ser passadas adiante.
          </p>
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3">
            {(pecas ?? []).map(p => {
              const programa = programaPorId.get(p.program_id);
              const imagem = urlDaMidia(p.image_path);
              return (
                <li key={p.id} className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
                  {imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagem} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-linear-to-br from-amber-800 to-stone-900">
                      <RectangleStackIcon className="h-10 w-10 text-white/70" />
                    </div>
                  )}
                  <div className="p-2.5">
                    <strong className="block truncate text-sm text-secondary">{p.title}</strong>
                    {programa && (
                      <span className="block text-xs font-black text-brand-ink">
                        {beneficioEmTexto(
                          programa.kind === 1 ? "valor" : "percentual",
                          programa.base_benefit,
                          p.level,
                          programa.cap_cents,
                        )}
                      </span>
                    )}
                    <span className="block text-xs opacity-65">
                      {p.max_supply > 0 ? `${p.max_supply} no total` : "tiragem aberta"}
                      {p.ends_at && ` • até ${dataCurta(p.ends_at)}`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {vizinhaPorId.size > 0 && (
            <p className="m-0 flex flex-wrap items-center gap-1 text-xs opacity-75">
              <UserGroupIcon className="h-4 w-4 shrink-0" />
              <span className="font-semibold">As peças do programa conjunto também valem em:</span>
              {[...vizinhaPorId.values()].map(v => (
                <Link
                  key={v.id}
                  href={`/local/${v.slug}`}
                  className="rounded-full bg-base-200 px-2 py-0.5 font-semibold no-underline"
                >
                  {v.name}
                </Link>
              ))}
            </p>
          )}
        </section>
      )}

      {(conquistas ?? []).length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 flex items-center gap-1.5 font-serif text-lg font-black text-secondary">
            <TrophyIcon className="h-5 w-5 text-brand-ink" />
            Conquistas em aberto
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {(conquistas ?? []).map(c => (
              <li key={c.id} className="rounded-2xl border border-base-300 bg-base-100 p-3">
                <strong className="block text-sm text-secondary">{c.title}</strong>
                <span className="text-xs opacity-75">{criterioEmTexto(c.criterion, Number(c.target))}</span>
                {c.max_winners > 0 && (
                  <span className="mt-1 block text-xs font-bold text-brand-ink">
                    {Math.max(0, c.max_winners - c.winners)} de {c.max_winners} ainda disponíveis
                  </span>
                )}
                {c.ends_at && <span className="block text-xs opacity-60">até {dataCurta(c.ends_at)}</span>}
              </li>
            ))}
          </ul>
          <p className="m-0 text-xs opacity-70">
            Quanto falta para cada uma aparece na{" "}
            <Link href="/carteira" className="link font-semibold">
              sua carteira
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
};
