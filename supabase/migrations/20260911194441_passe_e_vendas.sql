-- ------------------------------------------------------------ passe

-- O passe que o cliente mostra no balcao. O nonce e de uso unico: e o que
-- impede alguem fotografar a tela e usar o carimbo de outra pessoa depois.
create table public.pass_nonces (
  nonce uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- Alternativa quando a camera do caixa nao funciona. Curto de proposito:
  -- alguem digita na mao, sob pressao, com fila esperando.
  short_code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.pass_nonces is
  'Passes emitidos. Uso unico e com validade curta -- sem isso, uma foto da tela do cliente vira carimbo alheio.';

-- Busca pelo codigo curto so faz sentido entre os que ainda valem.
create index pass_nonces_short_code_idx on public.pass_nonces (short_code) where used_at is null;
create index pass_nonces_profile_idx on public.pass_nonces (profile_id, created_at desc);

alter table public.pass_nonces enable row level security;

-- Sem politica de leitura para ninguem: o passe e emitido e resolvido por rota
-- de servidor com service_role. Cliente nunca consulta esta tabela.

-- ------------------------------------------------------------ vendas

create type public.status_venda as enum ('na_fila', 'enviada', 'confirmada', 'falhou');

create table public.sales (
  id uuid primary key default gen_random_uuid(),

  -- Mesma referencia que vai para o contrato. E o que liga o registro daqui
  -- ao da blockchain, e o que torna o reenvio do PDV offline seguro.
  sale_ref text not null unique,

  establishment_id uuid not null references public.establishments (id) on delete cascade,
  operator_profile_id uuid references public.profiles (id) on delete set null,

  customer_profile_id uuid references public.profiles (id) on delete set null,
  customer_wallet text not null,

  amount_cents bigint not null check (amount_cents >= 0),
  stamps_issued integer,
  points_issued bigint,
  products jsonb not null default '[]'::jsonb,

  status public.status_venda not null default 'na_fila',
  tx_hash text,
  erro text,

  created_at timestamptz not null default now(),
  confirmed_at timestamptz,

  constraint customer_wallet_formato check (customer_wallet ~ '^0x[0-9a-f]{40}$')
);

comment on table public.sales is
  'Espelho das vendas que geraram carimbo. A blockchain e a fonte da verdade; isto aqui e cache de leitura rapida e a fila de sincronizacao do PDV.';

create index sales_establishment_idx on public.sales (establishment_id, created_at desc);
create index sales_customer_idx on public.sales (customer_profile_id, created_at desc);
create index sales_pendentes_idx on public.sales (status) where status in ('na_fila', 'enviada');

alter table public.sales enable row level security;

-- Cliente ve as proprias compras; a loja ve as dela. Um operador da loja A
-- nunca enxerga venda da loja B.
create policy "venda: cliente ve as proprias"
  on public.sales for select
  to authenticated
  using (customer_profile_id = (select auth.uid()));

create policy "venda: loja ve as dela"
  on public.sales for select
  to authenticated
  using (private.opera_loja(establishment_id));

create policy "venda: admin ve todas"
  on public.sales for select
  to authenticated
  using (private.is_platform_admin());

-- INSERT e UPDATE ficam de fora: venda so nasce por rota de servidor, que
-- confere papel, assinatura e limites antes de gravar.

-- ------------------------------------------------------------ saldos

-- Cache do que esta na blockchain, para o mapa e a carteira responderem numa
-- consulta so, sem N chamadas RPC.
create table public.stamp_balances_cache (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  wallet text not null,
  balance bigint not null default 0,
  lifetime bigint not null default 0,
  streak_current integer not null default 0,
  streak_best integer not null default 0,
  last_visit_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (establishment_id, wallet)
);

comment on table public.stamp_balances_cache is
  'Espelho de leitura do StampLedger. Nunca e fonte da verdade -- divergiu, a cadeia ganha.';

alter table public.stamp_balances_cache enable row level security;

create policy "saldo: e publico por carteira"
  on public.stamp_balances_cache for select
  to anon, authenticated
  using (true);

-- -------------------------------------------------------------- grants

grant select on public.sales to authenticated;
grant select on public.stamp_balances_cache to anon, authenticated;;
