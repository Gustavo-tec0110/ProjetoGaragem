# Otimização de desempenho — etapa 2

**Execução:** 13/10/2026. **Estado:** branch isolada `codex/performance-etapa-1`, alterações locais sem commit, push, merge ou deploy. As mudanças e evidências da etapa 1 foram preservadas. O checkout original não foi alterado.

## Resultado e arquivos modificados

A única mudança de aplicação mantida nesta etapa é a separação do login em uma casca Server Component e um formulário Client Component:

| Arquivo | Resultado |
|---|---|
| `src/app/(auth)/login/page.tsx` | Deixa de ser Client Component; renderiza `AuthShell` e passa `LoginForm` como filho. Título, descrição, estrutura e classes visuais foram preservados. |
| `src/app/(auth)/login/login-form.tsx` | Novo limite Client que contém os estados, o `useAuth`, os handlers e os links já existentes. Mantém `prefetch={false}` em `/forgot-password`, implementado na etapa 1. |

`src/app/page.tsx`, `src/components/site/site-navbar.tsx` e `src/components/site/site-footer.tsx` continuam modificados **somente** pelas otimizações de prefetch da etapa 1. Nenhum outro arquivo de produção foi modificado. A alteração reduz o alcance de hidratação do conteúdo estático do login, sem mudar o envio do formulário ou a autenticação. A diferença de CPU atribuível exclusivamente ao componente não foi isolada por profiler; as métricas abaixo são do carregamento completo da página.

## Método e métricas Mobile

Foi usada como baseline a versão final **local** da etapa 1, no mesmo worktree, antes da mudança acima. Cada candidata foi compilada com `next build` e servida por `next start` em `http://127.0.0.1:3101`. O [script](evidencias-otimizacao-performance-etapa-2/benchmark.cjs) executou Lighthouse 13.5.0 no Chrome do Playwright: 412×823, DPR 1, CPU ×4 simulada, RTT 150 ms, 1.638,4 Kbps, armazenamento reiniciado e três execuções sequenciais por página. As tabelas mostram a **mediana de cada métrica**, que pode vir de execuções distintas. JSONs brutos, configuração, ID e manifesto de cada build estão em [`docs/evidencias-otimizacao-performance-etapa-2/`](evidencias-otimizacao-performance-etapa-2/). Não há comparação numérica com a produção ou com usuários reais.

| Página | Baseline etapa 1: Score / TBT / LCP | Final etapa 2: Score / TBT / LCP | Diferença observada |
|---|---:|---:|---:|
| Inicial | 62 / 1.593 ms / 3.952 ms | 66 / 728 ms / 4.340 ms | +4 pontos / −865 ms / **+388 ms de LCP** |
| Login | 59 / 1.008 ms / 4.683 ms | 67 / 727 ms / 4.543 ms | +8 pontos / −281 ms / −140 ms |
| Cadastro | 61 / 1.331 ms / 4.578 ms | 67 / 659 ms / 4.228 ms | +6 pontos / −672 ms / −350 ms |

O experimento inicial do limite Server no login também mediu login **69 / 561 ms / 4.477 ms**, ante **59 / 1.008 ms / 4.683 ms** da baseline, e cadastro **67 / 650 ms / 4.637 ms**. O build final, equivalente em código, manteve melhora das medianas de login e cadastro. Na inicial, que não teve mudança direta nesta etapa, o TBT variou muito: baseline 1.068–3.708 ms; primeiro build candidato 772–2.152 ms; repetição do mesmo build teve mediana 1.198 ms; medição final 616–758 ms. Por isso, a diferença da inicial **não é atribuída** à mudança do login. Seu LCP final foi pior que na baseline. Três execuções sob simulação não permitem prometer ganho estável nem extrapolar ao notebook Core i3 de terceira geração.

O total de bytes JS transferidos nas requisições Lighthouse caiu de 209.691 para 208.672 na inicial e de 210.561 para 209.542 no login e cadastro (medianas registradas nos JSONs). A diferença é pequena e pode incluir efeitos do grafo de chunks compartilhado; a conclusão segura é a nova fronteira Server/Client no código, não a eliminação de uma biblioteca pesada. O build final validado após reverter os experimentos rejeitados tem o mesmo `build-manifest.json` do build [`final`](evidencias-otimizacao-performance-etapa-2/final/) após desconsiderar apenas os caminhos com o ID do build. O novo ID está em `final/validated-build-id-after-footer-revert`.

## Experimentos incrementais e decisão

| Candidata, comparador | Evidência Mobile relevante | Decisão |
|---|---|---|
| Carregar o menu Radix do perfil sob demanda, ante baseline | Menos 11–17 KB de JS inicial, mas login 52 / 3.188 ms / 4.563 ms e cadastro 52 / 2.316 ms / 4.792 ms. | Revertida: TBT e Score piores. O custo efetivo do menu em usuário autenticado continua não mensurado. |
| Trocar a inicialização por timer do aviso de cookies por microtask, ante baseline | Login 58 / 1.558 ms / 4.101 ms; cadastro 56 / 1.519 ms / 4.604 ms. O aviso continuou sendo o LCP em primeira visita. | Revertida: nenhuma melhora consistente de TBT/Score e nenhum resultado seguro para o LCP. Texto, escolhas e política ficaram intactos. |
| Desativar todos os prefetches da Navbar em login/cadastro, ante baseline | Requisições RSC antecipadas caíram de 12 para 6 no login e de 10 para 2 no cadastro; login 59 / 1.191 ms / 4.589 ms e cadastro 60 / 947 ms / 4.657 ms. | Revertida: benefício agregado inconsistente e potencial custo de navegação. Permanecem só os prefetches desativados na etapa 1. |
| Dividir também o cadastro em casca Server, ante o login já dividido | Cadastro 65 / 844 ms / 4.463 ms contra 67 / 650 ms / 4.637 ms; login 62 / 930 ms / 4.360 ms contra 69 / 561 ms / 4.477 ms. | Revertida: TBT/Score pioraram nas páginas de autenticação, apesar de LCP menor. |
| Desativar prefetch de `/login` na inicial, ante o build final | Removeu ~2,9 KB de JS e prefetch RSC de ~5 KB; inicial passou de 66 / 728 ms / 4.340 ms para 64 / 894 ms / 4.328 ms. Clique inicial→login: mediana 785→1.289 ms. | Revertida: LCP quase igual e navegação após clique mais lenta. |
| Ajustar a camada do rodapé para permitir clique no botão de cookies, ante o build final | Resolveu o clique bloqueado no teste; porém login 59 / 1.085 ms / 4.607 ms. Repetição: 62 / 974 ms / 4.480 ms, contra final 67 / 727 ms / 4.543 ms. Cadastro também piorou em TBT/Score. | Revertida conforme o critério de desempenho desta rodada. A falha de clique preexistente está registrada abaixo para correção funcional isolada. |

Os resultados de candidatas rejeitadas permanecem nos respectivos diretórios de evidência; **seu código não está no estado final**. A pequena queda de bytes de algumas candidatas, por si só, não provou redução de trabalho da thread principal. Não foram alterados React, Next.js, fontes, políticas de consentimento ou configurações Supabase.

## Componentes globais e LCP de primeira visita

`src/app/layout.tsx` ainda monta `AuthProvider`, `SiteNavbar`, `SiteFooter` e `CookieConsent` em todas as páginas e importa os pesos de Inter, Montserrat e Poppins. `AuthProvider` já retorna sem importar o cliente Supabase quando não há cookie de autenticação; mudar sua inicialização para o visitante anônimo não apresentou oportunidade pequena comprovada. Seu custo em sessão autenticada permanece sem medição específica, e não foi alterado. A extração do menu Radix da Navbar mostrou redução de transferência, mas regressão nas métricas medidas, por isso também não foi mantida.

O texto de `CookieConsent` continuou identificado como elemento LCP do login/cadastro em primeira visita nos JSONs Lighthouse. O teste de microtask não resolveu isso de modo consistente. Atrasar artificialmente ou ocultar o aviso mudaria a experiência de consentimento e não foi adotado. Na inicial, o LCP é a imagem principal e sua mediana final piorou. Fontes e elementos compartilhados podem contribuir para renderização, mas esta rodada não isolou custo causal por módulo; não há base para alterá-los com segurança.

O [teste de clique com CPU/rede limitadas](evidencias-otimizacao-performance-etapa-2/navigation-benchmark.cjs) mediu do clique até o cabeçalho do destino. Baseline→login dividido, medianas: login→recuperar senha 1.725→1.431 ms; login→criar projeto 3.884→2.401 ms; cadastro→criar projeto 3.573→2.436 ms; inicial→criar projeto 2.712→2.261 ms. Todos navegaram, mas a dispersão e o fato de destinos compartilharem chunks impedem atribuir cada diferença à divisão do login. A candidata que removia o prefetch de `/login` teve custo de clique pior, como registrado acima.

## Validação e limitações

- `npm run build` no código final: passou; `npm run typecheck`: passou; ESLint dos dois arquivos de login e dos scripts desta etapa: passou.
- `npm run lint` completo: falhou por **10 erros preexistentes** de símbolos sem uso em `src/components/projects/project-discovery-page.tsx` (8), `project-modifications.tsx` (1) e `project-rankings-board.tsx` (1), não alterados nesta etapa.
- Playwright `tests/e2e/public.spec.ts` em Chromium desktop e mobile: **6/6 passaram**. O [teste funcional](evidencias-otimizacao-performance-etapa-2/final-functional.json) passou: login e cadastro renderizam, campos obrigatórios e senha curta validam localmente, recuperação de senha/criação de projeto/exploração navegam, consentimento salvo persiste, sem erro de runtime. Não houve envio de cadastro nem mudança em dados de produção. O SDK Supabase não foi antecipado antes do clique nos cenários anônimos verificados.
- O [teste de consentimento e responsividade](evidencias-otimizacao-performance-etapa-2/final-consent-responsive.json) confirmou aviso na primeira visita, escolhas “Aceitar” e “Recusar opcionais” persistidas sem banner após reload, diálogo de preferências acessível na primeira visita e sem overflow horizontal em inicial/login/cadastro a 390 px e 1366 px.
- **Problema funcional preexistente ainda aberto:** após consentimento salvo, no Mobile, o centro do botão “Gerenciar cookies” do rodapé é interceptado por uma `DIV` da camada de conteúdo; `elementFromPoint` não retorna o botão. O experimento de correção passou no teste de clique, mas foi revertido por regressão de desempenho. Assim, não se afirma que o acesso às preferências pelo rodapé esteja validado. Recomenda-se tratar isso como correção funcional própria, com teste de clique e regressão visual/performance.
- Login real, OAuth, sessão autenticada e cadastro remoto não foram executados por falta de credenciais de teste e para não alterar dados externos. Portanto o custo do `AuthProvider` autenticado, do menu de perfil em uso real e a latência nesse estado continuam desconhecidos. Desktop foi verificado funcionalmente, mas não recebeu três medições Lighthouse nesta rodada.

## Próximas correções, por impacto potencial e risco

1. **Baixo risco funcional, benefício ainda não comprovado:** corrigir em tarefa isolada a intercepção do botão de preferências do rodapé. Validar clique Mobile após consentimento e repetir Lighthouse; o ajuste de camada testado nesta rodada teve regressão e não deve ser reaplicado sem nova evidência.
2. **Impacto potencial médio, risco médio:** investigar o custo de `AuthProvider` e Navbar **com sessão de teste autenticada**, incluindo menu e notificações, antes de alterar a árvore global. O cenário anônimo já evita o import do SDK pelo provider.
3. **Impacto potencial médio, risco visual/acessibilidade:** testar uma alternativa real para a apresentação inicial do aviso de cookies, mantendo conteúdo, escolhas e acesso às preferências. Medir LCP de primeira visita e visita salva; a simples mudança de agendamento já foi rejeitada.
4. **Impacto potencial incerto, risco visual:** avaliar pesos de fontes e a imagem LCP da inicial com comparação visual e de quebra de texto. Nenhuma troca é justificada pelas medições desta etapa.

Uma rodada futura pode combinar intervenções globais **somente depois** de medir cada uma isoladamente e verificar autenticação, navegação, consentimento, acessibilidade e Mobile. Nesta etapa ficou mantida apenas a divisão do login; o restante é evidência para revisão, não um pacote de correções pendentes.
