-- Chave estrangeira sem indice faz o Postgres varrer a tabela inteira a cada
-- delete do lado pai. Sao as tres que esta entrega criou.
create index on public.achievements (piece_id);
create index on public.rewards (piece_id);
create index on public.achievement_claims (customer_profile_id);;
