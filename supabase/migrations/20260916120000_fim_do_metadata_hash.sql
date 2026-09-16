-- Tira a última coluna que só existia por causa da blockchain.
--
-- `metadata_hash` guardava o keccak do JSON de metadados que o contrato
-- apontava, para conferir que o que estava no IPFS batia com o que estava no
-- banco. A migration `fim_da_carteira` derrubou `onchain_id` e
-- `onchain_tx_hash`, mas esta escapou: sem contrato não há mais o que conferir,
-- e nenhuma linha de código a lê.

alter table public.establishments    drop column if exists metadata_hash;
alter table public.achievements      drop column if exists metadata_hash;
alter table public.discount_programs drop column if exists metadata_hash;
