-- O balde da arte: logo e capa da loja, foto do premio, arte da peca e do selo.
--
-- Publico para leitura porque tudo aqui ja aparece numa tela publica, e URL
-- assinada em imagem de vitrine so serviria para a imagem quebrar quando a
-- assinatura vencesse no cache do navegador.
--
-- Escrita nao tem politica nenhuma, e isso e a regra: upload passa por Route
-- Handler com a chave de servico, que confere papel antes de gravar. O
-- navegador nunca escreve na Supabase neste projeto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'midia',
  'midia',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "midia: leitura publica" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'midia');;
