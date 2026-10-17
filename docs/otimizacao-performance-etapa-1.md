# Otimização de desempenho — etapa 1

**Execução:** 12–13/10/2026. **Estado:** alterações locais na branch isolada `codex/performance-etapa-1`, sem commit, push, merge ou deploy. O checkout original e suas alterações preexistentes foram preservados.

## Escopo e decisão

Esta rodada remove o carregamento antecipado de `/forgot-password` e `/criar-projeto` nas páginas priorizadas. Os links e seus destinos continuam disponíveis ao clique. A mudança evita, nas medições anônimas locais, o download antecipado do chunk `19hvplwf37y2e.js` que contém o SDK Supabase. Não foi encontrada alteração pequena e comprovadamente benéfica para `AuthProvider`, fontes ou aviso de cookies; esses componentes permanecem como estavam.

O diagnóstico inicial (`docs/investigacao-performance-2026-10-12.md`), o diagnóstico final (`docs/investigacao-final-performance-2026-10-12.md`), os relatórios Lighthouse/Playwright/CDP em `docs/evidencias-performance-2026-10-12/` e o código foram usados para selecionar as mudanças. Esses documentos de origem estão no checkout original e ainda não foram incorporados à branch isolada. Os resultados publicados daqueles relatórios **não** foram usados como baseline numérica desta rodada.

## Arquivos de aplicação modificados

| Arquivo | Alteração | Comportamento anterior e motivo |
|---|---|---|
| `src/app/(auth)/login/page.tsx` | `prefetch={false}` no link “Esqueci minha senha”. | Em visita anônima ao login, o teste de rede registrou duas requisições RSC antecipadas para `/forgot-password` antes do clique. Essa rota importa o cliente Supabase. |
| `src/components/site/site-navbar.tsx` | Desativa o prefetch de `/criar-projeto` nos links desktop e mobile apenas em `/`, `/login` e `/register`. | O link global visível antecipava essa rota, que também referencia o chunk do SDK Supabase. |
| `src/app/page.tsx` | Desativa o prefetch dos três links de `/criar-projeto` da página inicial. | Após ajustar apenas a Navbar, o SDK continuou sendo baixado na inicial por links locais da página. |
| `src/components/site/site-footer.tsx` | Desativa o prefetch do link “Adicionar projeto”. | O rodapé da inicial também antecipava `/criar-projeto`, mesmo abaixo da dobra na amostra Playwright. |

O carregamento normal de `/forgot-password` e `/criar-projeto` ocorre ao clicar; autenticação, formulário, consentimento, apresentação visual e SEO não foram alterados. `src/app/layout.tsx` e `src/components/AuthProvider.tsx` foram examinados, mas não modificados: no cenário anônimo sem cookie, `AuthProvider` retorna antes do import dinâmico do Supabase, e os perfis anteriores não isolam um custo de aplicação que justifique mudar o contrato do provider. Também não houve alteração de fontes: os relatórios mostram custo, mas não uma remoção segura de peso sem verificar impacto visual e nas quebras de texto.

## Medição comparável

Todas as medições novas usaram **builds locais de produção** (`next build` + `next start`) no mesmo checkout isolado e origin `http://127.0.0.1:3101`, Lighthouse 13.5.0, Chrome do Playwright, viewport Mobile 412×823, DPR 1, simulação CPU ×4, RTT 150 ms e throughput 1.638,4 Kbps. Foram três execuções sequenciais por rota e etapa, com reinicialização de armazenamento pelo Lighthouse. Os JSONs brutos, `BUILD_ID`, manifestos e [script de reprodução](evidencias-otimizacao-performance-etapa-1/benchmark.cjs) estão em `docs/evidencias-otimizacao-performance-etapa-1/`. A baseline local veio do HEAD `45da12b79891a244678abf54c66d7e2bd9205b0a`, antes das mudanças desta rodada; não equivale ao build publicado.

| Página Mobile | Baseline: Score / TBT / LCP | Final: Score / TBT / LCP | Diferença observada das medianas |
|---|---:|---:|---:|
| Inicial | 59 / 2.023 ms / 3.969 ms | 60 / 1.342 ms / 3.828 ms | +1 ponto / −681 ms / −141 ms |
| Login | 51 / 2.936 ms / 4.743 ms | 56 / 1.883 ms / 4.625 ms | +5 pontos / −1.053 ms / −118 ms |
| Cadastro | 56 / 1.613 ms / 4.901 ms | 58 / 1.149 ms / 4.566 ms | +2 pontos / −464 ms / −335 ms |

Essas são diferenças **medidas nesta amostra de laboratório**, não ganhos garantidos. Houve dispersão relevante: por exemplo, TBT final da inicial variou de 1.286 a 2.617 ms, e o do cadastro de 616 a 1.829 ms. Três execuções não separam com segurança a contribuição de cada link para TBT/LCP nem representam usuários reais ou um Core i3 de terceira geração. O LCP da inicial continua sendo a imagem do herói; no login/cadastro de primeira visita continua sendo o texto do aviso de cookies.

O resultado de rede é mais direto: o chunk `19hvplwf37y2e.js`, com **63.742 bytes transferidos** na baseline local, apareceu nas três execuções de cada uma das três páginas antes das mudanças e em **nenhuma** das nove execuções finais. A soma dos recursos JS nas requisições Lighthouse caiu de 294.999 para 209.691 bytes na inicial, de 298.633 para 210.561 bytes no login e de 295.869 para 210.561 bytes no cadastro. Esses totais incluem outros chunks antecipados e diferem do tamanho descomprimido do bundle. A ausência do chunk antes do clique foi confirmada também pelo teste funcional; isso prova a redução do download inicial nas condições medidas, mas não quantifica o custo total de CPU de todo o SDK.

## Etapas incrementais e decisões

1. **Somente `/forgot-password` no login:** a navegação continuou funcionando e as requisições RSC desse destino caíram de duas para zero no teste funcional. O chunk Supabase **continuou presente** nas três execuções Lighthouse de login (63.742 bytes em cada). A mediana de login foi 57 / 1.450 ms / 4.479 ms, mas não há base para atribuir a diferença ao link isolado. A alteração foi mantida porque elimina prefetch comprovadamente desnecessário no primeiro carregamento, sem regressão funcional observada.
2. **Navbar em login/cadastro:** o manifesto cliente de `/criar-projeto` inclui `19hvplwf37y2e.js`, e a captura de rede mostrou prefetch dessa rota. Desativá-lo nas rotas de autenticação retirou o chunk das três execuções de cada rota. As medianas ficaram em 59 / 1.276 ms / 4.433 ms no login e 59 / 1.039 ms / 4.514 ms no cadastro. A navegação para criar projeto pelo menu mobile continuou funcionando.
3. **Aviso de cookies — tentativa rejeitada:** o diálogo Radix de preferências foi separado para carregamento sob demanda, preservando texto, escolhas e visual. O build e o teste de primeira visita/consentimento salvo passaram. Porém, o JS inicial de login caiu apenas de 210.557 para 210.279 bytes e passou a ter uma requisição adicional; as medianas ficaram em 54 / 2.820 ms / 4.817 ms no login e 54 / 1.910 ms / 4.819 ms no cadastro. Não houve benefício de LCP consistente. Essa tentativa foi **revertida**; o código final do aviso é igual ao original. Uma leitura síncrona no efeito também foi descartada por violar `react-hooks/set-state-in-effect`. Os resultados brutos foram mantidos para revisão.
4. **Inicial:** apenas limitar o link da Navbar não removeu o SDK; a mediana de TBT foi 2.690 ms. A inspeção das requisições encontrou prefetch adicional na própria página e no rodapé. Após limitar os quatro links restantes, a captura anterior ao clique e as três execuções finais da inicial não carregaram o SDK. Os links para criar projeto continuaram navegáveis.

## Validação funcional e de código

- `npm run build`: passou no build final de produção; `npm run typecheck`: passou.
- `npx eslint` apenas nos quatro arquivos de aplicação modificados e nos dois scripts de evidência: passou. `npm run lint` completo foi executado e **falhou por dez erros preexistentes** de variáveis/importações sem uso em `src/components/projects/project-discovery-page.tsx` (8), `project-modifications.tsx` (1) e `project-rankings-board.tsx` (1). Esses arquivos não foram alterados nesta rodada.
- Playwright `tests/e2e/public.spec.ts` em Chromium desktop e mobile: **6/6 passaram** no build final.
- O [teste funcional reproduzível](evidencias-otimizacao-performance-etapa-1/functional-smoke.cjs) passou no build final: aviso visível na primeira visita, preferência salva e aviso ausente após reload, abertura e salvamento do diálogo, validação de campos obrigatórios no login e de senha curta no cadastro, acesso a recuperar senha, criação de projeto pelos links mobile e da inicial, navegação pública, zero erros de console/runtime. Registrou zero prefetchs antecipados de `/forgot-password` e `/criar-projeto` no login e zero de `/criar-projeto` na inicial. A validação do cadastro foi interrompida antes da chamada remota; nenhum formulário foi enviado ao Supabase ou dado de produção foi alterado.
- Fluxo real de login/OAuth/cadastro autenticado **não foi executado** por falta de credenciais de teste e por envolver serviços externos. A navegação, a presença dos campos e os pontos de entrada da autenticação foram verificados. Não há evidência de regressão nesses fluxos, mas também não há validação ponta a ponta deles nesta etapa.

## Riscos, limites e próxima etapa

Desativar prefetch pode acrescentar latência **após** clicar em criar projeto ou recuperar senha; este tempo de clique não foi cronometrado. A navegação funcionou nos testes. O efeito em visitantes autenticados, visita com consentimento salvo, Desktop e hardware modesto não foi quantificado. Os custos grandes de React/Next e a hidratação das páginas Client permanecem; não foram alterados sem atribuição mais precisa a componentes da aplicação. O aviso de cookies segue como elemento LCP em login/cadastro Mobile de primeira visita, e esta rodada não encontrou mudança segura que melhorasse sua métrica.

Na próxima etapa, medir navegação após clique e estados autenticado/consentimento salvo; só então considerar limites Client mais estreitos para páginas de autenticação e componentes globais. Avaliar fontes e o aviso com critério visual, acessibilidade e LCP da primeira visita, mantendo o texto e a escolha de consentimento. Nenhuma configuração de Supabase ou ambiente de publicação foi modificada.
