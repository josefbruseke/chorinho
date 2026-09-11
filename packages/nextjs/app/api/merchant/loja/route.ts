import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import type { Json, TablesUpdate } from "~~/services/database/types";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

/** As colunas editáveis pelo gestor — o resto da tabela é decisão da plataforma. */
const CAMPOS_DA_LOJA =
  "name, description, address_line, neighborhood, city, state, postal_code, phone, whatsapp, opening_hours";

/** Domingo a sábado, na ordem em que o formulário do painel exibe os dias. */
const DIAS_DA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

const TELEFONE_VALIDO = /^[0-9+()\-\s]+$/;

type ChaveDeTexto = "description" | "address_line" | "neighborhood" | "city" | "state" | "postal_code";

/** Limite de tamanho de cada texto livre — nada impede o gestor de colar um romance. */
const LIMITE_DE_TEXTO: Record<ChaveDeTexto, number> = {
  description: 500,
  address_line: 120,
  neighborhood: 60,
  city: 60,
  state: 2,
  postal_code: 9,
};

type ChaveDoFormulario = ChaveDeTexto | "name" | "phone" | "whatsapp" | "opening_hours" | "lat" | "lng";

type ValoresDaLoja = Partial<
  Pick<
    TablesUpdate<"establishments">,
    | "name"
    | "description"
    | "address_line"
    | "neighborhood"
    | "city"
    | "state"
    | "postal_code"
    | "phone"
    | "whatsapp"
    | "opening_hours"
  >
>;

/** Devolve os dados editáveis da loja do gestor autenticado. */
/**
 * O par de coordenadas da loja.
 *
 * Vem de uma função SQL porque a coluna é `geography` e o PostgREST a
 * serializaria como um blob hexadecimal — que ninguém consegue conferir num
 * formulário.
 */
const posicao = async (idDaLoja: string) => {
  const { data } = await supabaseAdmin().rpc("posicao_do_estabelecimento", { id_loja: idDaLoja });
  const ponto = data?.[0];
  return { lat: ponto?.lat ?? null, lng: ponto?.lng ?? null };
};

export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    const { data } = await supabaseAdmin().from("establishments").select(CAMPOS_DA_LOJA).eq("id", loja.id).single();

    if (!data) return NextResponse.json({ erro: "loja não encontrada" }, { status: 404 });

    return NextResponse.json({ loja: { ...data, ...(await posicao(loja.id)) } });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao carregar a loja" }, { status: 500 });
  }
}

/**
 * Grava os dados editáveis da loja.
 *
 * A posição no mapa mora numa coluna `geography`, que o PostgREST não sabe
 * escrever a partir de lat/lng puros. Quem converte é a função
 * `definir_posicao_do_estabelecimento`, que recebe dois números — e não texto
 * WKT, que seria concatenação de SQL no único lugar do schema onde ela
 * apareceria.
 */
export async function PATCH(request: NextRequest) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  // Campos como status, onchain_id, owner_profile_id, slug, featured e
  // pos_limit nunca são lidos daqui — não entram em `valores` mesmo que
  // venham no corpo, o que já cumpre "ignore esses campos se vierem".
  const valores: ValoresDaLoja = {};
  const campos: Partial<Record<ChaveDoFormulario, string>> = {};

  if ("name" in corpo) {
    const bruto = corpo.name;
    const nome = typeof bruto === "string" ? bruto.trim() : "";
    if (typeof bruto !== "string" || nome.length < 2 || nome.length > 80) {
      campos.name = "precisa ter entre 2 e 80 caracteres";
    } else {
      valores.name = nome;
    }
  }

  const texto = (chave: ChaveDeTexto) => {
    if (!(chave in corpo)) return;
    const bruto = corpo[chave];
    if (typeof bruto !== "string") {
      campos[chave] = "precisa ser texto";
      return;
    }
    const valor = bruto.trim();
    if (valor.length > LIMITE_DE_TEXTO[chave]) {
      campos[chave] = `no máximo ${LIMITE_DE_TEXTO[chave]} caracteres`;
      return;
    }
    // string vazia limpa o campo — são todas colunas opcionais de endereço
    valores[chave] = valor.length === 0 ? null : chave === "state" ? valor.toUpperCase() : valor;
  };
  (["description", "address_line", "neighborhood", "city", "state", "postal_code"] as const).forEach(texto);

  const telefone = (chave: "phone" | "whatsapp") => {
    if (!(chave in corpo)) return;
    const bruto = corpo[chave];
    if (typeof bruto !== "string") {
      campos[chave] = "precisa ser texto";
      return;
    }
    const valor = bruto.trim();
    if (valor.length === 0) {
      valores[chave] = null;
      return;
    }
    if (valor.length > 20) {
      campos[chave] = "no máximo 20 caracteres";
      return;
    }
    if (!TELEFONE_VALIDO.test(valor)) {
      campos[chave] = "use só números e os sinais + ( ) -";
      return;
    }
    valores[chave] = valor;
  };
  (["phone", "whatsapp"] as const).forEach(telefone);

  if ("opening_hours" in corpo) {
    const bruto = corpo.opening_hours;
    const valido =
      typeof bruto === "object" &&
      bruto !== null &&
      !Array.isArray(bruto) &&
      DIAS_DA_SEMANA.every(dia => {
        const entrada = (bruto as Record<string, unknown>)[dia];
        if (typeof entrada !== "object" || entrada === null) return false;
        const { fechado, abre, fecha } = entrada as Record<string, unknown>;
        if (typeof fechado !== "boolean") return false;
        if (fechado) return true;
        return (
          typeof abre === "string" && typeof fecha === "string" && HORA_VALIDA.test(abre) && HORA_VALIDA.test(fecha)
        );
      });

    if (!valido) {
      campos.opening_hours = "cada dia precisa de horário de abertura e fechamento válidos, ou marcar fechado";
    } else {
      valores.opening_hours = bruto as Json;
    }
  }

  // lat/lng são validados aqui mesmo sem gravar ainda: o gestor precisa saber
  // se o número que digitou é absurdo, não só que a gravação está pendente.
  if ("lat" in corpo) {
    const lat = corpo.lat;
    if (typeof lat !== "number" || Number.isNaN(lat) || lat < -90 || lat > 90) {
      campos.lat = "precisa estar entre -90 e 90";
    }
  }
  if ("lng" in corpo) {
    const lng = corpo.lng;
    if (typeof lng !== "number" || Number.isNaN(lng) || lng < -180 || lng > 180) {
      campos.lng = "precisa estar entre -180 e 180";
    }
  }

  if (Object.keys(campos).length > 0) {
    return NextResponse.json({ erro: "corrija os campos destacados", campos }, { status: 400 });
  }

  const pedePosicao = "lat" in corpo || "lng" in corpo;

  try {
    const loja = await lojaDoGestor(userId);

    if (Object.keys(valores).length > 0) {
      const { error } = await supabaseAdmin().from("establishments").update(valores).eq("id", loja.id);
      if (error) return NextResponse.json({ erro: "não foi possível salvar a loja" }, { status: 500 });
    }

    if (pedePosicao) {
      // As duas coordenadas andam juntas: meia posição no mapa é um pino no
      // lugar errado, que é pior que nenhum pino.
      if (typeof corpo.lat !== "number" || typeof corpo.lng !== "number") {
        return NextResponse.json(
          { erro: "informe latitude e longitude juntas", campos: { lat: "obrigatória junto com a longitude" } },
          { status: 400 },
        );
      }

      const { error } = await supabaseAdmin().rpc("definir_posicao_do_estabelecimento", {
        id_loja: loja.id,
        latitude: corpo.lat,
        longitude: corpo.lng,
      });

      if (error) {
        return NextResponse.json({ erro: "não foi possível gravar a posição no mapa" }, { status: 500 });
      }
    }

    const { data } = await supabaseAdmin().from("establishments").select(CAMPOS_DA_LOJA).eq("id", loja.id).single();
    return NextResponse.json({ loja: { ...data, ...(await posicao(loja.id)) } });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao salvar a loja" }, { status: 500 });
  }
}
