-- Extensoes. Sem clausula de versao: pinar versao foi descontinuado em 2026-08-05
-- e o valor passa a ser ignorado.
create extension if not exists postgis with schema extensions;
create extension if not exists citext with schema extensions;

-- Schema privado para funcoes auxiliares. Elas sao SECURITY DEFINER porque
-- precisam ler tabelas com RLS de dentro de politicas de outras tabelas, o que
-- causaria recursao. Ficando fora do schema exposto, nao viram endpoint publico
-- -- o Postgres concede EXECUTE para PUBLIC por padrao em toda funcao nova.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  wallet_address text unique,
  display_name text,
  avatar_path text,
  locale text not null default 'pt-BR',
  accepted_privacy_version text,
  accepted_terms_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_address_formato check (
    wallet_address is null or wallet_address ~ '^0x[0-9a-f]{40}$'
  )
);

comment on table public.profiles is
  'Identidade do usuario. A carteira e derivada do login e gravada no primeiro acesso; guardamos em minusculo para o unique funcionar independente de checksum.';

alter table public.profiles enable row level security;

-- ---------------------------------------------------------- platform_admins

create table public.platform_admins (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is
  'Quem opera a plataforma. Tabela sem politica de leitura publica de proposito: quem e admin nao precisa ser descoberto por ninguem.';

alter table public.platform_admins enable row level security;

-- ------------------------------------------------------------- auxiliares

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins a
    where a.profile_id = (select auth.uid())
  );
$$;

comment on function private.is_platform_admin() is
  'Checa se quem chama e admin da plataforma. SECURITY DEFINER para nao recursionar na RLS de platform_admins; usa auth.uid() do proprio chamador, entao nao da para consultar por outro usuario.';

grant execute on function private.is_platform_admin() to authenticated;

-- --------------------------------------------------------- updated_at

create or replace function private.tocar_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function private.tocar_updated_at();

-- ---------------------------------------------------------- politicas

-- O proprio dono le e edita seu perfil. Sem politica para anon: perfil nao e
-- dado publico.
create policy "perfil: dono le"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "perfil: dono edita"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "perfil: admin le todos"
  on public.profiles for select
  to authenticated
  using (private.is_platform_admin());

-- INSERT nao tem politica: o perfil nasce por trigger no cadastro, com
-- service_role. Cliente nunca cria perfil direto.

create policy "admins: admin le"
  on public.platform_admins for select
  to authenticated
  using (private.is_platform_admin());

-- ------------------------------------------------- perfil no cadastro

create or replace function private.criar_perfil_do_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_path)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function private.criar_perfil_do_novo_usuario() is
  'Cria o perfil junto com a conta. Le raw_user_meta_data apenas para nome e foto -- nunca para decisao de autorizacao, porque esse campo e editavel pelo proprio usuario.';

create trigger criar_perfil_ao_cadastrar
  after insert on auth.users
  for each row execute function private.criar_perfil_do_novo_usuario();

-- -------------------------------------------------------------- grants
-- Desde 2026-04-28 tabela nova do schema public NAO e exposta a Data API
-- automaticamente. Sem estes grants o cliente recebe 404, mesmo com RLS certa.

grant select, update on public.profiles to authenticated;
grant select on public.platform_admins to authenticated;;
