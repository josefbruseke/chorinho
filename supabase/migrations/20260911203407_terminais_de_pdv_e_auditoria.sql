-- O balcao nao tem login.
--
-- Pedir e-mail e senha ao atendente em cada troca de turno e a forma mais
-- confiavel de o programa de fidelidade morrer: a senha vira um papel colado
-- no monitor, ou o caixa simplesmente para de carimbar. Aqui o lojista cria um
-- terminal no painel, le um codigo curto no tablet uma unica vez, e aquele
-- aparelho fica pareado.
--
-- O codigo de pareamento morre no primeiro uso; o que fica no aparelho e um
-- token longo, guardado so como hash. Perder o tablet nao vaza nada alem do
-- direito de carimbar naquela loja -- que o lojista revoga do painel.

create table if not exists public.pos_terminals (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  name text not null,
  -- So existe entre criar o terminal e parear o aparelho.
  pairing_code text unique,
  pairing_expires_at timestamptz,
  -- sha256 do token do aparelho. O token cru so existe no cookie do tablet.
  token_hash text unique,
  device_label text,
  paired_at timestamptz,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pos_terminals_por_loja on public.pos_terminals (establishment_id)
  where revoked_at is null;

-- Quantos terminais a loja pode ter ativos ao mesmo tempo.
--
-- Dez cobre com folga o comercio de bairro; quem precisa de mais paga plano
-- maior. O teto existe para o custo de relayer acompanhar o tamanho da
-- operacao, nao para atrapalhar quem tem dois caixas e um tablet reserva.
alter table public.establishments
  add column if not exists pos_limit integer not null default 10
  check (pos_limit between 1 and 200);

-- Cada carimbo passa a dizer de qual terminal saiu. E o que torna a auditoria
-- util: "o caixa 2 emitiu trinta carimbos numa terca de manha" e uma pergunta
-- que o lojista faz, e sem isto nao ha resposta.
alter table public.sales
  add column if not exists pos_terminal_id uuid references public.pos_terminals(id) on delete set null;

alter table public.redemptions
  add column if not exists pos_terminal_id uuid references public.pos_terminals(id) on delete set null;

create index if not exists sales_por_terminal on public.sales (pos_terminal_id, created_at desc);

alter table public.pos_terminals enable row level security;

create policy "terminal: a loja ve os dela"
  on public.pos_terminals for select
  to authenticated
  using (private.gerencia_loja(establishment_id));

create policy "terminal: admin ve todos"
  on public.pos_terminals for select
  to authenticated
  using (private.is_platform_admin());

-- Sem politica de escrita: criar, parear e revogar passam por Route Handler
-- com a chave secreta. O codigo de pareamento e o hash do token nunca podem
-- ser lidos pelo navegador -- nem pelo dono da loja.
revoke select (pairing_code, token_hash) on public.pos_terminals from anon, authenticated;

grant select on public.pos_terminals to authenticated;
revoke select (pairing_code, token_hash) on public.pos_terminals from authenticated;;
