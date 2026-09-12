import { notFound } from "next/navigation";
import { EscolherBalcao } from "~~/components/teste/EscolherBalcao";
import { supabaseAdmin } from "~~/services/database/admin";
import { acessoDeTesteLiberado } from "~~/services/teste/modo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Modo de teste | Chorinho", robots: { index: false, follow: false } };

/**
 * A vitrine do modo de teste: escolha a loja e o balcão dela abre.
 *
 * Com o modo desligado — ou com a chave errada — a rota não existe:
 * `notFound()` e não uma tela dizendo "desligado" ou "chave inválida", porque
 * as duas confirmariam a quem está tentando que existe algo ali para achar.
 *
 * Mostra o que impede cada loja de carimbar antes de você clicar. Descobrir no
 * caixa que a loja está suspensa é o pior momento para descobrir — e essa é a
 * mesma razão pela qual a tela do cliente mostra onde a peça vale.
 */
const Teste = async () => {
  // Quem grava o cookie da chave é o proxy: página não pode escrever cookie no
  // Next. Aqui só se confere o que ele já deixou.
  const { liberado } = await acessoDeTesteLiberado();
  if (!liberado) notFound();

  const { data: lojas } = await supabaseAdmin()
    .from("establishments")
    .select("id, name, slug, status, onchain_id, neighborhood")
    .order("name");

  return <EscolherBalcao lojas={lojas ?? []} />;
};

export default Teste;
