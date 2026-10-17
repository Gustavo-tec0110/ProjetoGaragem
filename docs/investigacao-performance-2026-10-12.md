# Investigação técnica de desempenho — Projeto Garagem

**Data:** 2026-10-12  
**Escopo:** leitura da [auditoria existente](auditoria-performance-2026-10-12.md), dos [JSONs Lighthouse](evidencias-performance-2026-10-12/lighthouse/), do [resumo Playwright](evidencias-performance-2026-10-12/playwright/summary.json) e do código local. Nenhum teste novo, alteração de produção ou correção foi executado.

## 1. Resumo técnico dos problemas observados

O gargalo predominante no perfil móvel é o trabalho da thread principal, especialmente avaliação de JavaScript, layout e tarefas longas. Login e cadastro são os casos mais graves: TBT de 5.050 e 6.450 ms; trabalho total de thread principal de 12,5 e 15,6 s. O desktop, no mesmo conjunto de páginas, teve TBT de 470 e 200 ms. O perfil Lighthouse móvel usa CPU ×4 e rede simulada; esses resultados são **laboratoriais, de uma única execução por cenário**, não representam usuários reais nem medem INP. O Playwright não aplicou limitação de CPU/rede e não mostrou overflow horizontal, erro de console ou HTTP ≥400, portanto não contradiz o custo observado sob CPU reduzida.

O LCP móvel de login (4,8 s), cadastro (7,4 s) e exploração (3,4 s) foi identificado pelo Lighthouse como o **texto do aviso global de cookies**, não o conteúdo principal de cada página. O aviso só passa a existir após `useEffect`, leitura de `localStorage` e atualização de estado. Essa sequência é confirmada pelo código; o tempo exato que cada etapa acrescentou ao LCP não é isolado pelos dados. Na inicial, o LCP foi a imagem do herói.

## 2. Principais gargalos identificados

| Prioridade | Problema, arquivo e componente | Evidência cruzada | Métrica afetada e impacto esperado | Confiança | Possível abordagem, sem implementação | Risco da alteração |
|---|---|---|---|---|---|---|
| 1 | Trabalho de inicialização de JS e hidratação compartilhada. [`src/app/layout.tsx`](../src/app/layout.tsx), `AuthProvider`, `SiteNavbar`, `SiteFooter`, `CookieConsent`; páginas Client de login e cadastro. | Os chunks `1_vgly0gd1oic.js` (cerca de 70 KiB transferidos) e `0x92b1cogv8_d.js` (cerca de 33 KiB) aparecem nas quatro rotas móveis. `bootup-time` atribui ao primeiro 4.361 ms de CPU no login e 2.280 ms no cadastro; 20 Long Tasks listadas em cada uma. O layout inclui as ilhas Client em todas as rotas. | TBT e tempo até interatividade; especialmente em CPU limitada. A atribuição dos *chunks publicados* a módulos específicos ainda não foi comprovada. | **Alto** para o custo de JS comum; **médio** para a parcela causada por esses componentes. | Obter mapa de bundles e trace de produção, medir hidratação por componente; então reduzir escopo de Client e adiar lógica que não precisa rodar na primeira tela. | Quebrar autenticação, navegação, notificações ou preferências; alterar limites Server/Client sem validação pode afetar HTML e estado. |
| 2 | Aviso de cookies criado após hidratação e tornado LCP. [`src/components/privacy/cookie-consent.tsx`](../src/components/privacy/cookie-consent.tsx), `CookieConsent`; [`src/app/layout.tsx`](../src/app/layout.tsx). | `lcp-breakdown-insight` aponta o parágrafo do aviso em login, cadastro e exploração móveis. `CookieConsent` começa com `ready=false`, retorna `null`, depois agenda `setTimeout(...,0)` dentro de `useEffect`, lê `localStorage` e mostra o aviso. O atraso de renderização do elemento LCP foi 3.402 ms no login, 3.811 ms no cadastro e 1.707 ms na exploração. | LCP medido e possível entrada tardia de elemento fixo; influência no LCP depende do estado sem consentimento. | **Alto** para identificação do LCP e sequência; **médio** para quantificar contribuição causal ao atraso. | Investigar tratamento inicial de consentimento e apresentação do aviso preservando a escolha e sua acessibilidade; comparar com e sem consentimento salvo. | Regressão de consentimento, persistência, acessibilidade e possível mudança de qual elemento será LCP. |
| 3 | Fontes globais e CSS bloqueante em todas as páginas. [`src/app/layout.tsx`](../src/app/layout.tsx) importa 9 pesos; [`src/app/globals.css`](../src/app/globals.css) define Inter, Montserrat e Poppins. | Login/cadastro móveis transferiram 7 WOFF2, cerca de 134 KiB, e dois CSS, cerca de 17 KiB; o CSS principal tem 115.566 bytes descomprimidos. `render-blocking-insight` registra o CSS principal e estima 150 ms para o perfil móvel. A cadeia crítica passa pelo CSS e por fontes. | FCP/LCP e competição de rede no carregamento inicial. Não há evidência de que todas as fontes sejam dispensáveis em cada rota. | **Alto** para carregamento; **médio** para impacto de eventual redução. | Revisar pesos realmente usados por rota e caminho crítico de CSS/fontes; medir variantes em produção antes de alterar. | Troca visual, mudança de quebras de linha/CLS, regressão de identidade visual. |
| 4 | Recurso JS adicional quase todo não usado no login. [`src/app/(auth)/login/page.tsx`](../src/app/(auth)/login/page.tsx), `LoginPage`; dependência exata do chunk não identificada. | `19hvplwf37y2e.js` transfere cerca de 60 KiB só no login entre as quatro rotas auditadas; `unused-javascript` estima 57.214 bytes (95%) não usados nessa navegação. O mesmo audit registra tarefa longa de 350 ms atribuída ao chunk e 350 ms de CPU em `bootup-time`. Cadastro usa componentes semelhantes e não requisitou esse chunk. | Transferência de JS e TBT do login; impacto específico no LCP não demonstrado (`unused-javascript` indica economia de LCP 0 nessa amostra). | **Alto** para desperdício medido; **baixo** para origem no código. | Mapear chunk do deploy para seus módulos e verificar prefetch ou importação antecipada; só então considerar carregamento sob demanda. | Adiar código necessário ao fluxo de login ou à navegação e aumentar latência após clique. |
| 5 | Imagem do herói é o LCP da inicial. [`src/app/page.tsx`](../src/app/page.tsx), `Home`; `/ref/hero-opala-ss.webp`. | `lcp-breakdown-insight` identifica a imagem. No móvel, a resposta de `/_next/image` com `w=750&q=85` transferiu 48.541 bytes; TTFB 1.165 ms, atraso de descoberta 81 ms, carregamento 1.064 ms e atraso de renderização 399 ms. `lcp-discovery-insight` confirma `fetchpriority=high`, descoberta no HTML e ausência de lazy loading; `image-delivery-insight` estima 10 KiB de economia. | LCP inicial de 3,6 s; o custo é distribuído entre resposta do documento e carga da imagem. | **Alto** para identificação e tempos; **médio** para benefício de otimização. | Avaliar tamanho/qualidade e resposta do documento com medições repetidas; preservar prioridade da imagem visível. | Perda de nitidez e diferenças de enquadramento por viewport. |

## 3. Evidências Lighthouse

| Rota | Score móvel/desktop | LCP móvel/desktop | TBT móvel/desktop | Thread principal móvel | Avaliação JS móvel | Layout móvel |
|---|---:|---:|---:|---:|---:|---:|
| Inicial | 56/70 | 3,6/1,4 s | 2.470/490 ms | 8.064 ms | 3.484 ms | 1.725 ms |
| Login | 46/78 | 4,8/0,7 s | 5.050/470 ms | 12.473 ms | 5.951 ms | 2.181 ms |
| Cadastro | 34/90 | 7,4/0,9 s | 6.450/200 ms | 15.590 ms | 5.766 ms | 3.710 ms |
| Exploração | 61/77 | 3,4/1,0 s | 2.280/410 ms | 7.432 ms | 2.889 ms | 1.349 ms |

Fontes: JSONs [`inicio-mobile`](evidencias-performance-2026-10-12/lighthouse/inicio-mobile.json), [`login-mobile`](evidencias-performance-2026-10-12/lighthouse/login-mobile.json), [`cadastro-mobile`](evidencias-performance-2026-10-12/lighthouse/cadastro-mobile.json), [`explorar-mobile`](evidencias-performance-2026-10-12/lighthouse/explorar-mobile.json) e respectivos JSONs desktop, auditorias `mainthread-work-breakdown`, `bootup-time`, `long-tasks`, `lcp-breakdown-insight`, `network-requests`.

- **Long Tasks:** a tabela do Lighthouse contém 20 entradas em cada rota móvel (a tabela mostra as maiores, não prova que haja apenas 20). No cadastro, as maiores entradas são 2.410 ms em `turbopack-3lc6abxlur--y.js`, 1.813 ms atribuídos ao documento `/register` e 978 ms sem atribuição. No login: 1.265 e 944 ms em `1_vgly0gd1oic.js`, 1.015 ms atribuídos ao documento. A URL do documento e “Unattributable” não identificam uma função React ou script específico. Tempo de `bootup-time` por URL não deve ser somado como se fossem fases independentes do trabalho total.
- **JavaScript não utilizado/duplicado:** `unused-javascript` estima cerca de 27–28 KiB no chunk comum em cada rota móvel e, no login, mais 57 KiB no chunk exclusivo. `legacy-javascript-insight` estima cerca de 13 KiB no chunk comum. `duplicated-javascript-insight` não encontrou itens; não há prova de cópia duplicada entre bundles. A economia estimada por Lighthouse não é promessa de ganho real.
- **Terceiros:** `third-parties-insight` não lista scripts externos. A rede Lighthouse contém recursos próprios do domínio nas quatro rotas; isso não prova que nunca haja terceiros após login, interação ou em outras páginas. O `AuthProvider` importa o cliente Supabase dinamicamente apenas se houver cookie de autenticação na montagem; ações de login/cadastro também o importam quando acionadas. Nos cenários anônimos sem interação, não há evidência de que o SDK Supabase tenha sido executado.
- **Cache e compressão:** `cache-insight` não lista oportunidade; `document-latency-insight` marca compressão de texto como aplicada. Não foi possível atribuir problema confirmado a falta de cache ou compressão. O mesmo insight marca resposta de documento da exploração móvel como lenta (607 ms observados); `server-response-time` registra 241 ms no login, 403 ms no cadastro e 532 ms na inicial. O TTFB da decomposição de LCP pode diferir desses tempos por método de cálculo.
- **LCP:** login e cadastro desktop identificam o título da lateral de `AuthShell` como LCP, enquanto o móvel identifica o aviso de cookies; a lateral tem `hidden lg:flex`. A comparação direta de LCP entre perfis, portanto, envolve elementos diferentes. Na exploração desktop, o elemento LCP é o texto da descrição da página. Os subtimings de `lcp-breakdown-insight` descrevem o elemento apontado pela auditoria e não devem ser somados para reproduzir o valor final arredondado de LCP em todas as rotas.

## 4. Evidências encontradas no código

### Arquitetura de renderização

`RootLayout` é Server Component, mas monta `AuthProvider`, `SiteNavbar`, `SiteFooter` e `CookieConsent` em todas as páginas. `AuthProvider` mantém estado global de usuário e expõe ações; em visita anônima sem cookie, seu efeito retorna antes do import dinâmico do Supabase. `SiteNavbar` e `SiteFooter` são Client Components por dependerem de `usePathname`; o rodapé retorna `null` nas rotas de autenticação **após** entrar no limite Client. `CookieConsent` usa estado, `localStorage`, evento global e Radix Dialog, mesmo que o diálogo não esteja aberto. O uso de Client aqui tem motivo funcional, mas o custo de inicialização precisa de atribuição por trace.

`LoginPage` e `RegisterPage` são Client Components de página inteira, apesar de grande parte do conteúdo ser estático. `AuthShell` não declara `use client`, porém é importado pelas páginas Client e participa do respectivo grafo Client. As chamadas `/api/auth/session`, `signInWithEmail`, `signUpWithEmail` e OAuth estão apenas nos handlers; os testes iniciais não exercitaram esses caminhos. `GoogleSigninButton` também só chama autenticação ao clique.

Na inicial, `Home` é Server Component, usa `Suspense` para `FeaturedProjectNote` e `FeaturedProjectsSection`, e predefine prioridade para a imagem do herói. `FeaturedProjectNote` e `FeaturedProjectsSection` chamam `getFeaturedProjects` com limites 1 e 6; a função `cache` de React tem argumentos diferentes nessas duas chamadas, portanto não há comprovação de deduplicação entre elas. A consulta pública `qExploreCars` tem `unstable_cache` de 60 s quando não há busca, o que impede afirmar que cada acesso aciona duas leituras do banco. É hipótese de trabalho repetido no servidor a medir em cache frio/quente, não causa confirmada do TBT no navegador.

Exploração usa Server Component com `Suspense` para `ProjectDiscoveryResults`; os filtros (`ProjectFilters`) são Client Component e importam Radix Dialog. A rota contém fallback/skeleton, mas o Playwright não observou skeleton ou `aria-busy` visível nas capturas após DOMContentLoaded. Isso não prova ausência de streaming antes desse instante nem atribui o TBT aos filtros. `src/app/template.tsx` envolve as rotas com animação CSS de 180 ms; o arquivo é Server Component e não constitui, por si, causa medida de Long Task.

### Recursos e requisições

Nos JSONs móveis, a rede tem 15–18 arquivos JS, com aproximadamente 187 KiB (inicial), 251 KiB (login), 190 KiB (cadastro) e 194 KiB (exploração) transferidos. São tamanhos de transferência, não tamanhos descomprimidos nem tamanho total do build. O CSS principal `2uky7depmb5gs.css` transfere cerca de 16,8 KiB e outro CSS cerca de 0,6 KiB. Login/cadastro carregam três pesos de Inter, três de Montserrat e um de Poppins; a inicial carregou seis fontes (~94 KiB). `src/app/layout.tsx` importa nove arquivos CSS de fonte globalmente; os recursos efetivamente baixados variam conforme uso.

O resumo Playwright registra 63 eventos `requestfailed` nas 20 navegações: 14 inicial, 14 login, 18 cadastro e 17 exploração. Todos os exemplos inspecionados são `net::ERR_ABORTED` em requisições RSC com `_rsc` para `/explorar`, `/atualizacoes`, `/comparar` ou `/rankings`; são compatíveis com prefetch de links globais, mas o motivo exato do abort não foi provado. Os links estão em `SiteNavbar` e `SiteFooter`. Não houve HTTP ≥400 nem erro de console. O potencial desperdício de prefetch e sua contribuição à rede/CPU inicial seguem como hipótese, inclusive porque Lighthouse e Playwright usam perfis distintos.

## 5. Causas confirmadas

1. Há **custo elevado de thread principal sob o perfil móvel Lighthouse** nas quatro rotas; scripts comuns e tarefas longas estão presentes, com agravamento em login/cadastro.
2. Login, cadastro e exploração móveis apresentam **LCP do texto do aviso de cookies**, que só é renderizado após efeito e leitura de `localStorage`; isso torna a métrica sensível ao estado de consentimento e à hidratação.
3. **Fontes e CSS globais** entram no carregamento inicial, incluindo sete fontes e CSS bloqueante nas rotas de autenticação medidas.
4. O login baixa **um chunk adicional com 57 KiB estimados como não usados** no carregamento medido. A origem modular desse chunk permanece não identificada.
5. A imagem do herói da inicial é o **recurso LCP** e seu carregamento durou cerca de 1,06 s no perfil móvel; a descoberta e a prioridade já estão adequadas na amostra.

“Confirmada” aqui significa observação da execução de laboratório e/ou caminho de código verificável, não que uma intervenção específica já tenha efeito causal medido.

## 6. Hipóteses ainda não confirmadas

- Qual fração do custo dos chunks comuns é causada por `AuthProvider`, navbar, rodapé, aviso, React/Next ou outras dependências. Falta sourcemap/treemap com mapeamento de módulos e trace com pilhas de chamada do build publicado. O diretório `.next` local não deve ser usado para atribuir hashes do deploy, sobretudo com alterações locais não commitadas.
- O motivo do chunk extra `19hvplwf37y2e.js` no login e se resulta de prefetch, dependência da rota ou do runtime. O nome hash não permite conclusão.
- Quanto do TBT de cadastro decorre de hidratação React, CSS/layout, animações, runtime Turbopack ou lógica da página. O Lighthouse atribui tempo a URLs, não a componentes; não há React Profiler nem trace de hardware real.
- Se o prefetch de links globais causa bytes ou CPU relevantes antes da primeira interação. Os aborts RSC do Playwright apontam investigação, não quantificam o dano.
- Se consultas de destaque na inicial ou a consulta do catálogo na exploração acrescentam latência de servidor significativa em cache frio. Há cache público de 60 s e uma única amostra Lighthouse por rota.
- Se efeitos visuais (`backdrop-blur`, gradientes, animações CSS) têm custo relevante num Intel Core i3 de terceira geração com 8 GB. O Lighthouse simula redução de CPU, mas nenhum teste foi executado nesse notebook; hardware não é diagnóstico.

## 7. Impacto esperado de cada gargalo

O maior risco perceptível é atraso de resposta a toques e digitação durante o carregamento em CPUs limitadas, compatível com TBT de 2,28–6,45 s e Long Tasks observadas. TBT é um proxy laboratorial; não há INP real. O aviso de cookies altera qual elemento determina o LCP nas páginas móveis anônimas sem consentimento salvo, então uma mudança nele pode mudar a métrica sem necessariamente acelerar o formulário. Fontes/CSS afetam a prontidão visual e a competição pela rede. A imagem da inicial afeta diretamente seu LCP. O chunk extra do login representa bytes e processamento mensurados, mas o ganho de removê-lo é desconhecido.

## 8. Possíveis estratégias de correção, sem implementá-las

1. Obter artefatos/sourcemaps do **mesmo build publicado** e um trace de inicialização com stacks; atribuir `1_vgly0gd1oic.js`, `0x92b1cogv8_d.js`, `19hvplwf37y2e.js` e tarefas de documento a módulos/funções.
2. Medir separadamente primeira visita sem consentimento, visita com consentimento salvo, acesso anônimo e autenticado. Avaliar a apresentação do aviso sem comprometer a escolha do usuário.
3. Avaliar limites Client mais estreitos para navbar, rodapé e telas de autenticação, preservando controles interativos e estado. Validar cada alteração com métricas, não por suposição.
4. Revisar fontes/pesos e CSS inicial por rota, e o custo dos links com prefetch. Para a inicial, testar variantes da imagem respeitando o enquadramento.
5. Medir servidor e cache em rotas de dados; comparar resposta de documento em cache frio e quente antes de alterar consultas.

## 9. Riscos e dependências

- **Comparabilidade:** uma execução por cenário, perfis simulados, elementos LCP diferentes entre mobile/desktop e estado anônimo sem consentimento salvo impedem estimar ganho ou generalizar a usuários reais. PSI retornou HTTP 429 e não há dados de campo/INP.
- **Versão:** o código local tem alterações preexistentes não commitadas, especialmente skeletons e CSS. A auditoria mediu o site publicado; sem identificação do commit do deploy não se garante correspondência exata entre código local e bundle observado.
- **Segurança/UX:** qualquer alteração futura no `AuthProvider` ou consentimento depende de preservar autenticação, RLS, acessibilidade e a preferência armazenada. Mudanças nas fontes podem alterar quebra de texto/CLS.
- **Infraestrutura:** não há evidência para mexer em configuração de Supabase ou Netlify nesta etapa. `cache-insight` está limpo e compressão foi detectada.

## 10. Próximos passos recomendados

1. Identificar o commit e os artefatos do deploy auditado; mapear chunks a módulos e registrar trace de produção com stacks, sem alterar código de produção para esta investigação.
2. Repetir medições leves e comparáveis em mais de uma rodada, nos dois estados de consentimento, para estabelecer dispersão; acrescentar experiência real em dispositivo modesto e, se disponível, dados de campo de INP.
3. Priorizar diagnóstico do JS comum e do LCP do aviso; em seguida examinar o chunk exclusivo do login, fontes/CSS e imagem da inicial.
4. Formular mudanças pequenas e isoladas, cada uma com critério de aceitação para TBT, LCP, funcionalidade de login/cadastro, consentimento e layout. A implementação fica para autorização posterior.
