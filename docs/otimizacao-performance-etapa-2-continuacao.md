# Projeto Garagem — continuação da etapa 2 (13/10/2026)

## Escopo e decisão

Trabalho exclusivamente local na branch `codex/performance-etapa-1`, preservando as alterações anteriores sem commit, push, merge ou deploy. A única mudança nova de aplicação nesta continuação está em `src/app/template.tsx`. Os relatórios das etapas anteriores orientaram a seleção do problema; os relatórios de investigação de 12/10 permanecem no checkout original e não foram copiados para este worktree. Nenhum resultado antigo de produção foi tratado como baseline numérica local.

**Resultado confirmado:** o contêiner compartilhado da rota não reservava espaço durante o streaming. O rodapé era pintado dentro da primeira tela e deslocado quando a rota chegava. Reservar uma altura mínima de tela e permitir crescimento com o conteúdo eliminou esse deslocamento nas amostras repetidas. **Não houve redução de JavaScript nem de requisições** nesta alteração. LCP/TBT Mobile de Explorar pioraram na série final em relação à série de referência repetida; a amostra inicial de referência já tinha LCP próximo ao final, portanto não é possível atribuir causalmente a diferença à classe CSS. Isso deve ser revisto antes da publicação.

## Diagnóstico dirigido

| Ponto | Evidência e arquivo | Gravidade / conclusão |
|---|---|
| Deslocamento do rodapé | Lighthouse `layout-shifts` atribuiu 0,337 de CLS da Garagem Mobile ao `footer`; o rastreamento CDP mostrou o rodapé em 345 px e depois em 823 px. Em Desktop, a mediana inicial de CLS foi 0,278 na Inicial, 0,126 em Explorar e 0,147 na Garagem. `src/app/layout.tsx` monta o rodapé após o template; `src/app/template.tsx` tinha `flex-1` sem reserva de altura. | Alta; causa confirmada. |
| Trabalho de CPU e JS | Lighthouse Mobile de referência: 205.442 bytes de scripts na Inicial, 298.342 em Explorar e 318.785 na Garagem; trabalho de main thread nas primeiras execuções de 5,81 s, 6,27 s e 5,01 s. O maior recurso JS transferido em cada uma foi `1_vgly0gd1oic.js` (73.905 bytes), compartilhado. | Alto custo observado; pilhas atuais não atribuem a maior parte a um componente da aplicação. Nenhum chunk interno de React/Next foi modificado. |
| Componentes globais | `src/app/layout.tsx` inclui `AuthProvider`, Navbar, Footer, CookieConsent e fontes em todas as rotas. `src/components/AuthProvider.tsx` já posterga o import do cliente Supabase quando não há cookie de autenticação. As etapas anteriores já limitaram prefetches e separaram o formulário de login. | Sem mudança segura adicional comprovada no cenário anônimo local. |
| Consulta repetida na Inicial | `FeaturedProjectNote` usa `getFeaturedProjects(1, "likes")`; `FeaturedProjectsSection` usa `getFeaturedProjects(6, "likes")` em `src/app/page.tsx`. As chaves distintas de `React.cache` podem executar duas buscas em `src/lib/projects/server.ts` quando o Supabase está configurado. | O caminho no código está confirmado; custo real e equivalência visual de unificação não foram medidos neste ambiente sem catálogo. Não alterado. |
| Consultas do perfil | `src/components/garage/profile-experience.tsx` inicia consultas de projetos salvos, curtidos e seguidos mesmo quando a aba não está ativa; algumas alimentam a ferramenta privada de inspiração. | Potencial de requisições evitáveis, mas requer sessão/dados de teste e preservação da ferramenta. Não alterado. |
| Imagens, fontes e CSS | Lighthouse da Inicial carregou uma imagem de herói de 39.941 bytes; `next/image` a marca como prioritária e não houve duas transferências da imagem nas capturas. CSS transferido: 20.564 bytes nas três rotas Mobile. `layout.tsx` importa pesos de Inter, Montserrat e Poppins. | Nenhum desperdício de imagem ou corte seguro de fonte foi comprovado. Não alterado. |

As rotas de projeto e perfil foram inspecionadas no código e percorridas em seus estados de item inexistente. O ambiente local não tem credenciais/dados autenticados para medir telas reais dessas rotas ou consultas privadas. INP de usuários reais, memória em notebook Core i3 de terceira geração e custo de Supabase em produção estão indisponíveis; TBT é apenas indicador de laboratório, não substitui INP.

## Implementação e tentativa rejeitada

O comportamento anterior era `className="pg-route-enter flex-1"` no estado local de partida. A primeira tentativa adicionou `min-h-screen`, mas preservou `flex-1`. Isso retirou o salto medido, porém limitou a altura calculada do contêiner a 844 px em uma página com 1.504 px de conteúdo, sobrepondo o rodapé. O teste de consentimento detectou o botão “Gerenciar cookies” obstruído. A tentativa foi **substituída**, e seus JSONs ficaram em `candidate/` para auditoria.

A versão final usa `className="pg-route-enter min-h-screen flex-none"`: o espaço de uma tela existe antes do conteúdo transmitido e o contêiner cresce quando a página é longa. No rastreamento da Garagem Mobile, o rodapé passou de 345→823 px antes para 823→823 px depois; o evento de CLS de 0,337331 desapareceu. O teste funcional confirmou rodapé após o conteúdo e botão clicável em `/`, `/privacy` e `/terms`, em Mobile e Desktop. `AuthProvider`, Navbar, fontes, consultas e design dos componentes não foram alterados nesta continuação.

## Comparação local reproduzível

Builds locais de produção com `next build` e `next start` na mesma branch, Lighthouse 13.5.0 e Chrome do Playwright. Três execuções sequenciais por rota e dispositivo, armazenamento reiniciado pelo Lighthouse. Mobile: 412×823, DPR 1, CPU ×4, RTT 150 ms, 1.638,4 Kbps. Desktop: 1366×768, DPR 1, CPU ×1, RTT 40 ms, 10.240 Kbps. Valores abaixo são **medianas de laboratório**. `Speed Index` mede progresso visual, não tempo de carregamento completo. Configurações, JSONs brutos e IDs dos builds estão em `docs/evidencias-performance-continuacao-2026-10-13/{baseline-repeat,final}/{mobile,desktop}/`.

| Dispositivo / rota | Score antes→depois | LCP ms antes→depois | CLS antes→depois | TBT ms antes→depois | JS bytes antes→depois | Requisições antes→depois | Speed Index ms antes→depois |
|---|---:|---:|---:|---:|---:|---:|---:|
| Mobile Inicial | 64→64 | 4.191→4.365 | 0,00038→0 | 729→856 | 205.442→205.442 | 41→41 | 1.690→1.895 |
| Mobile Explorar | 70→63 | 2.661→3.817 | 0→0 | 1.117→1.522 | 298.342→298.342 | 47→47 | 2.055→1.923 |
| Mobile Garagem | 50→67 | 3.967→3.516 | 0,33740→0 | 882→1.072 | 318.785→318.785 | 48→48 | 1.592→1.615 |
| Desktop Inicial | 83→96 | 1.085→1.062 | 0,27769→0,00005 | 91→132 | 208.614→208.614 | 46→46 | 898→1.074 |
| Desktop Explorar | 91→95 | 857→1.011 | 0,12565→0,00024 | 154→157 | 301.514→301.514 | 51→51 | 736→823 |
| Desktop Garagem | 91→93 | 1.017→1.003 | 0,14745→0,00597 | 115→185 | 318.785→318.785 | 50→50 | 675→731 |

A primeira execução Mobile de Explorar na referência inicial deu LCP de 4.081 ms; as três execuções da série `baseline-repeat` deram 2.575–2.863 ms, e as finais 3.725–4.252 ms. O elemento LCP permaneceu o mesmo parágrafo da introdução, com maior atraso de renderização na série final. Essa diferença pode refletir condições de execução/streaming ou regressão; **não está isolada**. A melhoria comprovada é de CLS. As variações de TBT/LCP não foram apresentadas como ganhos garantidos. A soma de scripts e a contagem de requisições permaneceram idênticas por rota/dispositivo no build final.

## Validação

- `npm run build`, `npm run typecheck` e `npx eslint src/app/template.tsx`: passaram no estado final.
- `tests/e2e/public.spec.ts` em Chromium Mobile e Desktop: 6/6 passaram no estado final.
- Teste local de consentimento: 11 verificações passaram; primeira visita, consentimento salvo, aceitar, recusar, configurar, revogar, links `/privacy` e `/terms`, botão do rodapé clicável e navegação entre login, recuperação e cadastro. Nenhuma requisição de Analytics ou erro de runtime foi registrada. Os dados de teste foram apenas locais ao navegador.
- Navegação Playwright em Inicial, Explorar, Garagem, Login, Cadastro, projeto inexistente e perfil inexistente, Mobile e Desktop: respostas 200, sem overflow horizontal, erro de console, imagem quebrada ou resposta 400+ no teste. Capturas e JSON em `final-smoke/`. O estado de projeto/perfil inexistente é o único acessível sem dados de catálogo.
- Rastreamento CDP antes/depois em `baseline-layout-trace.json` e `final-layout-trace.json` confirma que o rodapé da Garagem Mobile deixou de se mover durante o carregamento.
- Fluxos reais de login/OAuth, publicação de projeto e telas autenticadas não foram exercidos por falta de credenciais de teste e para não alterar dados existentes. Os pontos de entrada, validação local e navegação foram cobertos.

## Riscos e próximos passos

1. **Antes de publicar:** repetir LCP/TBT Mobile de Explorar em séries alternadas A/B/A sob carga controlada. Se a piora persistir, investigar o atraso de renderização do parágrafo LCP e rever esta mudança de layout, preservando a correção do rodapé. Não há medição de usuários reais.
2. Obter ambiente de teste autenticado com dados representativos para medir `ProfileExperience`, Garagem e página de projeto. Só então reduzir consultas por aba e verificar dados privados/RLS.
3. Instrumentar perfis de CPU que atribuam tempo a módulos da aplicação nos caminhos de navegação. O custo do chunk compartilhado e da hidratação existe, mas o build atual não fornece base suficiente para remover código global com segurança.
4. Testar uma eventual unificação das duas consultas de destaque da Inicial com dados reais, preservando exatamente o projeto exibido e comparando requisições. Avaliar fontes apenas com revisão visual de quebras de texto e LCP.

Nenhuma configuração de Supabase, Netlify ou Analytics foi modificada. Não houve commit, push, merge, deploy ou build remoto.
