import { NextResponse } from "next/server";
import { progressoDaConquista, redeConfigurada, saldoDasPecas } from "~~/services/colecao/servidor";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { urlDaMidia } from "~~/utils/midia";

export const runtime = "nodejs";

/**
 * A coleção do cliente: as peças que ele tem e as conquistas que estão ao
 * alcance.
 *
 * Diferente das cartelas, o saldo aqui vem da REDE, não do espelho. A peça é
 * transferível — ela pode ter mudado de mão sem passar por nenhuma tela nossa,
 * e um espelho desatualizado mostraria ao cliente um desconto que ele já não
 * tem, descoberto no balcão na frente de uma fila.
 *
 * O progresso das conquistas também vem da cadeia, pelo mesmo motivo que o
 * contrato confere o critério sozinho: o número que aparece é o número que vai
 * valer quando ele tocar em "receber".
 */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: perfil } = await admin.from("profiles").select("wallet_address").eq("id", userId).maybeSingle();
  const carteira = perfil?.wallet_address?.toLowerCase() as `0x${string}` | undefined;

  if (!carteira) return NextResponse.json({ carteira: null, pecas: [], conquistas: [] });
  if (!redeConfigurada()) {
    return NextResponse.json({ carteira, pecas: [], conquistas: [], aviso: "a rede não está configurada aqui." });
  }

  const { data: pecas } = await admin
    .from("pieces")
    .select("id, onchain_id, title, description, image_path, level, max_supply, ends_at, program_id")
    .not("onchain_id", "is", null);

  const tokenIds = (pecas ?? []).map(p => p.onchain_id).filter((id): id is number => id !== null);
  const saldos = await saldoDasPecas(carteira, tokenIds).catch(() => new Map<number, number>());
  const minhas = (pecas ?? []).filter(p => (saldos.get(p.onchain_id!) ?? 0) > 0);

  // Só agora buscamos programa e loja: quem tem três peças não precisa que
  // façamos a leitura do catálogo inteiro do bairro.
  const idsDeProgramas = [...new Set(minhas.map(p => p.program_id))];
  const { data: programas } = idsDeProgramas.length
    ? await admin
        .from("discount_programs")
        .select("id, name, kind, base_benefit, cap_cents, product, joint, active, establishment_id")
        .in("id", idsDeProgramas)
    : { data: [] };

  const idsDeLojas = [...new Set((programas ?? []).map(p => p.establishment_id))];
  const [{ data: lojas }, { data: membros }] = await Promise.all([
    idsDeLojas.length
      ? admin.from("establishments").select("id, slug, name").in("id", idsDeLojas)
      : Promise.resolve({ data: [] as { id: string; slug: string; name: string }[] }),
    idsDeProgramas.length
      ? admin
          .from("program_members")
          .select("program_id, establishment_id, status")
          .in("program_id", idsDeProgramas)
          .eq("status", "aceita")
      : Promise.resolve({ data: [] as { program_id: string; establishment_id: string; status: string }[] }),
  ]);

  // As lojas onde a peça vale hoje. Para programa conjunto são as que
  // aceitaram; para programa de uma loja só, ela mesma.
  const idsMembros = [...new Set((membros ?? []).map(m => m.establishment_id))];
  const { data: lojasDaPool } = idsMembros.length
    ? await admin.from("establishments").select("id, slug, name").in("id", idsMembros)
    : { data: [] };

  const nomeDaLoja = new Map([...(lojas ?? []), ...(lojasDaPool ?? [])].map(l => [l.id, l]));
  const programaPorId = new Map((programas ?? []).map(p => [p.id, p]));

  const valeEm = (programaId: string) => {
    const programa = programaPorId.get(programaId);
    if (!programa) return [];
    if (!programa.joint) {
      const loja = nomeDaLoja.get(programa.establishment_id);
      return loja ? [{ slug: loja.slug, nome: loja.name }] : [];
    }
    return (membros ?? [])
      .filter(m => m.program_id === programaId)
      .map(m => nomeDaLoja.get(m.establishment_id))
      .filter((l): l is { id: string; slug: string; name: string } => Boolean(l))
      .map(l => ({ slug: l.slug, nome: l.name }));
  };

  // --------------------------------------------------------- conquistas
  //
  // As das lojas onde a pessoa já tem cartela: perseguir uma conquista de uma
  // loja onde nunca se pôs o pé não é uma meta, é ruído.
  const { data: cartelas } = await admin.from("stamp_balances_cache").select("establishment_id").eq("wallet", carteira);

  const lojasVisitadas = [...new Set((cartelas ?? []).map(c => c.establishment_id))];
  const { data: conquistas } = lojasVisitadas.length
    ? await admin
        .from("achievements")
        .select("id, onchain_id, title, description, image_path, criterion, target, establishment_id, piece_id")
        .in("establishment_id", lojasVisitadas)
        .eq("active", true)
        .not("onchain_id", "is", null)
    : { data: [] };

  const idsDasLojasDeConquista = [...new Set((conquistas ?? []).map(c => c.establishment_id))];
  const { data: lojasDeConquista } = idsDasLojasDeConquista.length
    ? await admin.from("establishments").select("id, slug, name").in("id", idsDasLojasDeConquista)
    : { data: [] };
  const lojaDaConquista = new Map((lojasDeConquista ?? []).map(l => [l.id, l]));

  const comProgresso = await Promise.all(
    (conquistas ?? []).map(async c => {
      const progresso = await progressoDaConquista(c.onchain_id!, carteira).catch(() => null);
      const loja = lojaDaConquista.get(c.establishment_id);
      return {
        id: c.id,
        onchainId: c.onchain_id,
        titulo: c.title,
        descricao: c.description,
        imagem: urlDaMidia(c.image_path),
        loja: loja ? { slug: loja.slug, nome: loja.name } : undefined,
        alcancado: progresso?.alcancado ?? 0,
        alvo: progresso?.alvo ?? Number(c.target),
        merecida: progresso?.bateu ?? false,
        jaRecebida: progresso?.jaPegou ?? false,
      };
    }),
  );

  return NextResponse.json({
    carteira,
    pecas: minhas.map(p => {
      const programa = programaPorId.get(p.program_id);
      return {
        id: p.id,
        onchainId: p.onchain_id,
        titulo: p.title,
        descricao: p.description,
        imagem: urlDaMidia(p.image_path),
        quantidade: saldos.get(p.onchain_id!) ?? 0,
        nivel: p.level,
        tiragem: p.max_supply,
        terminaEm: p.ends_at,
        programa: programa
          ? {
              nome: programa.name,
              tipo: programa.kind === 1 ? "valor" : "percentual",
              beneficioBase: programa.base_benefit,
              tetoCentavos: programa.cap_cents,
              produto: programa.product,
              ativo: programa.active,
            }
          : undefined,
        valeEm: valeEm(p.program_id),
      };
    }),
    // Primeiro as que já podem ser recebidas: é a única linha desta tela que
    // pede uma ação.
    conquistas: comProgresso
      .filter(c => !c.jaRecebida)
      .sort((a, b) => Number(b.merecida) - Number(a.merecida) || b.alcancado / b.alvo - a.alcancado / a.alvo),
  });
}
