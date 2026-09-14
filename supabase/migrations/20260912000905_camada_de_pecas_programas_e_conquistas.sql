-- A camada de colecionaveis, espelhada do contrato.
--
-- A cadeia guarda o que precisa ser inegavel: quem e dono, quanto desconta, em
-- que loja vale, quantas sairam. Aqui fica o que precisa ser legivel: o nome, a
-- arte, a descricao, o criterio escrito em portugues. Cada tabela carrega
-- `onchain_id` para as duas metades se encontrarem.

create type status_membro_programa as enum ('convidada', 'aceita', 'saiu');

-- ------------------------------------------------------------- programas

create table public.discount_programs (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  onchain_id bigint unique,
  name text not null,
  description text,
  kind smallint not null default 0 check (kind in (0, 1)),
  base_benefit integer not null check (base_benefit > 0),
  cap_cents integer not null default 0 check (cap_cents >= 0),
  product text,
  starts_at timestamptz,
  ends_at timestamptz,
  joint boolean not null default false,
  active boolean not null default true,
  metadata_hash bytea,
  onchain_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint janela_coerente check (ends_at is null or starts_at is null or ends_at > starts_at)
);

comment on table public.discount_programs is
  'A regra nomeada que a loja cria: "Clube da Manha, 15%, ate R$ 20". A peca aponta para ela, entao ajustar o programa muda todas as pecas ja emitidas sem reemitir nenhuma.';
comment on column public.discount_programs.kind is '0 = percentual (base em pontos-base), 1 = valor fixo (base em centavos).';
comment on column public.discount_programs.product is 'Produto especifico. Nulo = vale na loja toda. Na cadeia e o keccak deste texto.';
comment on column public.discount_programs.joint is 'Programa conjunto: aceita lojas vizinhas na pool, mediante convite e aceite.';

create index on public.discount_programs (establishment_id);

-- ------------------------------------------------------------- a pool

create table public.program_members (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.discount_programs (id) on delete cascade,
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  status status_membro_programa not null default 'convidada',
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (program_id, establishment_id)
);

comment on table public.program_members is
  'Quem foi convidado para um programa conjunto e quem aceitou. A peca so vale em quem esta "aceita" -- sem aceite, uma loja obrigaria a vizinha a dar desconto sem ela saber.';

create index on public.program_members (establishment_id);

-- ---------------------------------------------------------------- pecas

create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.discount_programs (id) on delete cascade,
  onchain_id bigint unique,
  title text not null,
  description text,
  image_path text,
  level integer not null default 1 check (level > 0),
  max_supply integer not null default 0 check (max_supply >= 0),
  max_per_wallet integer not null default 0 check (max_per_wallet >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  onchain_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint janela_coerente check (ends_at is null or starts_at is null or ends_at > starts_at)
);

comment on table public.pieces is
  'A peca colecionavel. E a UNICA coisa deste sistema que se transfere: carimbo, ponto e selo de conquista sao pessoais.';
comment on column public.pieces.level is 'O "valor" da peca dentro do programa: bronze 1, ouro 3. O beneficio e a base do programa vezes o nivel, limitado pelo teto.';
comment on column public.pieces.max_supply is 'A tiragem. 0 = sem limite, mas exclusividade e o ponto: o painel sempre sugere um numero.';

create index on public.pieces (program_id);

-- ------------------------------------------------------------ conquistas

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  onchain_id bigint unique,
  title text not null,
  description text,
  image_path text,
  criterion smallint not null check (criterion between 0 and 4),
  target bigint not null check (target > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_winners integer not null default 0 check (max_winners >= 0),
  winners integer not null default 0 check (winners >= 0),
  piece_id uuid references public.pieces (id) on delete set null,
  grants_badge boolean not null default true,
  route_id bigint not null default 0,
  active boolean not null default true,
  metadata_hash bytea,
  onchain_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint janela_coerente check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint entrega_alguma_coisa check (grants_badge or piece_id is not null)
);

comment on table public.achievements is
  'O criterio que a loja define e que a cadeia confere sozinha: "quem vier 10 vezes", "quem mantiver 3 semanas de sequencia".';
comment on column public.achievements.criterion is
  'Espelha Achievements.Criterion: 0 carimbos de sempre, 1 sequencia atual, 2 visitas, 3 gasto total em centavos, 4 venda avulsa (a unica atestada pelo servidor).';
comment on constraint entrega_alguma_coisa on public.achievements is
  'Conquista que nao entrega nada e so uma barra de progresso: o cliente chega no fim e nao ganha coisa alguma.';

create index on public.achievements (establishment_id);

create table public.achievement_claims (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  claim_ref text not null unique,
  customer_profile_id uuid references public.profiles (id) on delete set null,
  customer_wallet text not null,
  badge_token_id bigint,
  piece_onchain_id bigint,
  status status_venda not null default 'na_fila',
  tx_hash text,
  erro text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (achievement_id, customer_wallet)
);

comment on table public.achievement_claims is
  'Reivindicacoes de conquista. O `claim_ref` e o mesmo papel do `sale_ref`: o servidor reenvia depois de uma queda de rede e isto impede entregar duas vezes.';

create index on public.achievement_claims (customer_wallet);

-- --------------------------------------------- o gatilho direto no catalogo

alter table public.rewards
  add column piece_id uuid references public.pieces (id) on delete set null;

comment on column public.rewards.piece_id is
  'A peca entregue junto do premio. Nulo = premio comum. E o gatilho direto: o cliente gasta os proprios carimbos e leva a peca.';

-- ------------------------------------------------------------- updated_at

create trigger tocar_updated_at before update on public.discount_programs
  for each row execute function private.tocar_updated_at();
create trigger tocar_updated_at before update on public.pieces
  for each row execute function private.tocar_updated_at();
create trigger tocar_updated_at before update on public.achievements
  for each row execute function private.tocar_updated_at();

-- ------------------------------------------------------------------- RLS
--
-- So leitura, como no resto do schema: toda escrita passa por Route Handler
-- com a chave de servico, que confere papel antes de gravar. Nao ha politica
-- de INSERT/UPDATE aqui de proposito -- se aparecer uma, e bug.

alter table public.discount_programs enable row level security;
alter table public.program_members enable row level security;
alter table public.pieces enable row level security;
alter table public.achievements enable row level security;
alter table public.achievement_claims enable row level security;

create policy "programa: ativo de loja ativa e publico" on public.discount_programs
  for select to anon, authenticated
  using (
    active and exists (
      select 1 from public.establishments e
      where e.id = discount_programs.establishment_id and e.status = 'ativo'
    )
  );

create policy "programa: a loja ve os dela" on public.discount_programs
  for select to authenticated using (private.opera_loja(establishment_id));

create policy "programa: a convidada ve o que recebeu" on public.discount_programs
  for select to authenticated
  using (
    exists (
      select 1 from public.program_members m
      where m.program_id = discount_programs.id and private.opera_loja(m.establishment_id)
    )
  );

create policy "programa: admin ve todos" on public.discount_programs
  for select to authenticated using (private.is_platform_admin());

create policy "pool: publica" on public.program_members
  for select to anon, authenticated using (true);

create policy "peca: ativa de programa publico e publica" on public.pieces
  for select to anon, authenticated
  using (
    active and exists (
      select 1 from public.discount_programs p
      join public.establishments e on e.id = p.establishment_id
      where p.id = pieces.program_id and e.status = 'ativo'
    )
  );

create policy "peca: a loja ve as dela" on public.pieces
  for select to authenticated
  using (
    exists (
      select 1 from public.discount_programs p
      where p.id = pieces.program_id and private.opera_loja(p.establishment_id)
    )
  );

create policy "peca: admin ve todas" on public.pieces
  for select to authenticated using (private.is_platform_admin());

create policy "conquista: ativa de loja ativa e publica" on public.achievements
  for select to anon, authenticated
  using (
    active and exists (
      select 1 from public.establishments e
      where e.id = achievements.establishment_id and e.status = 'ativo'
    )
  );

create policy "conquista: a loja ve as dela" on public.achievements
  for select to authenticated using (private.opera_loja(establishment_id));

create policy "conquista: admin ve todas" on public.achievements
  for select to authenticated using (private.is_platform_admin());

create policy "reivindicacao: o cliente ve as proprias" on public.achievement_claims
  for select to authenticated using (customer_profile_id = (select auth.uid()));

create policy "reivindicacao: a loja ve as dela" on public.achievement_claims
  for select to authenticated
  using (
    exists (
      select 1 from public.achievements a
      where a.id = achievement_claims.achievement_id and private.opera_loja(a.establishment_id)
    )
  );

create policy "reivindicacao: admin ve todas" on public.achievement_claims
  for select to authenticated using (private.is_platform_admin());;
