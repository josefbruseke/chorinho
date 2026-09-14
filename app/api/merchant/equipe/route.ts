import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import type { Enums } from "~~/services/database/types";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

type Papel = Enums<"papel_membro">;
const PAPEIS_CRIAVEIS: Papel[] = ["manager", "operator"];

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

/**
 * Procura uma conta do Chorinho pelo e-mail.
 *
 * Esta versão do Admin API do GoTrue não tem filtro por e-mail — só pagina.
 * Para o tamanho de uma equipe de comércio de bairro (dezenas de contas, não
 * milhões), varrer as páginas é mais simples e mais honesto que fingir um
 * índice que não existe.
 */
const PAGINAS_MAXIMAS = 20;
const CONTAS_POR_PAGINA = 200;

const contaPorEmail = async (email: string) => {
  const admin = supabaseAdmin();
  const alvo = email.toLowerCase();

  for (let pagina = 1; pagina <= PAGINAS_MAXIMAS; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: CONTAS_POR_PAGINA });
    if (error || !data?.users?.length) break;
    const achado = data.users.find(u => u.email?.toLowerCase() === alvo);
    if (achado) return achado;
    if (data.users.length < CONTAS_POR_PAGINA) break;
  }
  return null;
};

/**
 * Quem administra o painel desta loja — não confundir com quem carimba no
 * balcão. Atendente sem conta nenhuma usa o terminal pareado; esta lista é só
 * de quem faz login e entra aqui dentro.
 */
export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: membros } = await admin
      .from("establishment_members")
      .select("id, profile_id, role, active")
      .eq("establishment_id", loja.id)
      .order("active", { ascending: false })
      .order("created_at", { ascending: true });

    const linhas = membros ?? [];

    const { data: perfis } = linhas.length
      ? await admin
          .from("profiles")
          .select("id, display_name")
          .in(
            "id",
            linhas.map(m => m.profile_id),
          )
      : { data: [] };
    const nomePorId = new Map((perfis ?? []).map(p => [p.id, p.display_name]));

    // O e-mail vive em auth.users, fora do alcance de um `select` comum.
    // Busca uma conta de cada vez e, se ela sumiu ou a chamada falhar, mostra
    // só o nome em vez de derrubar a lista inteira.
    const emailPorId = new Map<string, string | null>();
    await Promise.all(
      linhas.map(async m => {
        try {
          const { data } = await admin.auth.admin.getUserById(m.profile_id);
          emailPorId.set(m.profile_id, data.user?.email ?? null);
        } catch {
          emailPorId.set(m.profile_id, null);
        }
      }),
    );

    return NextResponse.json({
      loja: { nome: loja.nome },
      meuPapel: loja.papel,
      membros: linhas.map(m => ({
        id: m.id,
        nome: nomePorId.get(m.profile_id) ?? null,
        email: emailPorId.get(m.profile_id) ?? null,
        papel: m.role,
        ativo: m.active,
        souEu: m.profile_id === userId,
      })),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao listar a equipe" }, { status: 500 });
  }
}

/**
 * Adiciona alguém à equipe pelo e-mail.
 *
 * Nunca cria conta: se a pessoa ainda não tem cadastro no Chorinho, ela
 * precisa entrar sozinha primeiro. Isso evita que o lojista digite um e-mail
 * errado e vincule sem querer a conta de outra pessoa qualquer.
 */
export async function POST(request: NextRequest) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: { email?: unknown; papel?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const email = String(corpo.email ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@") || email.length < 5) {
    return NextResponse.json({ erro: "informe um e-mail válido" }, { status: 400 });
  }

  const papelBruto = corpo.papel;
  if (typeof papelBruto !== "string" || !PAPEIS_CRIAVEIS.includes(papelBruto as Papel)) {
    return NextResponse.json({ erro: "papel inválido — escolha gerente ou atendente" }, { status: 400 });
  }
  const papel = papelBruto as Papel;

  try {
    const loja = await lojaDoGestor(userId);

    if (papel === "manager" && loja.papel !== "owner") {
      return NextResponse.json({ erro: "só o dono da loja pode adicionar um gerente" }, { status: 403 });
    }

    const conta = await contaPorEmail(email);
    const NAO_CADASTRADA = {
      erro: "essa pessoa ainda não tem conta no Chorinho — peça para ela se cadastrar primeiro",
    };
    if (!conta) return NextResponse.json(NAO_CADASTRADA, { status: 404 });

    const admin = supabaseAdmin();
    const { data: perfil } = await admin.from("profiles").select("id, display_name").eq("id", conta.id).maybeSingle();
    if (!perfil) return NextResponse.json(NAO_CADASTRADA, { status: 404 });

    const { data: existente } = await admin
      .from("establishment_members")
      .select("id, active")
      .eq("establishment_id", loja.id)
      .eq("profile_id", perfil.id)
      .maybeSingle();

    if (existente?.active) {
      return NextResponse.json({ erro: "essa pessoa já faz parte da equipe" }, { status: 409 });
    }

    // Reativa em vez de duplicar: quem já passou pela loja mantém o mesmo
    // vínculo, e o histórico de venda carimbada por essa conta continua
    // apontando para a mesma linha.
    const { data: membro, error } = existente
      ? await admin
          .from("establishment_members")
          .update({ role: papel, active: true })
          .eq("id", existente.id)
          .select("id, role, active")
          .single()
      : await admin
          .from("establishment_members")
          .insert({ establishment_id: loja.id, profile_id: perfil.id, role: papel })
          .select("id, role, active")
          .single();

    if (error || !membro) return NextResponse.json({ erro: "não foi possível adicionar à equipe" }, { status: 500 });

    return NextResponse.json({
      id: membro.id,
      nome: perfil.display_name,
      email: conta.email ?? email,
      papel: membro.role,
      ativo: membro.active,
      souEu: false,
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao adicionar à equipe" }, { status: 500 });
  }
}
