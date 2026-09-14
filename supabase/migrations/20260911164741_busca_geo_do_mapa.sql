-- Busca por raio, ordenada por distancia. SECURITY INVOKER de proposito: roda
-- com as permissoes de quem chama, entao a RLS de establishments continua
-- valendo e so loja ativa aparece para visitante.
create or replace function public.nearby_establishments(
  lat double precision,
  lng double precision,
  radius_m integer default 5000,
  cats smallint[] default null,
  lim integer default 200
)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  category smallint,
  neighborhood text,
  city text,
  logo_path text,
  cover_path text,
  featured boolean,
  lat_out double precision,
  lng_out double precision,
  distance_m double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.id,
    e.name,
    e.slug,
    e.description,
    e.category,
    e.neighborhood,
    e.city,
    e.logo_path,
    e.cover_path,
    e.featured,
    extensions.st_y(e.geog::extensions.geometry),
    extensions.st_x(e.geog::extensions.geometry),
    extensions.st_distance(e.geog, extensions.st_makepoint(lng, lat)::extensions.geography)
  from public.establishments e
  where e.geog is not null
    and extensions.st_dwithin(e.geog, extensions.st_makepoint(lng, lat)::extensions.geography, radius_m)
    and (cats is null or e.category = any (cats))
  order by 13
  limit least(greatest(lim, 1), 500);
$$;

comment on function public.nearby_establishments is
  'Lojas dentro de um raio, da mais perto para a mais longe. A RLS decide o que aparece: visitante ve so loja ativa.';

-- Consulta por retangulo visivel. O mapa usa esta quando o usuario arrasta, em
-- vez de raio: pedir raio num viewport retangular traz loja fora da tela e
-- deixa de trazer loja no canto.
create or replace function public.establishments_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  cats smallint[] default null,
  lim integer default 300
)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  category smallint,
  neighborhood text,
  city text,
  logo_path text,
  cover_path text,
  featured boolean,
  lat_out double precision,
  lng_out double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.id, e.name, e.slug, e.description, e.category,
    e.neighborhood, e.city, e.logo_path, e.cover_path, e.featured,
    extensions.st_y(e.geog::extensions.geometry),
    extensions.st_x(e.geog::extensions.geometry)
  from public.establishments e
  where e.geog is not null
    and extensions.st_intersects(
      e.geog,
      extensions.st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::extensions.geography
    )
    and (cats is null or e.category = any (cats))
  order by e.featured desc, e.name
  limit least(greatest(lim, 1), 500);
$$;

comment on function public.establishments_in_bounds is
  'Lojas dentro do retangulo visivel do mapa. Destaques primeiro.';

grant execute on function public.nearby_establishments to anon, authenticated;
grant execute on function public.establishments_in_bounds to anon, authenticated;;
