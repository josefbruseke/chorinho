-- O par de coordenadas de uma loja, para o painel poder mostrar e corrigir o
-- pino. Mesma razao da funcao de escrita: o PostgREST nao le `geography`
-- diretamente, e serializar a coluna inteira devolveria um blob hexadecimal
-- que ninguem consegue conferir.
create or replace function public.posicao_do_estabelecimento(id_loja uuid)
returns table (lat double precision, lng double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select extensions.st_y(e.geog::extensions.geometry), extensions.st_x(e.geog::extensions.geometry)
  from public.establishments e
  where e.id = id_loja;
$$;

revoke execute on function public.posicao_do_estabelecimento(uuid) from anon, authenticated, public;;
