# Projeto Garagem — otimização de performance, etapa 3

**Data:** 13/10/2026. **Ambiente:** exclusivamente local. Nenhum commit, push, merge, deploy, build remoto ou alteração de configuração de produção.

## 1. Estado inicial e continuidade

A worktree correta é `/home/gustavo/Área de trabalho/ProjetoGaragem-performance-etapa-1`, na branch `codex/performance-etapa-1`, HEAD `45da12b79891a244678abf54c66d7e2bd9205b0a`. O checkout aberto por padrão em `/home/gustavo/Área de trabalho/ProjetoGaragem` está em outra branch e não foi alterado nesta etapa. No início não havia arquivos staged. Já estavam modificados, sem commit: `src/app/(auth)/login/page.tsx`, `src/app/page.tsx`, `src/app/privacy/page.tsx`, `src/app/template.tsx`, `src/app/terms/page.tsx`, `src/components/privacy/cookie-consent.tsx`, `src/components/site/site-footer.tsx` e `src/components/site/site-navbar.tsx`. Já existiam arquivos novos de login e relatórios/evidências das etapas 1 e 2, da continuação de performance e do trabalho de cookies/jurídico. Todos foram preservados.

Foram lidos os relatórios `docs/otimizacao-performance-etapa-1.md`, `docs/otimizacao-performance-etapa-2.md`, `docs/otimizacao-performance-etapa-2-continuacao.md` e os relatórios de investigação de 12/10 no checkout original. Também foram consultados os JSONs Lighthouse, capturas Playwright, rastreamentos CDP da continuação e o código local. As etapas anteriores já haviam limitado prefetch de `/criar-projeto` na Inicial/Login/Cadastro, separado a casca Server do login e corrigido o deslocamento do rodapé com `pg-route-enter min-h-screen flex-none`. As tentativas rejeitadas nas etapas anteriores continuaram revertidas. A documentação local do Next 16.3.3 sobre `template.tsx`, limites Server/Client e `Link` foi consultada antes da edição.

## 2. Método de medição

Cada variante foi compilada com `npm run build` e servida por `next start` em `http://127.0.0.1:3101`. O [script reproduzível](evidencias-otimizacao-performance-etapa-3/benchmark.cjs) usou Lighthouse 13.5.0 e Chrome do Playwright com viewport Mobile 412×823, DPR 1, CPU ×4 simulada, RTT 150 ms, throughput 1.638,4 Kbps, método `simulate` e reset de armazenamento padrão do Lighthouse. As execuções foram sequenciais, sem testes funcionais concorrentes. Cada série principal tem cinco amostras; o build final após limpeza de imports tem três. Configurações, `BUILD_ID`, manifestos, JSONs brutos por execução e [estatísticas derivadas](evidencias-otimizacao-performance-etapa-3/statistics.json) estão em `docs/evidencias-otimizacao-performance-etapa-3/`.

As tabelas mostram medianas e amplitude mínimo–máximo. Medianas de métricas diferentes podem vir de execuções diferentes. `loadEventMs` é o evento `load` observado pelo Lighthouse, **não** o término de todos os prefetches, imagens lazy ou tarefas posteriores. Todas são métricas de laboratório; não há dados de campo, INP real ou equivalência com hardware físico modesto. Os números antigos do site publicado não são usados como baseline numérica local.

## 3. Investigação da aparente regressão de LCP em Explorar

A comparação alternou o template **atual → antigo → atual**, preservando o restante do código, com cinco execuções Lighthouse Mobile de `/explorar` por build. O template antigo usado no experimento foi exatamente `pg-route-enter min-h-0 flex-1`, conforme o diff preexistente; o arquivo atual foi salvo e restaurado integralmente. Nenhuma versão antiga do template ficou no código final.

| Variante | Score | LCP ms | Elemento LCP nas 5 execuções | CLS | TBT ms |
|---|---:|---:|---|---:|---:|
| Atual, primeira série | 64 (58–67) | 3.924 (3.542–4.513) | Descrição “Descubra builds reais...” de Explorar | 0 | 1.199 (1.084–1.334) |
| Template antigo | 71 (67–74) | 2.433 (2.407–3.150) | Frase “O lugar para documentar...” do **rodapé** | 0,000073 | 1.464 (1.128–1.514) |
| Atual, repetição | 63 (62–65) | 3.722 (3.660–3.863) | Descrição “Descubra builds reais...” de Explorar | 0 | 1.440 (1.128–1.570) |

A diferença de LCP anterior **não compara o mesmo conteúdo**: no template antigo, o rodapé entrava prematuramente na primeira tela e se tornava o elemento LCP; após a reserva de altura, o LCP é a descrição da página. O rastreamento CDP anterior já havia mostrado o rodapé da Garagem Mobile movendo-se de 345 para 823 px, e o relatório da etapa 2 registrou a eliminação do CLS de 0,337 nessa rota. O LCP antigo menor é, portanto, uma leitura favorecida pelo rodapé inicialmente mal posicionado. A série atual repetida confirma que a mudança do elemento LCP persiste. O tempo de pintura da descrição **sob o template antigo** não foi isolado; não há base para atribuir a diferença inteira a uma lentidão real da descrição nem para afirmar que ela foi acelerada. A correção de CLS do template foi mantida. Nenhuma alteração visual ou de skeleton foi feita para manipular o LCP.

O `lcp-breakdown-insight` apontou atraso de renderização da descrição de 824–1.185 ms na primeira série atual e 1.055–1.395 ms na repetição; no template antigo, os 498–613 ms pertencem à frase do rodapé. Essas decomposições também não são diretamente comparáveis entre elementos distintos.

## 4. Gargalo confirmado e otimização mantida

Na baseline local atual de Explorar, o chunk `19hvplwf37y2e.js` do SDK Supabase (63.742 bytes transferidos nessa build) apareceu antes de qualquer clique em **5/5** execuções, embora a página anônima não precisasse dele para mostrar o catálogo. O código e a documentação local do Next mostram links visíveis para `/criar-projeto` na Navbar e em `ProjectDiscoveryPage`; o prefetch dessa rota estática antecipa seus scripts. A análise anterior já havia ligado o mesmo chunk ao prefetch de criar projeto nas outras rotas. O arquivo compartilhado de React/Next de 73.905 bytes e o custo de hidratação continuam; a medição não atribui esse trabalho a `AuthProvider` ou a outro componente específico.

A única otimização de aplicação desta etapa desativa o prefetch de `/criar-projeto` **apenas enquanto a rota atual é `/explorar`**, na Navbar, no CTA principal e no CTA de catálogo vazio. O destino continua sendo um `Link` normal e abre ao clique. Foram removidos oito imports já sem uso em `project-discovery-page.tsx` para que o lint do arquivo tocado passe; isso não altera a UI.

| Explorar Mobile | Antes: template atual, 5 execuções | Candidata, 5 execuções | Build final, 3 execuções |
|---|---:|---:|---:|
| Score | 63 (62–65) | 63 (55–68) | 60 (59–69) |
| LCP ms | 3.722 (3.660–3.863) | 3.781 (3.034–4.438) | 3.863 (3.806–4.130) |
| CLS | 0 | 0 | 0 |
| TBT ms | 1.440 (1.128–1.570) | 1.354 (1.142–1.730) | 1.415 (767–1.911) |
| FCP ms | 1.617 (1.592–1.702) | 1.647 (1.615–2.117) | 1.646 (1.631–1.726) |
| JS transferido, bytes | 298.342 | 212.990 | 212.990 |
| Requisições | 47 (46–47) | 42 | 42 |
| Evento `load`, ms | 1.116 (928–1.893) | 1.283 (999–2.028) | 1.091 (977–1.908) |
| Chunk Supabase antes do clique | 5/5 | 0/5 | 0/3 |

A redução de **85.352 bytes de JS transferido (28,6%)** foi constante na amostra; houve **quatro a cinco requisições a menos**, conforme a execução de referência. A mudança não demonstrou redução consistente de LCP, TBT, Score, FCP ou evento `load`; as amplitudes se sobrepõem e o build final teve alta dispersão de TBT. Não se atribui melhora de fluidez a essa alteração. Ela foi mantida pelo ganho direto e repetido de rede/trabalho antecipado, sem quebra funcional observada. Pode aumentar a latência **após** o clique em criar projeto; o clique foi validado, mas seu custo sob rede/CPU limitadas não foi comparado nesta etapa.

A Garagem permaneceu sem mudança de aplicação. Sua referência local atual de cinco medições foi: Score 65 (64–68), LCP 4.190 ms (3.644–4.229), CLS 0, TBT 919 ms (671–1.243), FCP 1.602 ms (1.461–1.628), 318.785 bytes de JS e 48 requisições. O LCP foi o texto do painel de projetos locais. Sem sessão autenticada e dados representativos, não houve base para alterar consultas privadas ou o `AuthProvider` com segurança. Também não foram modificados fontes, imagens prioritárias, Navbar fora de Explorar, consentimento ou a implementação interna de React/Next.

## 5. Arquivos modificados nesta etapa

- `src/components/site/site-navbar.tsx`: acrescenta `/explorar` à condição preexistente de prefetch adiado para `/criar-projeto`.
- `src/components/projects/project-discovery-page.tsx`: desativa prefetch nos dois CTAs de criação e retira oito imports sem uso.
- `docs/otimizacao-performance-etapa-3.md` e `docs/evidencias-otimizacao-performance-etapa-3/`: relatório, scripts, JSONs brutos, estatísticas e capturas.

`src/app/template.tsx` foi temporariamente alternado para medir a hipótese e restaurado ao conteúdo inicial desta etapa; seu diff final continua sendo o da etapa 2. Os outros arquivos modificados no início não foram alterados por esta etapa.

## 6. Validação funcional e visual

- `npm run typecheck`, lint dos dois arquivos de aplicação tocados, do template e dos scripts de evidência, e `npm run build` de produção local: **passaram** no estado final. `git diff --check` passou.
- Playwright `tests/e2e/public.spec.ts` no build final: **6/6** em Chromium Mobile e Desktop.
- [Smoke de navegação](evidencias-otimizacao-performance-etapa-3/functional-smoke/smoke.json): 14 combinações de dispositivo/rota (`/`, `/explorar`, `/garagem`, `/login`, `/register`, projeto e perfil inexistentes), todas HTTP 200, sem overflow horizontal, imagens quebradas, respostas 400+ ou erros de console/runtime. Capturas Mobile/Desktop foram examinadas para Explorar; o layout permaneceu adequado.
- [Clique em Explorar](evidencias-otimizacao-performance-etapa-3/explore-navigation.json): CTA “Adicionar meu projeto” chegou a `/criar-projeto` em Mobile e Desktop, sem erro de runtime; o chunk Supabase não apareceu antes do clique. Não foi enviado formulário nem alterado dado remoto.
- [Consentimento e rodapé](evidencias-otimizacao-performance-etapa-3/resultado.json): primeira visita, links legais, configurar, aceitar, recusar, persistir/revogar, botão “Gerenciar cookies” clicável e rodapé após conteúdo em `/`, `/privacy` e `/terms` em Mobile e Desktop; zero requisições de Analytics e zero erros de runtime. Google Analytics continua inativo.
- [Tentativa de verificar skeleton em navegação](evidencias-otimizacao-performance-etapa-3/skeleton-navigation.json): com resposta RSC artificialmente atrasada em 2,5 s, a navegação Mobile/Desktop para Explorar completou, mas o skeleton transitório não foi observado pelo seletor do teste. Isso **não valida visualmente** o fallback sob carregamento lento. `loading.tsx`, `Suspense` e os componentes de skeleton não foram alterados; os testes públicos confirmaram o conteúdo final.

## 7. Riscos, limites e próxima etapa

LCP de Explorar e Garagem e TBT de Explorar continuam acima das referências desejadas em laboratório; nenhum resultado desta etapa sustenta promessa de 80–90 pontos ou LCP ≤2,5 s. A simulação do Lighthouse não substitui testes em um aparelho modesto nem INP de usuários reais. O ambiente local está sem catálogo/Supabase funcional para telas autenticadas; login real, OAuth, criação/edição de projeto e custos de consultas privadas não foram executados. A medição de tempo após clique em criar projeto sob throttling permanece pendente. A alteração de prefetch deve ser reavaliada com esse dado se houver prioridade de conversão para criação.

Outra etapa só é recomendada com ambiente de teste autenticado e perfis de CPU que atribuam tarefas longas a módulos da aplicação. Nessa condição, priorizar Garagem/perfil e os componentes compartilhados; não há base nesta rodada para uma segunda mudança segura de hidratação ou arquitetura. Preservar o template que corrigiu CLS.
