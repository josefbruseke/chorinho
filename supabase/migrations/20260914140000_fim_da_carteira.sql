-- Tira da base tudo o que só existia por causa da blockchain.
--
-- A carteira Privy nascia junto com a conta e o endereço dela era a chave de
-- todo o livro-caixa: `sales.customer_wallet`, `stamp_balances_cache.wallet`,
-- `redemptions.customer_wallet`. Sem Privy ninguém preenche `wallet_address`,
-- e o código passou a enfiar o id do perfil em colunas chamadas "wallet" —
-- funciona e mente. Esta migration acerta os nomes.
--
-- Roda com as tabelas vazias (projeto recriado em São Paulo em 14/09/2026),
-- então não há conversão de dado: é renomear, apertar e apagar.

-- ─────────────────────────────────────────── profiles

-- O `drop column` leva junto o unique e o check; tentar apagar o índice antes
-- falha, porque quem manda nele é a constraint.
alter table public.profiles drop column if exists wallet_address cascade;

comment on table public.profiles is
  'Identidade do usuário. O e-mail vive em auth.users e existe para recuperar a conta; nome e foto são opcionais. Para o lojista, o cliente é um uuid.';

-- ─────────────────────────────────────────── stamp_balances_cache
-- Deixa de ser espelho de uma cadeia e passa a ser a cartela em si. O nome
-- fica por ora: renomear a tabela é mexer em RLS, realtime e em todo o código
-- de leitura, e isso é trabalho do M9.

alter table public.stamp_balances_cache drop constraint stamp_balances_cache_pkey;
alter table public.stamp_balances_cache drop column wallet;
alter table public.stamp_balances_cache
  add column customer_profile_id uuid not null references public.profiles (id) on delete cascade;
alter table public.stamp_balances_cache
  add constraint stamp_balances_cache_pkey primary key (establishment_id, customer_profile_id);

-- ─────────────────────────────────────────── sales
-- `amount_cents` era exigência da assinatura do contrato: o caixa não digita
-- valor desde que o carimbo deixou de depender da compra, e o que ia para lá
-- era o simbólico 1. Guardar o valor da compra de alguém sem precisar dele é
-- justamente o que a política de privacidade promete não fazer.

alter table public.sales
  drop column customer_wallet,
  drop column tx_hash,
  drop column amount_cents,
  alter column customer_profile_id set not null;

-- ─────────────────────────────────────────── redemptions

alter table public.redemptions
  drop column customer_wallet,
  drop column tx_hash,
  alter column customer_profile_id set not null;

-- ─────────────────────────────────────────── achievement_claims

alter table public.achievement_claims
  drop column customer_wallet,
  drop column tx_hash,
  drop column badge_token_id,
  drop column piece_onchain_id,
  alter column customer_profile_id set not null;

-- ─────────────────────────────────────────── ids e hashes de contrato

alter table public.establishments    drop column onchain_id, drop column onchain_tx_hash;
alter table public.achievements      drop column onchain_id, drop column onchain_tx_hash;
alter table public.discount_programs drop column onchain_id, drop column onchain_tx_hash;
alter table public.pieces            drop column onchain_id, drop column onchain_tx_hash;
alter table public.rewards           drop column onchain_id;

-- O operador era identificado por endereço para assinar a transação; hoje quem
-- responde por ele é `profile_id`, que já está nesta tabela.
alter table public.establishment_members drop column operator_wallet;

-- "Por carteira" virou "por cliente": é a mesma regra, com o nome certo.
alter table public.pieces rename column max_per_wallet to max_per_customer;
