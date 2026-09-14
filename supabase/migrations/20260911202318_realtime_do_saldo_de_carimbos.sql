-- O celular do cliente acende "carimbo recebido" no instante em que o balcao
-- confirma. Sem isto o cliente precisaria recarregar a tela na frente do
-- atendente para acreditar que funcionou.
--
-- So o cache de saldo entra na publicacao: `sales` carrega valor de compra e
-- nao precisa trafegar em tempo real para ninguem.
alter publication supabase_realtime add table public.stamp_balances_cache;

-- O Realtime precisa da linha inteira no evento de UPDATE para o cliente ver
-- o saldo novo; sem REPLICA IDENTITY FULL vem so a chave primaria.
alter table public.stamp_balances_cache replica identity full;;
