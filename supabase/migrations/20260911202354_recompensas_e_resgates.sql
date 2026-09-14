-- O catalogo de recompensas e o registro de entrega.
--
-- O RewardCatalog on-chain guarda o que precisa ser provado: custo, estoque e
-- que o resgate aconteceu. Foto, nome e texto vivem aqui -- nao faz sentido
-- pagar gas para guardar a descricao de um pao de queijo.

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  -- Preenchido quando a recompensa entra no contrato. Nulo = rascunho.
  onchain_id bigint unique,
  title text not null,
  description text,
  image_path text,
  -- Custo em selos da loja e em pontos da rede. Pelo menos um tem que ser > 0:
  -- recompensa de graca seria um botao de estoque infinito.
  stamp_cost integer not null default 0 check (stamp_cost >= 0),
  point_type_id bigint not null default 1,
  point_cost integer not null default 0 check (point_cost >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  -- Zero = sem limite, igual ao contrato.
  max_redemptions integer not null default 0 check (max_redemptions >= 0),
  redeemed integer not null default 0 check (redeemed >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recompensa_nao_e_de_graca check (stamp_cost > 0 or point_cost > 0)
);

create index if not exists rewards_por_loja on public.rewards (establishment_id) where active;
create index if not exists rewards_por_custo on public.rewards (establishment_id, stamp_cost) where active;

create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  -- Gerado no balcao. E a chave de idempotencia contra o `usedClaimRef` do
  -- contrato: reenvio depois de queda de rede nao entrega duas vezes.
  claim_ref text not null unique,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  customer_profile_id uuid references public.profiles(id) on delete set null,
  customer_wallet text not null check (customer_wallet ~ '^0x[0-9a-f]{40}$'),
  operator_profile_id uuid references public.profiles(id) on delete set null,
  stamps_burned integer,
  points_burned integer,
  status public.status_venda not null default 'na_fila',
  tx_hash text,
  erro text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists redemptions_por_cliente on public.redemptions (customer_profile_id, created_at desc);
create index if not exists redemptions_por_loja on public.redemptions (establishment_id, created_at desc);

alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;

-- O catalogo e vitrine: qualquer pessoa ve o que da para trocar, inclusive
-- quem ainda nao tem conta. E o que faz o mapa convencer alguem a entrar.
create policy "recompensa: catalogo ativo e publico"
  on public.rewards for select
  to anon, authenticated
  using (
    active and exists (
      select 1 from public.establishments e
      where e.id = rewards.establishment_id and e.status = 'ativo'
    )
  );

create policy "recompensa: a loja ve as dela"
  on public.rewards for select
  to authenticated
  using (private.opera_loja(establishment_id));

create policy "recompensa: admin ve todas"
  on public.rewards for select
  to authenticated
  using (private.is_platform_admin());

create policy "resgate: cliente ve os proprios"
  on public.redemptions for select
  to authenticated
  using (customer_profile_id = (select auth.uid()));

create policy "resgate: loja ve os dela"
  on public.redemptions for select
  to authenticated
  using (private.opera_loja(establishment_id));

create policy "resgate: admin ve todos"
  on public.redemptions for select
  to authenticated
  using (private.is_platform_admin());

-- Nenhuma politica de INSERT/UPDATE/DELETE de proposito: toda escrita passa
-- por Route Handler com a chave secreta, que confere papel antes de gravar.

-- Desde 2026-04-28 tabela nova nao e exposta automaticamente na Data API.
grant select on public.rewards to anon, authenticated;
grant select on public.redemptions to authenticated;;
