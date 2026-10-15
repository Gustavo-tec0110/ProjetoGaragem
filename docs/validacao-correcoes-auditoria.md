# Validação final das correções A1–A4 — 13/10/2026

## Escopo e isolamento

- Worktree: `/home/gustavo/Área de trabalho/ProjetoGaragem-performance-etapa-1`; branch `codex/performance-etapa-1`; HEAD `45da12b79891a244678abf54c66d7e2bd9205b0a`.
- O estado inicial continha alterações de performance, autenticação, auditoria e testes sem stage. Elas foram preservadas. Não houve commit, push, merge, deploy, build remoto ou edição de outra worktree.
- `docs/correcoes-auditoria-2026-10-13.md` e o status do Git foram lidos antes do trabalho. Os guias locais do Next 16.3.3 sobre Route Handlers e Server Actions também foram consultados.
- **Não havia Supabase isolado executável:** nesta worktree, `NEXT_PUBLIC_SUPABASE_URL`, chave pública e usuários E2E estavam vazios; `supabase`, Docker, Podman e PostgreSQL local não estavam instalados. A `.env.local` continha apenas uma chave de serviço, sem URL. Não foi usada. Os comandos de Playwright e build receberam URL, chave pública e chave de serviço explicitamente vazias. Nenhuma operação de leitura ou escrita foi enviada ao Supabase de produção.

## Alterações desta validação

- Em `actions.ts`, criação, edição e exclusão exigem uma linha retornada pelo banco para declarar sucesso. Isso detecta atualização/exclusão que afeta zero linhas. Após mover uma foto temporária, falha na geração da URL ou na gravação tenta compensar removendo a foto final **somente após a consulta privilegiada confirmar ausência de referência**.
- A rotina de exclusão por referência agora falha fechada também quando a consulta ou a remoção lança uma exceção, sem excluir por suposição.
- Testes novos exercitam as ações com cliente autenticado e banco/storage **simulados em memória**, incluindo sucesso, falha do `move`, falha/lançamento/zero linhas na gravação, troca de foto, exclusão, caminho de outro usuário e ausência de sessão. Testes de interface novos cobrem substituição, cancelamento e upload recusado com rota de upload simulada. Esses testes não equivalem à validação real de RLS, Storage ou OAuth.

## Resultado por achado

| Achado | Resultado nesta validação | Limite restante |
|---|---|---|
| A1 — foto temporária versus registro | Fluxos e compensação passaram em testes simulados. O caminho final respeita a restrição SQL e a ação não anuncia sucesso se zero linhas forem gravadas. | **Não confirmado ponta a ponta**: sem projeto, usuários e Storage em Supabase isolado, não foi possível testar o `move` real, RLS, persistência real e falhas reais de banco. Storage e banco não compartilham transação; interrupção do processo ou falha da compensação ainda podem deixar objeto final órfão. |
| A2 — redirecionamento `next` | Testes unitários aceitam caminhos internos com query/fragmento e rejeitam URL externa, `//`, barras invertidas, controles, separadores codificados e normalização perigosa. | Login/callback OAuth com sessão real não foi executado. A regra de código está validada; comportamento completo da autenticação permanece pendente. |
| A3 — temporários abandonados | Cancelamento, substituição e falha de upload foram exercitados na interface simulada; limpeza restrita ao dono, a caminhos temporários, sem referência e com 24 h de idade passou em unidade. Consulta/remoção com exceção falha fechada. | **Parcial**: a reconciliação depende do retorno do proprietário e examina até 20 objetos por visita; contas que nunca retornam não são cobertas. Um editor aberto por mais de 24 h em outra aba pode ainda usar um temporário elegível. Não foi implantado processo periódico sem infraestrutura isolada para verificar concorrência e propriedade. |
| A4 — lint | `npm run lint` completo passou. | Nenhum bloqueio de lint conhecido. |

## Execuções e evidências

| Comando/cenário | Resultado |
|---|---|
| `node --test tests/unit/*.test.mjs` | **9/9 passaram**. Inclui caminhos, redirecionamentos, elegibilidade da limpeza e ações simuladas com compensação. |
| Playwright desktop Chromium: `modification-photos.spec.ts` e `public.spec.ts` | 6 passaram no primeiro lote; o único erro foi o monitor genérico que tratou o HTTP 400 esperado do upload recusado como erro de runtime. Após limitar a exceção a esse 400 intencional, o cenário foi repetido e passou. **7 cenários aprovados ao todo.** |
| `npm run typecheck` | Passou. |
| `npm run lint` | Passou após o término do Playwright. A primeira tentativa coincidiu com a recriação de `test-results` e falhou com `ENOENT`; uma tentativa posterior apontou o import de `URL` faltante no teste novo, corrigido antes do resultado final. |
| `NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= SUPABASE_SERVICE_ROLE_KEY= npm run build` | Passou localmente, compilação, TypeScript e 38 páginas estáticas. Nenhum build remoto. |
| `git diff --check` | Passou. |

Os testes de interface usaram o harness local condicionado a `MODIFICATION_PHOTOS_TEST_HARNESS=1`, com POST/DELETE de upload interceptados. O smoke público não dependeu de conta autenticada. A advertência do Next sobre qualidade de imagem 88 fora de `[75, 85]` apareceu no servidor de desenvolvimento; não causou falha de teste ou build e não foi tratada neste escopo.

## Validação real pendente em ambiente isolado

Preparar uma instância **local ou descartável**, com URL e chaves verificadas como pertencentes a ela, migrations aplicadas, catálogo, dois usuários de teste e um projeto de teste. Antes de rodar qualquer exclusão, confirmar o host do endpoint e o identificador do projeto; nunca substituir pela instância de produção. Executar:

1. Login, logout, acesso do proprietário e negação ao segundo usuário; testar `next` interno e externo em login/callback.
2. Criar modificação com imagem real; verificar no banco que `project_photo_storage_path` é definitivo, que o objeto existe nesse caminho e que o temporário desapareceu.
3. Editar/substituir/remover foto e excluir modificação; conferir linha, URL, objeto novo, objeto antigo e ausência de referências quebradas após cada passo.
4. Cancelar upload e induzir falha de upload; verificar que não surge linha nem objeto persistido. Enviar caminho temporário e definitivo de outro usuário diretamente à ação/DELETE e confirmar rejeição sem mudanças.
5. Induzir falha do `move` e da escrita no banco após `move`; conferir os dois lados da compensação, inclusive falha da consulta de referência. Repetir com tentativas concorrentes de edição e com zero linhas afetadas.

Para contas inativas, a solução verificável futura é registrar uma **lease de edição** com proprietário, caminho temporário e prazo renovado enquanto o editor estiver aberto. Um executor periódico já disponível na infraestrutura deve processar lotes pequenos, em modo de inspeção primeiro, somente objetos com mais de 48 h, caminho válido e dono confirmado, sem lease ativa e sem referência em `project_modifications`. Antes de cada exclusão, repetir as checagens; registrar caminho e resultado, e tolerar objeto já ausente para permitir repetição. Testar no Supabase isolado com editor ativo, referência criada entre listagem e remoção, falha de consulta e múltiplas execuções. A infraestrutura de execução e a lease não foram implementadas aqui porque não há ambiente isolado para verificar essas garantias. Nenhum objeto real de produção foi excluído.

## Prontidão

**A4 está resolvido nos gates locais; A2 está validado em unidade, mas não em autenticação real. A1 não está confirmado em Storage/banco reais; A3 continua parcial para contas inativas e editores prolongados.** Os testes locais, lint, typecheck e build estão verdes, e as otimizações anteriores permanecem no estado da worktree. **A branch ainda não está pronta para integração local final** até concluir os testes autenticados no Supabase isolado e decidir/validar a limpeza periódica segura.
