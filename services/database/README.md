# Camada de dados (Supabase)

`types.ts` é **gerado**, não escrito à mão. Para regenerar depois de mudar o
schema, use o MCP da Supabase (`generate_typescript_types`) ou a CLI:

```bash
supabase gen types typescript --project-id jzljyfyxybcpidvgsgaa > services/database/types.ts
```

Regra que não se quebra: **nenhuma escrita sai do navegador.** O cliente do
browser usa a chave publishable e só enxerga o que a RLS permitir — leitura e
Realtime. Todo INSERT/UPDATE passa por Route Handler no servidor, que valida
papel antes de escrever.
