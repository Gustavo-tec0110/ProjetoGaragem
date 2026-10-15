# Projeto Garagem — auditoria técnica independente (13/10/2026)

## 1. Estado inicial do repositório e worktree

- Worktree auditado: `/home/gustavo/Área de trabalho/ProjetoGaragem-performance-etapa-1`; branch efetiva `codex/performance-etapa-1`; HEAD `45da12b79891a244678abf54c66d7e2bd9205b0a`. Base de comparação: `main` e merge-base `a736c95d8276f9b73a42dde0b7f0c79662745f6e`.
- No início havia **zero arquivos staged**, nove arquivos de aplicação modificados sem stage e arquivos novos de formulário de login, relatórios e evidências. Os commits posteriores à base incluem OAuth/SEO, catálogo de modificações, favicon e editor de imagens de perfil. O checkout original em `/home/gustavo/Área de trabalho/ProjetoGaragem` está na branch `codex/profile-image-editor`, com mudanças próprias de skeleton; não foi alterado nem incluído como se estivesse integrado.
- A Fase A foi feita sobre código, diffs e dependências, antes de ler os relatórios anteriores. A Fase B confrontou os achados com os relatórios e JSONs brutos. Nenhum código, configuração, branch, banco ou serviço remoto foi modificado nesta auditoria.

## 2. Escopo real das alterações auditadas

O diff `main...HEAD` contém cinco commits e 144 arquivos (incluindo binários). O diff de trabalho contém nove arquivos rastreados: login, inicial, privacidade, template, termos, consentimento, descoberta, navbar e footer. `src/app/(auth)/login/login-form.tsx` é novo e ainda não rastreado. Foram incluídos os arquivos de documentação e evidência novos, mas não tratados como código em produção. Não há diff staged. As rotas de skeleton e suas alterações no checkout original pertencem a outra worktree e ficaram fora da atribuição causal.

Na aplicação, examinei a fronteira Server/Client do login, prefetch de `/criar-projeto` e `/forgot-password`, layout e rodapé compartilhados, consentimento, projeto/catálogo, upload, ações e RLS de modificações, OAuth, editor de recorte, metadados, imagens e busca. Para comportamento do Next 16.3.3, consultei a documentação local de prefetch e `template.tsx` em `node_modules/next/dist/docs/01-app/`.

## 3. Descobertas independentes da Fase A

Antes de consultar os relatórios, a leitura e as reproduções locais apontaram:

1. O upload de foto de modificação gera caminho `usuario/modifications/uuid.webp`, mas a expressão construída em `validateDraft` exige uma barra invertida antes da extensão. Um caminho válido é rejeitado antes de gravar a modificação. Teste isolado com Node confirmou `acceptsValidPath:false`.
2. O upload acontece antes de salvar o formulário. Fechar, substituir ou falhar ao salvar não remove o objeto enviado; a limpeza só existe ao substituir/excluir uma modificação já persistida.
3. O lint completo falha por dois símbolos não usados nas funcionalidades commitadas; o workflow de qualidade executa `npm run lint` antes do build.
4. `getSafeNextPath` aceita `/\evil.example/path`; `new URL(next, origin)` transforma isso em `https://evil.example/path`. O código é idêntico em `main`: problema preexistente, sem causalidade com as otimizações.
5. A mudança do template reserva espaço antes do streaming e pode evitar o salto do footer. Desativar prefetch reduz trabalho antecipado, mas transfere parte do custo para o clique. A divisão Server/Client do login reduz a área hidratada sem alterar os handlers. Essas três avaliações eram hipóteses de benefício até confronto com as medições.

## 4. Comparação com as evidências anteriores

| Conclusão independente | Estado após confronto | Base objetiva e limite |
|---|---|---|
| Prefetch limitado evita download antecipado do SDK Supabase em visitas anônimas | **Confirmada pelas evidências** | Na etapa 1, o chunk de 63.742 B apareceu em 9/9 execuções de referência e 0/9 finais; JS total da Inicial caiu de 294.999 para 209.691 B. Na etapa 3, Explorar caiu de 298.342 para 212.990 B, com chunk em 5/5 antes e 0/5 depois. Ver `evidencias-otimizacao-performance-etapa-1/{baseline,final}/`, `evidencias-otimizacao-performance-etapa-3/{current-repeat,no-explore-prefetch,final}/` e `statistics.json`. São medições de laboratório e de requisições, não economia demonstrada de CPU. |
| Prefetch limitado melhora LCP/TBT ou fluidez | **Contradita como afirmação de ganho comprovado** | Explorar: LCP mediano 3.722→3.781→3.863 ms e TBT 1.440→1.354→1.415 ms nas séries referência/candidata/final, com amplitudes sobrepostas e TBT final 767–1.911 ms. Não há ganho estável demonstrado; tampouco há prova de piora causal. |
| Desativar prefetch pode encarecer o clique em criar projeto | **Ainda não verificável** | Os JSONs `evidencias-otimizacao-performance-etapa-2/*navigation.json` medem cliques já sem esse prefetch em ambas as variantes comparadas, enquanto a etapa 3 verificou apenas chegada ao destino. Falta A/B equivalente com e sem prefetch, CPU/rede limitadas e usuários autenticados. |
| Template com `min-h-screen flex-none` corrige deslocamento do rodapé | **Confirmada pelas evidências** | `evidencias-performance-continuacao-2026-10-13/{baseline,final}-layout-trace.json`: footer da Garagem Mobile passou de 345→823 px no fluxo anterior e permaneceu em 823 px no final; o evento de CLS 0,337331 do footer desapareceu. O smoke validou o botão de cookies clicável. |
| Template novo piora de fato o LCP de Explorar | **Parcialmente sustentada** | A série A/B/A da etapa 3 mediu LCP maior com template atual, mas o elemento LCP mudou: footer prematuro no antigo, descrição no atual. Assim, a diferença não mede o mesmo conteúdo nem isola atraso de renderização da descrição. Não justifica reverter a correção de CLS. |
| Casca Server do login reduz trabalho de hidratação da página | **Confirmada no código; efeito de desempenho parcialmente sustentado** | `login/page.tsx` deixa de ser Client e `login-form.tsx` retém estados e handlers. O JS medido diminuiu cerca de 1 KB; medianas de TBT variaram e não isolam causalidade por componente. Evidências da etapa 2 mostram navegação e formulários locais funcionando. |
| Consentimento e SEO permanecem operantes | **Parcialmente sustentada** | `evidencias-otimizacao-performance-etapa-3/resultado.json` registra escolha/revogação, links e footer em Mobile/Desktop, sem requisição de Analytics. O código não integra Google Analytics. Layout auth tem `robots noindex` e sitemap remove login/cadastro. Não houve login/OAuth real nem auditoria jurídica completa. |
| Falha nas fotos de modificações, uploads órfãos, lint e redirecionamento | **Ainda não verificável pelas evidências anteriores; confirmados nesta auditoria por código/testes locais** | Os testes anteriores de modificações só abrem página pública e não fazem upload, gravação ou OAuth. Lint completo e reprodução isolada são descritos abaixo. |

Os relatórios de 12/10 foram consultados no checkout original, pois não estão nesta worktree. Lighthouse anterior do site publicado, séries locais e CDP usam contextos diferentes; não foram misturados numa comparação numérica. Não existem dados reais de INP ou de aparelho modesto nesta auditoria.

## 5. Problemas confirmados

| ID / gravidade / origem | Evidência e impacto | Confiança | Correção possível e risco da correção |
|---|---|---|---|
| **A1 · P1 · novo no catálogo:** foto de modificação não pode ser salva | `src/lib/supabase/storage.ts:36` gera `uuid.webp`; `src/app/projeto/[slug]/modificacoes/actions.ts:37-39` constrói uma regex com escape duplo e rejeita o caminho. `src/components/projects/project-modifications.tsx:359-368` usa precisamente esse caminho retornado pelo upload. Reprodução pura: o caminho válido retorna `false` e uma variante com barra invertida retorna `true`. Bloqueia a foto real oferecida pelo recurso; após upload bem-sucedido, também deixa o arquivo sem vínculo quando o usuário tenta salvar. | **Alta** para a incompatibilidade; **média** para incidência remota, sem credenciais de teste. | Corrigir a regex e testar com o gerador real de caminho, criação/edição e caminho inválido. Risco: aceitar caminhos alheios ou formato indevido se a validação for ampliada demais; manter a restrição ao usuário e ao formato. |
| **A2 · P1 · herdado de `main`: redirecionamento externo no `next` da autenticação** | `src/lib/auth/redirect.ts:3-8` bloqueia `//`, mas aceita `/\evil.example/path`; `src/app/auth/callback/route.ts:34,40,53` cria URL absoluta com esse valor. Em Node, `new URL('/\\evil.example/path', 'https://projetogaragem.com.br').href` resultou `https://evil.example/path`. Permite montar um destino externo depois de um callback válido, com risco de phishing. Não se demonstrou vazamento de sessão ou exploração OAuth completa. `git show main:src/lib/auth/redirect.ts` mostrou o mesmo código. | **Alta** para o desvio de URL; **média** para alcance ponta a ponta sem credenciais. | Validar a URL final contra a origem permitida e restringir separadores/normalização, com testes de barras invertidas e formas codificadas. Risco: bloquear `next` legítimos se a normalização for estreita demais. |
| **A3 · P2 · novo no catálogo: uploads órfãos** | `src/app/api/uploads/image/route.ts:89-114` grava o objeto e devolve o caminho antes de persistir a modificação; `src/components/projects/project-modifications.tsx:359-368,437-440` não executa limpeza ao cancelar o diálogo ou abandonar o formulário. `actions.ts:161-163,188` limpa apenas foto antiga de registro persistido. Consome quota e deixa objeto público sem referência; A1 torna esse caminho mais provável. | **Alta** para o fluxo de código, sem contagem de objetos reais. | Vincular upload à gravação ou limpar arquivos temporários ao cancelar/falhar, com reconciliação para fechamentos abruptos. Risco: apagar foto ainda usada se a limpeza não conferir referências antes. |
| **A4 · P2 · novos commits: lint bloqueia o gate de qualidade** | `npm run lint` falhou com `ImageIcon` não usado em `src/components/projects/project-modifications.tsx:9` e `source` não usado em `src/components/projects/project-rankings-board.tsx:511`. `.github/workflows/ci.yml:23-28` executa lint no job de qualidade. O build pode funcionar, mas o job falha. | **Alta**: comando executado nesta worktree. | Remover símbolos obsoletos e repetir lint completo. Risco de correção baixo; preservar a API do componente se houver consumidores. |

Prioridade é impacto, não confiança. A2 é relevante para a plataforma, porém não foi introduzido pela branch auditada. A1, A3 e A4 pertencem ao conjunto acumulado pós-`main`.

## 6. Riscos ainda não confirmados

- **Navegação após clique:** o custo de `/criar-projeto` e `/forgot-password` sem prefetch pode afetar uma ação importante. A navegação funcionou nos smokes, mas não há A/B causal do tempo de clique no estado final, especialmente autenticado e em celular modesto. Não classificado como regressão comprovada.
- **Rotas privadas e RLS em produção:** as policies novas de `project_modifications` restringem leitura a projeto público ou proprietário e escrita ao proprietário, e as Server Actions confirmam usuário e dono. A migration e o estado remoto não foram executados/verificados; não se pode declarar permissão efetiva em produção. O bucket `project-images` é público; o usuário deve tratar imagens ali como públicas. Não foi identificada exposição nova de chave service role ao navegador.
- **Estados de erro do catálogo:** `src/lib/modifications/server.ts:16-53` substitui erros de consulta por listas vazias; uma falha temporária pode aparecer como catálogo inexistente. Impacto prático depende de falha real e ainda não foi medido.
- **Skeleton em navegação lenta:** `evidencias-otimizacao-performance-etapa-3/skeleton-navigation.json` não observou o fallback mesmo com RSC atrasado 2,5 s. Isso não prova ausência do skeleton nem o valida visualmente. A reformulação de skeletons da outra worktree não integra esta branch.
- **Consentimento futuro:** hoje a preferência `analytics:true` só é armazenada, sem script opcional. Qualquer integração futura precisa rever versão e consentimento antes de usar escolhas antigas; não há coleta opcional comprovada agora.

## 7. Alterações tecnicamente aprovadas

- **Remoção do fallback demo** em catálogo/busca: evita apresentar projetos fictícios como resultados reais; não restaram referências a `/demo-projects/` em `src`, `public` ou `tests`. O estado vazio é explícito. É mudança de produto além de performance, mas coerente com preparação para lançamento.
- **Fronteira Server/Client do login:** estrutura estática e metadados permanecem no servidor; `LoginForm` preserva handlers, validação visual e links. Redução de CPU específica não foi provada, mas a decisão tem baixo custo arquitetural.
- **Template compartilhado:** manter `min-h-screen flex-none`; há prova de correção de CLS do footer. O LCP alterado deve ser lido pelo elemento medido, sem perseguir apenas a pontuação.
- **Prefetch seletivo:** redução repetida de transferência anônima foi comprovada. A implementação é localizada e os links funcionam; aprovação condicionada à medição posterior do clique para julgar o equilíbrio de experiência.
- **Imagens e SEO:** herói da inicial já tem `preload` e `fetchPriority="high"`; não há evidência de erro de prioridade. Auth `noindex` e remoção de login/cadastro do sitemap são coerentes. O consentimento oferece controles acessíveis e os smokes não encontraram Analytics ativo.
- **Controles do catálogo:** RLS SQL por proprietário, checagem de propriedade nas ações, rate limit no upload, normalização de imagem e chave service role confinada ao servidor são decisões adequadas no código; a validação remota permanece pendente.

## 8. Possíveis regressões

**Confirmadas no conjunto pós-base:** A1 (foto de modificação) e A4 (gate lint); A3 é falha de ciclo de vida do recurso novo. **Herdada, sem atribuição às otimizações:** A2. **Não confirmadas:** piora perceptível após clique por prefetch desativado; LCP maior em Explorar como lentidão real do mesmo conteúdo; autenticação/OAuth, perfis privados, criação/edição e skeletons sob carga real. Nenhuma alteração da branch justifica revertê-la integralmente. Não recomendo reverter o template, pois isso reintroduziria deslocamento comprovado.

## 9. Testes executados e limitações

| Verificação nesta auditoria | Resultado |
|---|---|
| `git status --porcelain=v2 --branch`, worktrees, log e diffs contra `main` | Confirmados branch, HEAD, zero staged, nove modificações rastreadas e arquivos novos; nenhuma operação de checkout. |
| `npm run typecheck` | Passou. |
| `npm run lint` | Falhou nos dois erros de A4. |
| `git diff --check` | Passou. |
| Reprodução Node da regex de foto e da URL de redirecionamento | Confirmou A1 e A2 sem rede ou dados reais. |
| Revisão de JSONs Lighthouse, Playwright e CDP existentes | Confirmou economia de bytes e correção de CLS; não mostrou ganho consistente de TBT/LCP nem teste de sessão real. |

Não executei novo Lighthouse ou build: os artefatos existentes contêm séries repetidas da versão final, com configuração e IDs de build, e uma nova rodada isolada não resolveria os riscos restantes sem A/B de clique ou credenciais de teste. Não acessei Supabase com conta real, não apliquei migration, não criei projetos, não fiz upload remoto e não validei OAuth ponta a ponta. Screenshots e smokes anteriores cobrem rotas públicas em Mobile/Desktop, sem equivaler a aparelhos físicos ou dados de campo. A auditoria da privacidade jurídica fica fora deste escopo técnico.

## 10. Plano de correção por prioridade

1. **Antes de integração local:** corrigir A1 e provar criação/edição com foto usando um ambiente de teste isolado; corrigir A4 para o gate CI passar. Tratar A3 no mesmo fluxo de foto, incluindo cancelamento e falha de gravação.
2. **Segurança antes de publicação:** corrigir A2 na base comum e adicionar regressões de URL. Por ser herdado, não é prova de que a branch de performance o criou, mas não deve ser ignorado no lançamento.
3. **Após estabilizar o fluxo funcional:** medir tempo do clique até conteúdo útil com e sem prefetch em condições equivalentes, incluindo sessão autenticada e celular modesto; decidir se vale manter todos os bloqueios de prefetch. Inspecionar erros reais do catálogo e skeleton sob resposta lenta.
4. **Somente com dados representativos:** perfilar Garagem/perfil e tarefas longas de componentes compartilhados. Não adicionar refatoração de hidratação, fontes ou imagens por intuição: as séries atuais não isolam ganho causal.

## 11. Avaliação de prontidão para integração local

**Não está pronta para integração local agora.** A1 impede uma função anunciada do novo catálogo e A4 falha no gate obrigatório de qualidade; A3 desperdiça armazenamento durante esse mesmo fluxo. Corrigir e revalidar esses pontos antes de integrar. A2 deve ser resolvido na base comum antes de publicação, independentemente de quem faça a integração. Testes públicos e typecheck positivos não substituem testes autenticados.

Respostas diretas:

- **As otimizações acumuladas são seguras?** Em geral, o template, a divisão do login e a redução seletiva de prefetch não mostraram quebra nas rotas públicas medidas. O conjunto acumulado não pode ser chamado de seguro para integração porque contém A1/A3/A4 e carrega A2.
- **Alguma alteração deveria ser revertida?** Não há prova para reversão ampla. Preservar o template; decidir sobre prefetch após A/B de navegação. Corrigir pontualmente os defeitos.
- **Existem regressões funcionais?** Sim: foto de modificação rejeitada no código, e o gate lint falha. Não foi demonstrada regressão de login/OAuth ou de navegação pública.
- **O desempenho restante justifica novas otimizações?** LCP/TBT de laboratório ainda altos justificam investigação dirigida, não mudanças especulativas. Falta INP de usuários e perfil de CPU atribuível por módulo.
- **O que exige correção antes de integrar?** A1, A3 e A4. A2 é preexistente e requer correção de segurança antes de publicar.
- **O que pode vir depois?** Medição de clique/prefetch, perfil autenticado, estados de erro, skeleton e eventual trabalho em fontes ou consultas, com benchmarks comparáveis.
- **A branch está pronta?** Não, pelos bloqueios reproduzidos acima. Esta avaliação não implica prontidão de deploy.

**Contagem:** P0 0; P1 2 (um novo, um herdado); P2 2; P3 0. Confiança alta nos quatro mecanismos de código; efeitos remotos e de campo têm as limitações indicadas em cada achado.
