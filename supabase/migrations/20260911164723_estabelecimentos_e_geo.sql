-- ------------------------------------------------------- estabelecimentos

create type public.status_estabelecimento as enum ('rascunho', 'pendente', 'ativo', 'suspenso');

create table public.establishments (
  id uuid primary key default gen_random_uuid(),

  -- O registry on-chain so atribui id quando o admin aprova a loja (M3). O PK
  -- precisa existir antes disso, entao o id da cadeia entra depois, separado.
  onchain_id bigint unique,

  owner_profile_id uuid references public.profiles (id) on delete set null,

  name text not null,
  slug text not null unique,
  description text,

  -- Espelha o enum Category do DiscountNFT.sol e o CATEGORIES de utils/vitrine.ts
  category smallint not null default 0 check (category between 0 and 4),

  phone text,
  whatsapp text,

  address_line text,
  neighborhood text,
  city text,
  state text,
  postal_code text,
  geog extensions.geography (Point, 4326),

  logo_path text,
  cover_path text,
  opening_hours jsonb not null default '{}'::jsonb,

  status public.status_estabelecimento not null default 'rascunho',
  featured boolean not null default false,

  metadata_hash bytea,
  onchain_tx_hash text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.establishments is
  'Loja parceira. O catalogo, as fotos e a posicao vivem aqui; carimbos e resgates vivem na blockchain.';
comment on column public.establishments.onchain_id is
  'Id atribuido pelo EstablishmentRegistry na aprovacao. Nulo enquanto a loja nao foi para a cadeia.';
comment on column public.establishments.geog is
  'Posicao no mapa. geography e nao geometry: distancia em metros direto, sem escolher projecao.';

-- Busca por raio e por bbox passam por aqui; sem o GIST o mapa faz varredura
-- completa a cada arrasto.
create index establishments_geog_idx on public.establishments using gist (geog);
create index establishments_status_idx on public.establishments (status) where status = 'ativo';
create index establishments_owner_idx on public.establishments (owner_profile_id);

alter table public.establishments enable row level security;

create trigger establishments_updated_at
  before update on public.establishments
  for each row execute function private.tocar_updated_at();

-- ------------------------------------------------------------- equipe

create type public.papel_membro as enum ('owner', 'manager', 'operator');

create table public.establishment_members (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.papel_membro not null default 'operator',
  operator_wallet text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (establishment_id, profile_id),
  constraint operator_wallet_formato check (
    operator_wallet is null or operator_wallet ~ '^0x[0-9a-f]{40}$'
  )
);

comment on table public.establishment_members is
  'Quem pode operar cada loja. E daqui que sai o papel injetado no token -- um atendente nao e uma conta separada, e um vinculo.';

create index establishment_members_profile_idx on public.establishment_members (profile_id) where active;

alter table public.establishment_members enable row level security;

-- ----------------------------------------------------------- auxiliares

create or replace function private.papel_na_loja(loja uuid)
returns public.papel_membro
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.establishment_members m
  where m.establishment_id = loja
    and m.profile_id = (select auth.uid())
    and m.active
  limit 1;
$$;

comment on function private.papel_na_loja(uuid) is
  'Papel de quem chama numa loja, ou nulo. SECURITY DEFINER para nao recursionar na RLS de establishment_members. Le sempre auth.uid(), nunca um usuario arbitrario.';

create or replace function private.gerencia_loja(loja uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.papel_na_loja(loja) in ('owner', 'manager');
$$;

create or replace function private.opera_loja(loja uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.papel_na_loja(loja) is not null;
$$;

grant execute on function private.papel_na_loja(uuid) to authenticated;
grant execute on function private.gerencia_loja(uuid) to authenticated;
grant execute on function private.opera_loja(uuid) to authenticated;

-- ----------------------------------------------------------- politicas

-- Loja ativa e vitrine publica: precisa aparecer no mapa para quem nem entrou.
create policy "loja: ativa e publica"
  on public.establishments for select
  to anon, authenticated
  using (status = 'ativo');

create policy "loja: membro ve a propria"
  on public.establishments for select
  to authenticated
  using (private.opera_loja(id));

create policy "loja: admin ve todas"
  on public.establishments for select
  to authenticated
  using (private.is_platform_admin());

-- USING diz quais linhas podem ser alteradas; WITH CHECK impede que a alteracao
-- transfira a loja para outro dono.
create policy "loja: gerente edita"
  on public.establishments for update
  to authenticated
  using (private.gerencia_loja(id))
  with check (private.gerencia_loja(id));

create policy "loja: admin edita"
  on public.establishments for update
  to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy "equipe: membro ve os colegas"
  on public.establishment_members for select
  to authenticated
  using (private.opera_loja(establishment_id));

create policy "equipe: gerente administra"
  on public.establishment_members for all
  to authenticated
  using (private.gerencia_loja(establishment_id))
  with check (private.gerencia_loja(establishment_id));

create policy "equipe: admin administra"
  on public.establishment_members for all
  to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

-- INSERT de loja fica de fora: cadastro passa por rota de servidor, que valida
-- plano e limites antes de criar.

-- -------------------------------------------------------------- grants

grant select on public.establishments to anon, authenticated;
grant update on public.establishments to authenticated;
grant select, insert, update, delete on public.establishment_members to authenticated;;
