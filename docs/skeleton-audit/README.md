# Auditoria dos estados de carregamento

Branch: `codex/rebuild-skeletons`. Esta auditoria não altera a página carregada, autenticação, dados ou APIs.

## Inventário de rotas

`6/6` significa comparação visual em 360, 390, 768, 1024, 1440 e 1920 px. `Código` significa que o limite de carregamento e a estrutura foram inspecionados, mas não havia conteúdo autenticado/publicado para comparar com a página real. As variantes condicionais distinguem a configuração local sem Supabase dos estados com dados.

| Página | Skeleton anterior / problema | Correção realizada | Mobile | Desktop |
|---|---|---|---|---|
| `/` | Fallback interno de cards; loading raiz genérico podia substituir a página inteira | Mantido fallback localizado; removido loading raiz | Código | Código |
| `/atualizacoes` | Blocos genéricos, inclusive quando não há dados | Hierarquia de seções e variante vazia | 6/6 | 6/6 |
| `/comparar` | Colunas e áreas de comparação divergentes | Seletor, painéis e tabela responsivos; variante sem dados | 6/6 | 6/6 |
| `/criar-projeto` | Formulário pouco fiel ao local/remoto | Campos e áreas conforme os dois formulários | 6/6 | 6/6 |
| `/explorar` | Filtros/cards sem correspondência ao estado vazio | Cabeçalho, filtros, grid e variante vazia | 6/6 | 6/6 |
| `/garagem` | Perfil presumido mesmo no modo local vazio | Perfil completo e variante de estado local | 6/6 | 6/6 |
| `/notificacoes` | Lista presumida mesmo no estado sem acesso | Lista e variante vazia/sem acesso | 6/6 | 6/6 |
| `/onboarding` | Formulário mesmo quando autenticação indisponível | Formulário de perfil e variante de acesso | 6/6 | 6/6 |
| `/perfil` | Formulário mesmo quando autenticação indisponível | Compartilha variantes de `/onboarding` | Código | Código |
| `/perfil/[handle]` | Estrutura de perfil já existia | Reuso de avatar, métricas e cards reconstruídos; Suspense localizado preservado | Prévia 6/6 | Prévia 6/6 |
| `/projeto/[slug]` | Hero e corpo interno já tinham fallbacks | Base de shimmer ajustada; Suspense interno preservado | Prévia 6/6 | Prévia 6/6 |
| `/projeto/[slug]/editar` | Formulário genérico | Seções e campos do editor | Prévia 6/6 | Prévia 6/6 |
| `/projeto/[slug]/evolucao` | Lista genérica | Métricas e timeline | Prévia 6/6 | Prévia 6/6 |
| `/projeto/[slug]/modificacoes` | Sem `loading.tsx` próprio | Novo skeleton para título e grid de modificações | Prévia 6/6 | Prévia 6/6 |
| `/rankings` | Hero, métricas e pódio inconsistentes | Hero, filtros, pódio e variante vazia | 6/6 | 6/6 |
| `/buscar` | Redirecionamento | Nenhum skeleton próprio necessário | Redireciona | Redireciona |
| `/carros/[slug]` | Redirecionamento | Usa `/projeto/[slug]` | Redireciona | Redireciona |
| `/carros/[slug]/editar` | Redirecionamento | Usa editor de projeto | Redireciona | Redireciona |
| `/carros/novo` | Redirecionamento | Usa criação de projeto | Redireciona | Redireciona |
| `/comunidade` | Redirecionamento | Usa descoberta | Redireciona | Redireciona |
| `/kits` | Redirecionamento | Usa descoberta | Redireciona | Redireciona |
| `/montar` | Redirecionamento | Usa criação de projeto | Redireciona | Redireciona |
| `/projetos` | Redirecionamento | Usa descoberta | Redireciona | Redireciona |
| `/(main)/builds/[id]` | Redirecionamento legado | Usa detalhe de projeto | Redireciona | Redireciona |
| `/(main)/builds/new` | Redirecionamento legado | Usa criação de projeto | Redireciona | Redireciona |
| `/(main)/dashboard` | Redirecionamento legado | Usa garagem | Redireciona | Redireciona |
| `/(main)/explore` | Redirecionamento legado | Usa descoberta | Redireciona | Redireciona |
| `/(main)/profile/[username]` | Redirecionamento legado | Usa perfil público | Redireciona | Redireciona |
| `/(auth)/login` | Página cliente sem loading assíncrono próprio | Nenhum skeleton necessário | Código | Código |
| `/(auth)/register` | Página cliente sem loading assíncrono próprio | Nenhum skeleton necessário | Código | Código |
| `/(auth)/forgot-password` | Página cliente sem loading assíncrono próprio | Nenhum skeleton necessário | Código | Código |
| `/(auth)/reset-password` | Página cliente sem loading assíncrono próprio | Nenhum skeleton necessário | Código | Código |
| `/auth/auth-code-error` | Página de erro estática | Nenhum skeleton; erro permanece distinto | Código | Código |
| `/privacy` | Página estática | Nenhum skeleton necessário | Código | Código |
| `/terms` | Página estática | Nenhum skeleton necessário | Código | Código |
| `/dev-skeletons/[name]` | Inexistente | Prévia restrita a desenvolvimento/teste; 404 em produção comum | 6/6 | 6/6 |

## Componentes e limites

Foram reconstruídos 11 arquivos `loading.tsx`, criado um para modificações e eliminada a substituição global de `/`. O módulo compartilhado passou de 17 para 30 exports reutilizáveis (13 novos), incluindo shell, cabeçalho, texto, botão, avatar, card/grid de projeto, métricas, listas, formulários, estados vazios e composições por página. Foram corrigidos o fallback raiz genérico, filtros mobile exibidos como desktop, alturas de tabela divergentes e estados de lista que apareciam antes de um resultado vazio. O shimmer ganhou contraste discreto e respeita redução de movimento. Navegação global permanece fora dos fallbacks. A prévia forçada só responde em `development` ou com `SKELETON_VISUAL_TEST=1`; em produção normal retorna 404 (verificado por HTTP).

## Comparação visual e validação

As 48 comparações lado a lado estão em [`comparisons/`](comparisons/); as 96 capturas originais (real e skeleton) em [`screenshots/`](screenshots/). O teste Playwright cobre oito rotas públicas vezes seis larguras, verifica overflow horizontal e monitora erros de console, hidratação, página, requests críticos e respostas 5xx. Um segundo teste renderiza cinco prévias de rotas dinâmicas nas seis larguras (30 casos), mas sem par real por falta de dados. Exemplos: [`explorar-390`](comparisons/explorar-390-comparison.png), [`rankings-1440`](comparisons/rankings-1440-comparison.png), [`garagem-1440`](comparisons/garagem-1440-comparison.png), [`criar-projeto-390`](comparisons/criar-projeto-390-comparison.png).

Executar novamente com `SKELETON_VISUAL_TEST=1 SKELETON_ARTIFACT_DIR=docs/skeleton-audit/screenshots PLAYWRIGHT_BASE_URL=http://127.0.0.1:3004 npx playwright test tests/e2e/skeleton-visual.spec.ts tests/e2e/skeleton-dynamic.spec.ts --project=desktop-chromium` contra um servidor iniciado com `SKELETON_VISUAL_TEST=1`. Depois, `node scripts/generate-skeleton-comparisons.mjs` recompõe os pares lado a lado.

Resultados neste checkout: `npm run typecheck` e `npm run build` aprovados; lint direcionado aos arquivos desta tarefa aprovado; auditoria Playwright 78/78 (48 pares públicos e 30 prévias dinâmicas), seguida de 18/18 novas capturas dos três casos ajustados; testes públicos 3/3. `npm run lint` global falha em 10 erros preexistentes de imports/variável não usados em `project-discovery-page.tsx`, `project-modifications.tsx` e `project-rankings-board.tsx`, nenhum deles alterado nesta branch. O teste existente de modificações foi pulado, pois requer projeto publicado.

## Limites reais

Não havia credenciais Supabase nem projeto publicado neste checkout. Por isso, as variantes com dados, páginas dinâmicas e autenticadas foram auditadas pelo código e prévia dos fallbacks, mas não tiveram comparação real↔skeleton nem transição sob rede lenta verificadas. As 48 comparações retratam o estado público/local sem dados; não devem ser interpretadas como validação visual dos estados populados. Uma integração com fixtures autenticadas/publicadas deve repetir a matriz de larguras antes de aprovar esses casos.
