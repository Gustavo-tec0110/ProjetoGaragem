# Projeto Garagem — correções da auditoria (13/10/2026)

## Estado preservado

- Worktree: `/home/gustavo/Área de trabalho/ProjetoGaragem-performance-etapa-1`.
- Branch: `codex/performance-etapa-1`; HEAD inicial `45da12b79891a244678abf54c66d7e2bd9205b0a`.
- Antes das correções havia nove arquivos de aplicação modificados sem stage, o formulário de login novo e documentação/evidências não rastreadas. Nada foi descartado, commitado, enviado ou integrado. Nenhuma outra worktree ou branch foi alterada.
- As evidências e os quatro achados foram lidos em `docs/auditoria-independente-performance-2026-10-13.md` antes das edições. Também foram consultados os guias locais de Route Handlers e Server Actions do Next 16.3.3.

## A1 — fotos de modificações

O upload agora entrega um caminho temporário `usuario/pending-modifications/uuid.webp`. A validação usa a mesma regra de caminho do gerador, exige UUIDs bem formados, proprietário exato, diretório permitido e extensão WebP minúscula. Ao criar ou editar, a ação autenticada confirma o dono do projeto, move o arquivo para `usuario/modifications/uuid.webp` e grava apenas esse caminho definitivo, compatível com a restrição SQL existente. Criação não aceita caminhos definitivos arbitrários; edição só aceita a foto definitiva já vinculada ao registro ou um novo temporário da conta.

Arquivos: `src/lib/modifications/photo-path.ts`, `src/lib/supabase/storage.ts`, `src/app/projeto/[slug]/modificacoes/actions.ts`.

Evidência: testes unitários cobrem o caminho produzido pelo gerador, finalização, usuário diferente, extensão/diretório inválidos, barra invertida e travessia de diretório. A validação pura passou em 5/5 testes junto dos cenários A2/A3. O build local passou com a migration existente intacta.

## A2 — parâmetro `next` da autenticação

`getSafeNextPath` rejeita URLs absolutas, `//`, barras invertidas, controles e separadores codificados. A função resolve e normaliza o destino, verifica a origem e repete a checagem no caminho final devolvido. Isso cobre também segmentos `..` que se transformariam em `//` após a normalização. O fallback é `/garagem`.

Arquivo: `src/lib/auth/redirect.ts`.

Evidência: testes unitários verificam URLs externas, barras invertidas literais/codificadas, controles, barras codificadas, normalização de `..` e caminhos internos legítimos com query e fragmento. Todos os resultados aceitos permanecem na origem usada pelo callback. A correção foi feita apenas nesta worktree, embora o defeito exista em `main`.

## A3 — uploads órfãos

- O editor pede exclusão do temporário ao cancelar, remover ou substituir a foto, ao desmontar o componente e quando o salvamento falha. Respostas de upload que chegam após fechar ou trocar o editor também são descartadas. O botão de salvar espera o upload terminar.
- A rota `DELETE /api/uploads/image` exige sessão e aceita somente caminhos temporários da própria conta. Antes de excluir, uma consulta privilegiada verifica se existe referência em `project_modifications`; erro na consulta bloqueia a exclusão.
- Ao salvar, a foto é movida para o diretório definitivo. Erro ou exceção do banco tenta remover a foto final somente se não houver referência. Fotos antigas removidas por edição/exclusão passam pela mesma checagem.
- Em visita do proprietário à página de modificações ou novo upload, uma reconciliação limitada examina até 20 temporários mais antigos da própria conta e limpa os que têm pelo menos 24 horas. Ela não varre nem exclui em massa o bucket. A consulta da página e a reconciliação correm em paralelo para reduzir atraso dessa visita.

Arquivos: `src/lib/modifications/photo-path.ts`, `src/lib/modifications/photo-storage.ts`, `src/app/api/uploads/image/route.ts`, `src/app/projeto/[slug]/modificacoes/actions.ts`, `src/app/projeto/[slug]/modificacoes/page.tsx`, `src/components/projects/project-modifications.tsx`.

Evidência: testes unitários cobrem idade, proprietário, caminho temporário/definitivo, foto referenciada e falha de leitura do banco. Dois testes funcionais com upload interceptado por mock confirmam limpeza no cancelamento e na falha de gravação, além da preservação de foto já persistida ao cancelar edição. Nenhuma operação atingiu banco ou storage de produção.

Limitações: a reconciliação depende de o proprietário voltar à página ou iniciar outro upload. Objetos temporários de contas que nunca retornam precisam de um processo operacional futuro, desenhado e validado em ambiente isolado, antes de qualquer limpeza periódica. Um encerramento abrupto do processo do servidor entre o `move` e a confirmação no banco também pode deixar uma foto final sem vínculo; não foi implementada varredura de fotos definitivas porque uma exclusão concorrente sem coordenação transacional poderia apagar uma foto válida. Nenhuma exclusão de objetos de produção foi executada.

## A4 — lint

Removidos o import não usado `ImageIcon` e a variável desestruturada `source`, mantendo a prop pública de `ProjectRankingsBoard` para seus consumidores.

Arquivos: `src/components/projects/project-modifications.tsx`, `src/components/projects/project-rankings-board.tsx`.

Evidência: `npm run lint` completo passou sem erros.

## Validação local

| Verificação | Resultado |
|---|---|
| `node --test tests/unit/audit-fixes.test.mjs` | 5 passaram; caminhos, redirecionamento e segurança da limpeza. |
| Playwright `tests/e2e/modification-photos.spec.ts`, desktop Chromium | 2 passaram com upload simulado e Supabase desabilitado. |
| Playwright `tests/e2e/public.spec.ts`, desktop Chromium | 3 passaram; Inicial, Explorar, busca e estado de slug removido. |
| Playwright `tests/e2e/project-modifications.spec.ts` | 1 pulado: o ambiente isolado não tem projeto publicado. |
| `npm run typecheck` | Passou. |
| `npm run lint` | Passou. |
| `npm run build` com `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=` e `SUPABASE_SERVICE_ROLE_KEY=` vazios | Passou localmente; nenhuma operação remota de build. |
| `git diff --check` | Passou. |

O harness e os testes novos ficam em `src/app/test-harness/modification-photos/page.tsx`, `tests/unit/audit-fixes.test.mjs` e `tests/e2e/modification-photos.spec.ts`; o harness exige `MODIFICATION_PHOTOS_TEST_HARNESS=1` e está indisponível sem essa variável. `playwright.config.ts` a habilita apenas no servidor local de teste. Um primeiro smoke falhou por elementos do próprio harness encobertos pelo cabeçalho e por um seletor ambíguo; ambos foram corrigidos e a repetição dos dois cenários passou.

## Regressões e prontidão

As mudanças de prefetch, divisão Server/Client do login, template de layout, consentimento e demais otimizações anteriores foram preservadas. Os smokes públicos passaram; não houve nova medição causal de LCP, TBT ou navegação autenticada, portanto não se afirma ganho ou ausência de regressão de desempenho em campo.

Ainda dependem de testes autenticados em projeto **isolado**: upload real normalizado, criação/edição/exclusão com foto, políticas RLS, comportamento do Storage `move`, OAuth/callback completo e falha real de banco após upload. Também falta definir uma reconciliação operacional segura para contas que não retornam. Assim, os gates locais de código estão verdes, mas a branch **ainda não deve ser tratada como plenamente pronta para integração local final** sem esses testes e a decisão sobre a limpeza periódica. Não foi feito commit, push, merge, deploy ou alteração de dados reais.
