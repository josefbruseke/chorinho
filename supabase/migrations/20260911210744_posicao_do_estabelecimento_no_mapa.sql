-- Gravar a posicao da loja pelo PostgREST.
--
-- A coluna e `geography(Point,4326)`: o cliente REST nao sabe montar esse tipo,
-- e mandar texto WKT cru pela API seria abrir uma porta de injecao no unico
-- lugar do schema onde a gente concatena SQL. Uma funcao com dois numeros
-- resolve sem nenhuma dessas duas coisas.
create or replace function public.definir_posicao_do_estabelecimento(
  id_loja uuid,
  latitude double precision,
  longitude double precision
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if latitude is null or longitude is null
     or latitude < -90 or latitude > 90
     or longitude < -180 or longitude > 180 then
    raise exception 'coordenada fora do intervalo valido';
  end if;

  update public.establishments
     set geog = extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography,
         updated_at = now()
   where id = id_loja;
end;
$$;

-- SECURITY INVOKER de proposito: quem chama e o cliente de servico, que ja
-- ignora RLS, e a autorizacao de verdade acontece no Route Handler, conferindo
-- que aquela conta administra aquela loja. Expor isto ao navegador deixaria
-- qualquer visitante mover a padaria de lugar.
revoke execute on function public.definir_posicao_do_estabelecimento(uuid, double precision, double precision)
  from anon, authenticated, public;;
