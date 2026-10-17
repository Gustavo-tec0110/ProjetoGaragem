# Projeto Garagem — plano de integração final

Preparação em **14/10/2026, America/Bahia**. Escopo: inventário, revisão de compatibilidade e procedimento futuro. Documento criado no checkout desta conversa, `/home/gustavo/Área de trabalho/ProjetoGaragem`, sem editar a worktree de performance ou qualquer outra worktree.

## 1. Decisão técnica e limites

**Podemos iniciar uma integração local de revisão, em uma nova worktree neutra, depois de preservar e conferir os snapshots das fontes. Não podemos considerar o conjunto pronto para publicação.** A integração local deve resolver os deltas de skeletons, incorporar os arquivos ainda não rastreados e repetir os gates no conjunto consolidado. As operações de integração não foram executadas nesta tarefa.

A referência local de `origin/main` já contém login/SEO, catálogo de modificações, favicon transparente e a reconstrução commitada de skeletons. Ainda faltam o editor de perfil e o conjunto não commitado de performance, cookies, correções de autenticação, privacidade, leases e imagens protegidas. Existe uma variante não commitada de skeletons no checkout principal, diferente da variante integrada. Copiá-la integralmente sobre a main removeria funcionalidades mais recentes.

O lançamento exige sete migrations pendentes, confirmação do histórico remoto, backup de banco **e bytes do Storage**, contenção de URLs/cache antigos, manutenção e um único deploy de código compatível. A proteção de imagens passou em testes locais/isolados, mas ainda não foi demonstrada no Supabase e no adaptador real da Netlify. O relatório de backend registrou uma imagem privada descartável acessível anonimamente no bucket público; não houve nova consulta a esse ambiente nesta preparação.

**Nada foi publicado ou aplicado remotamente.** Não houve commit, push, merge, fetch, build remoto, deploy, execução de scripts conectados ao Supabase, alteração de refs, limpeza de worktrees, descarte ou movimentação de arquivos. Foram feitas leituras do Git/código/relatórios e checagens `git apply --check` em diretórios temporários, sem aplicar patches. A única alteração no repositório nesta tarefa é este documento.

### Bases e evidências

- `main` local: `a736c95d8276f9b73a42dde0b7f0c79662745f6e`.
- `origin/main` local: `8841a3acce71a1ce02aec99131423116d174e3d3`, merge da PR #5.
- HEAD de performance e editor: `45da12b79891a244678abf54c66d7e2bd9205b0a`.
- A main local está cinco commits atrás de `origin/main`. **As refs remotas aqui são o snapshot já existente no Git, não uma confirmação do estado atual do GitHub ou do deploy publicado.** Reconfirmar o remoto na próxima etapa antes de escolher a base definitiva.
- Relatórios centrais lidos na worktree de performance: `finalizacao-backend-supabase-2026-10-13.md`, `seguranca-imagens-e-plano-integracao.md`, as etapas 1/2/continuação/3 de performance, cookies, auditoria independente, correções e validações Supabase. No checkout principal: auditoria/investigações de 12/10 e diagnóstico de permissões. Também foi consultado o relatório de skeletons em `origin/main` e o QA do editor.
- A orientação de grants do diagnóstico antigo não é o contrato final: a solução posterior usa projeções públicas restritas. **Não conceder SELECT anônimo à tabela completa de modificações para eliminar o 401.** A limpeza por visita/24 horas também foi substituída pelos leases; não ressuscitar a implementação antiga.
- Consultadas as referências locais do Next **16.3.3**, em `node_modules/next/dist/docs/`, para template, loading, Route Handlers, Image, `updateTag` e `revalidateTag`. Não se propõe atualizar Next/React/dependências nesta integração.

## 2. Inventário do Git

### 2.1 Worktrees

Os números abaixo são anteriores à criação deste plano. Nenhuma worktree tinha alterações staged.

| Worktree | Branch / HEAD | Estado | Destinação |
| --- | --- | --- | --- |
| `/home/gustavo/Área de trabalho/ProjetoGaragem` | `codex/profile-image-editor`, `45da12b` | 10 modificados, 1 exclusão local e 180 novos | Fonte do editor commitado, deltas de skeletons e relatórios iniciais. Preservar integralmente. |
| `/home/gustavo/Área de trabalho/ProjetoGaragem-performance-etapa-1` | `codex/performance-etapa-1`, `45da12b` | 31 modificados e 496 novos | Fonte principal do pacote não commitado. **A branch sozinha não contém esse pacote.** |
| `/home/gustavo/.codex/worktrees/integrate-project-garage` | `codex/integrate-three-deliveries`, `ccccf5f` | Limpa | Entrega já ancestral de `origin/main`. Não reutilizar nem editar a worktree de outro trabalho. |
| `/home/gustavo/.codex/worktrees/rebuild-skeletons/ProjetoGaragem` | `codex/rebuild-skeletons`, `f865a46` | Limpa | Patch equivalente a `ccccf5f`, já integrado. Não reaplicar. |
| `/home/gustavo/.codex/worktrees/baseline-build/ProjetoGaragem` | detached, `6b61a96` | Limpa | Baseline histórica; ancestral da main. Não é base de integração atual. |
| `/home/gustavo/.codex/worktrees/oauth-legal-pages/ProjetoGaragem` | detached, `ff94d46` | Limpa | Páginas legais/verificação antigas já ancestrais da main. |
| `/tmp/projetogaragem-ci-eda6c5f` | detached, `eda6c5f` | Diretório ausente; registro `prunable` | Registro histórico preservado. Não executar prune nesta etapa. |

Há `.env.local` ignorado nas duas worktrees com alterações; o checkout principal também possui `supabase/.temp/` ignorado com vínculo/configuração de CLI. Os valores não foram lidos. Backups de trabalho devem preservar esses arquivos em armazenamento privado separado, sem incorporá-los ao Git ou copiar automaticamente o vínculo Supabase para a nova worktree. `.next`, `node_modules`, relatórios transitórios de teste e arquivos TypeScript gerados não representam entregas pendentes.

### 2.2 Branches e commits exclusivos

“Main exclusiva / branch exclusiva” é `git rev-list --left-right --count origin/main...<branch>`. Hashes distintos não significam necessariamente alterações distintas.

| Branch local | HEAD | Main exclusiva / branch exclusiva | Situação efetiva |
| --- | --- | --- | --- |
| `main` | `a736c95` | 5 / 0 | Desatualizada frente ao snapshot de `origin/main`. |
| `codex/login-seo` | `0992552` | 3 / 0 | `67147f7` e `0992552` já integrados. |
| `codex/final-transparent-favicon` | `0f80ecc` | 3 / 1 | Patch equivalente ao `559640e` da main; já integrado por squash. |
| `codex/favicon-contrast-outline` | `d8e9a74` | 3 / 6 | Seis experimentos anteriores de favicon. Foram superados pelo favicon final; guardar como histórico, não juntar todas as variantes. |
| `codex/profile-image-editor` | `45da12b` | 3 / 3 | Favicon equivalente + dois commits de editor ainda não integrados. Contém também alterações locais independentes de skeletons. |
| `codex/performance-etapa-1` | `45da12b` | 3 / 3 | Mesmo histórico do editor; performance/backend/imagens estão no filesystem não commitado. |
| `codex/rebuild-skeletons` | `f865a46` | 3 / 1 | `git cherry` aponta patch já integrado por `ccccf5f`. |
| `codex/integrate-three-deliveries` | `ccccf5f` | 1 / 0 | Já integrada; o nome da branch não comprova integração do editor ou da performance. |

As cinco entradas entre `main` local e `origin/main` são `67147f7`, `0992552`, `559640e`, `ccccf5f` e `8841a3a`. Os únicos commits de branches locais ausentes de **todas** as refs remotas existentes são `9395207`, `45da12b` e `f865a46`; o último já tem patch equivalente na main. Os dois commits do editor são as entregas locais efetivamente pendentes:

1. `9395207c50ca9232b8c6570afbeaff5d404601fb` — editor de recorte: dialog, geometria, CSS do slider, harness e testes.
2. `45da12b79891a244678abf54c66d7e2bd9205b0a` — interação/QA, ajuste de `profile-form.tsx`, refinamentos do dialog/harness/testes e evidências.

O histórico `main...HEAD` do editor/performance tem 144 caminhos alterados; login/SEO tem 119; favicon final 130; skeletons 284; integração anterior 295. Esses totais incluem alterações herdadas, assets e evidências: **não representam trabalho exclusivo ainda pendente**. A separação por ancestralidade e equivalência de patch acima evita duplicar essas entregas.

Também existem refs somente remotas: `origin/codex/fix-garage-inspiration-selection` e `origin/codex/qa-final-performance` são ancestrais da main; `origin/ci/stabilize-playwright` tem `518f142` e `ca5308d` exclusivos e está 24 commits atrás da main. Não importar essa branch antiga em bloco: qualquer intenção ainda necessária de CI/dependências deve ser comparada com o workflow e lockfile atuais. Nenhuma branch remota foi atualizada nesta tarefa.

### 2.3 Stashes preservados

Foram encontrados `stash@{0}` (`75e003b`, snapshot de 27/09) e `stash@{1}` (`b2890c6`, autostash). Não foram aplicados, alterados ou excluídos.

- `stash@{0}` guarda 16 caminhos rastreados e seis novos: páginas legais, duas migrations de mutação/views e dois testes de dados/hidratação. Quatro versões rastreadas são idênticas à main atual, 11 diferem e `src/lib/projects/demo-projects.ts` foi removido da main.
- `stash@{1}` guarda 19 caminhos rastreados; quatro versões são idênticas à main, 14 diferem e o arquivo de demos foi removido. Inclui lockfile/configurações antigos.
- Os caminhos completos constam no anexo. Diferença de bytes não prova uma melhoria pendente: inclui versões antigas de arquivos hoje evoluídos. Revisar intenção por hunk antes de admitir qualquer trecho. **Não usar `stash pop`, nem trazer demos/dependências antigas para o conjunto final.**

### 2.4 Proveniência dos trabalhos

Há sobreposição de etapas em arquivos não commitados. O Git não consegue atribuir cada linha a um agente ou momento; a atribuição abaixo combina o diff final com os arquivos explicitamente declarados nos relatórios. Quando um arquivo pertence a vários trabalhos, integrar sua **versão acumulada revisada**, sem substituir por um snapshot intermediário.

| Trabalho | Origem e arquivos principais | Classificação |
| --- | --- | --- |
| Login, Google/SEO e catálogo | Commits `67147f7`/`0992552`: layout auth, sitemap, auth shell/botão Google, catálogo/assets, páginas/actions, consultas/tipos e migration `20260929120000` | Já integrado em `origin/main`. Novas correções são incrementais. |
| Favicon | `0f80ecc` ≡ `559640e`: ícones em `src/app`, gerador e evidências; `d18adcb` até `d8e9a74` são alternativas anteriores | Favicon final já integrado. Preservar um conjunto coerente de ícones. |
| Editor de perfil | `9395207` + `45da12b`: `profile-image-crop-dialog.tsx`, `profile-form.tsx`, `src/lib/profile/image-crop.ts`, CSS, harness e `profile-image-editor.spec.ts` | Pronto para incorporação local na ordem dos dois commits. Persistência real com a nova mídia ainda pendente. |
| Skeletons commitados | `f865a46` ≡ `ccccf5f`: loadings, 30 exports, previews/testes visuais/dinâmicos, comparação e evidências | Já integrados. Servem como base das composições. |
| Skeletons locais e rodapé | Checkout principal: `page-skeletons.tsx`, `globals.css`, loadings, preview/teste visual e novo teste público de rodapé | Precisa conciliação; mistura cópia anterior da reconstrução e novos marcadores `data-page-skeleton`. |
| Performance 1/2/3 | Worktree performance: inicial, Navbar/Footer, descoberta e novo `login-form.tsx` + login Server | Pronto para revisão local: prefetch seletivo e menor fronteira Client. Medir latência depois do clique. |
| Template e cookies | Performance: `template.tsx`, `cookie-consent.tsx`, `/terms`, `/privacy`; prefetch no Footer | Pronto para integração local com skeletons conciliados. Banner Mobile cobre “Entrar” antes da escolha: pendência de UX. |
| Auditoria/correções A1–A4 | Performance: redirect seguro, actions/component de modificações, upload, `photo-path.ts`/`photo-storage.ts`, scripts/harness/testes; limpeza de imports em rankings/descoberta | Correções locais testadas; manter a evolução posterior por leases/claims, não a limpeza antiga. |
| Backend/privacidade | Performance: `src/lib/types.ts`, `queries.ts`, `modifications/server.ts`, página/actions/UI de modificações, `car-form.tsx`; migrations 130100/200/250/300, cache em criação/actions, Proxy, testes autenticados/cidade | Contrato novo implementado, ainda não aplicado remotamente. Exige corte com código compatível. |
| Fotos protegidas | Performance: rota `/api/media/project`, `src/lib/images/*`, `ProjectImage`, Navbar, upload, queries/server/tipos/SEO/OG/Proxy, `netlify.toml` + Edge Function; migrations 140100/150/200 | Implementação local revisável. Bloqueio de lançamento até verificação real, backup e retirada da exposição antiga. |
| Limpeza operacional | Performance: leases, `inspect-pending-modification-photos.mjs`, `pending-photo-cleanup-policy.mjs`, claims globais, contenções/preflights | Preparada, não agendada. Ativação independente e posterior aos testes reais de concorrência. |
| Relatórios/evidências | Checkout principal: quatro relatórios + 76 arquivos de performance e 97 de skeletons; performance: 17 arquivos documentais/SQL e 445 evidências, além de scripts/código/testes novos | Preservar os originais e sua origem; não confundir screenshots intermediárias com a versão final. |

Os 31 arquivos rastreados alterados e os 51 arquivos novos fora das pastas de evidência da worktree de performance estão individualizados no anexo, assim como os 11 caminhos rastreados e sete novos fora das evidências do checkout principal. Não há código novo escondido apenas na listagem abreviada do `git status`.

## 3. Compatibilidade, conflitos e pendências

### 3.1 Encaixe textual verificado sem integração

Foram exportados blobs para diretórios temporários e executado somente `git apply --check`:

| Checagem | Resultado | Consequência |
| --- | --- | --- |
| Patch de `9395207` sobre arquivos de `origin/main` | Passou | Editor inicial tem encaixe textual na base atual. |
| Patch de `45da12b` diretamente sobre `origin/main` | Falhou: faltam harness/testes e dialog predecessor | O segundo commit depende do primeiro. |
| Patch de `45da12b` sobre blobs de `9395207` | Passou | Respeitar a ordem do editor. |
| Diff rastreado de performance sobre `origin/main` | Falhou em `playwright.config.ts` | O patch pressupõe o harness do editor já presente. |
| Mesmo diff sobre blobs da main com arquivos do editor em `45da12b` | Passou | Incorporar o editor antes do diff de performance. |

Essas checagens não aplicam arquivos novos nem reproduzem uma árvore consolidada completa. Não houve teste de build/E2E do conjunto final e não se afirma ausência de conflitos semânticos.

### 3.2 Matriz de compatibilidade

| Interseção | Conflito/risco concreto | Resolução exigida no destino |
| --- | --- | --- |
| Skeleton local × skeleton integrado | `page-skeletons.tsx` local remove `DiscoveryFiltersSkeleton`/composições completas e exports `SkeletonEmptyCard`, `LocalGaragePageSkeleton`, `LocalProjectFormSkeleton`, `AccessCardSkeleton` e variantes vazias. Altura de Comparar local é `h-28`, main `h-44`. | Manter a reconstrução completa da main. Portar só deltas adicionais aceitos, como marcadores de skeleton/rodapé. Decidir altura após comparação com a tela real. |
| Loadings duplicados | Exclusão de `src/app/loading.tsx` já está na main; editar/evolução e loading novo de modificações locais são idênticos à main. Criar/perfil/onboarding/Explorar locais diferem de seus refinamentos na main. | Não duplicar a exclusão nem substituir loadings mais recentes sem revisar. Não recriar fallback raiz genérico. |
| Preview/testes visuais | Preview local usa componentes diretamente; main usa loadings efetivos em várias rotas. Dos 99 arquivos locais novos também existentes na main, 31 são idênticos e 68 diferem: são 96 evidências de skeletons e três arquivos de código/teste. Uma evidência adicional só existe localmente. | Manter previews coerentes com loadings finais e guardar evidências alternativas sem sobrescrever homônimos. Preservar `skeleton-dynamic.spec.ts` e gerador de comparações da main. |
| `globals.css` | Editor acrescenta `.pg-crop-range`; skeleton local acrescenta `body:has([data-page-skeleton]) footer { display: none; }` e tem shimmer diferente da main. | Combinar regras separadamente. Manter redução de movimento/contraste; ocultar footer só no skeleton de página, nunca por qualquer botão `aria-busy`. |
| Template × skeleton × Footer/cookies | `min-h-screen flex-none` resolve CLS e clique bloqueado. Marcadores podem alterar altura/visibilidade do Footer e interagir com cache/back-forward. | Preservar crescimento de páginas longas e validar streaming, histórico, erros, empty states, footer e consentimento juntos. |
| Novo teste público do rodapé | Visita `/dev-skeletons/explorar` sem gate `SKELETON_VISUAL_TEST`; produção comum corretamente responde 404. `SiteFooter` já retorna `null` nas rotas de autenticação; preservar esse comportamento. | Ajustar o cenário de preview/gate ou mover sua parte visual para suíte apropriada; manter teste real de footer/conteúdo/histórico. Não abrir previews na produção só para passar testes. |
| Login Server × OAuth | Auth shell/noindex/botão Google já integrados; `login-form.tsx` precisa acompanhar a mudança de `page.tsx`. `getSafeNextPath` endurecido é usado também pelo callback/provider. | Preservar formulário e destino interno; não copiar o login Client antigo. Testar PKCE/callback, renovação, logout e cookies com a nova estrutura. |
| Origem de redirect × canonical | Proxy novo usa origem da requisição; `getRequestSiteUrl`/callback continuam canônicos em `NODE_ENV=production`. Um build local autenticado pode ir ao domínio oficial pelo callback. | Confirmar ambiente/redirects antes de testes OAuth. Não substituir canonical global por localhost; não pressupor que Proxy resolva todos os redirects. |
| Editor × mídia privada | Editor exporta WebP; novo upload devolve URL relativa protegida. Perfis, metadata Auth, avatar Navbar e capas precisam consumir o contrato novo. Triggers rejeitam referência alheia/temporária/reivindicada. | Verificar upload avatar/capa, persistência/reload, novo login Google e fotos reutilizadas por projeto privado. Não restaurar `getPublicUrl` para resolver imagem quebrada. |
| Projeções públicas × UI/queries/tipos | Migrations 130200/250 mudam defaults, acesso a eventos/gastos e descrição/custo das modificações. O código de `origin/main` ainda usa o contrato antigo, também descrito para o site publicado nos relatórios. | Integrar SQL, tipos, actions, formulários e consultas como pacote. Notas privadas nunca migram automaticamente para `public_description`; consentimentos existentes não são reescritos. |
| Cache × privacidade | Query pública cacheada precisa reconsulta de visibilidade; owner não pode entrar no cache público. Código novo versiona chaves e força expiração nas mutações. | Manter chaves versionadas e `no-store` de autorização. Testar custo optativo revogado e público→privado com cache aquecido, inclusive RSC/HTML/OG. |
| Erros de projeções | Em `hydrateCarDetails`, `updatesResult.error`/`expensesResult.error` não são tratados; dados podem virar `[]` e o retorno anuncia `error: null`. Modificações já lançam erro explícito. | Corrigir ou adotar tratamento explícito antes do aceite final; falha de migration/permissão não pode parecer projeto sem eventos/gastos. Testar fixture preenchida e erro de RPC. |
| Upload/modificações × leases × claims | Upload cria lease, editor renova e finalização move. Exclusão usa claim global; falha de compensação pode deixar órfão/claim pendente. | Preservar actions/UI/helpers acumulados. Testar falha no move/DB/remove e corridas; não importar limpeza por visita sem leases. |
| Rota protegida × Next Image × Netlify | Loader usa rota Node/Sharp fora de cache compartilhado; Proxy e Edge Function bloqueiam Storage/mídia dinâmica nos otimizadores. `next start` não reproduz Image CDN. | Incluir `next.config.ts`, Proxy, loader, rota, headers, `netlify.toml` e função no mesmo deploy; conferir adapter/rewrites/regras geradas e Sharp Linux. |
| Assets permitidos × favicon/SEO | Otimizador local permite `/ref`, `/modifications`, `/og-image.jpg`, `/_next/static/media`; Google/Unsplash têm regras específicas. Domínio/caminho legado não canônico pode virar fallback. | Testar todos os assets reais, ícones/manifest, OG e URLs customizadas. Não ampliar allowlist para rotas dinâmicas/Storage. |
| `supabase/schema.sql` × migrations | Snapshot ainda tem defaults públicos antigos e não contém as estruturas novas de imagens/leases/projeções. | Não usar `schema.sql` isoladamente como instalação do contrato final. Validar replay histórico + incrementais em ambiente descartável; documentar/alinhar bootstrap antes do aceite. Nunca reaplicar schema sobre produção. |
| Harnesses/CI × suíte Mobile | `image-security.spec.ts` não está no `testMatch` Mobile atual. CI executa toda a suíte, mas não executa os novos unitários/SQL. Perfil/fotos/preview possuem flags próprios. | Incluir cobertura Mobile explícita e gates offline apropriados na etapa de integração. Auditar skips; ausência de fixture/flag não é aprovação. Build publicável deve ter todos os flags desligados. |

### 3.3 Contrato de segurança que deve permanecer inteiro

- Banco: três RPCs públicas com saída fixa; `note`, `amount_spent` de evento e custo de modificação não autorizado não saem pela leitura pública. Owner usa sessão comum/RLS. Não ampliar grants administrativos para contornar `42501`.
- Fotos: `can_read_project_image` decide pela sessão e referências atuais. Owner tem acesso ao seu caminho; anônimo/B somente a referências públicas válidas; **qualquer referência privada prevalece**. Caminho sem referência não é público. Registro cobre principal, galeria, peças, eventos, modificações, avatar e capa.
- Entrega: autorização antes e depois de download/processamento, `private, no-store` e headers de CDN; sem URL assinada/redirect/304. GET/HEAD devem obedecer à mesma regra. Falha de autorização/banco/Storage não entrega bytes.
- Proteção do provedor: Edge Function sem `cache = "manual"`, cobrindo `/.netlify/images` e `/_next/image`, antes de cache/Image CDN. A documentação confirma a posição padrão das Edge Functions; a correspondência efetiva do deploy ainda precisa ser comprovada. [Ordem de requisições da Netlify](https://docs.netlify.com/resources/troubleshooting/request-chain/).
- Limpeza: nenhum executor ativo; 30 minutos de lease, renovação a cada dois minutos, mínimo de sete dias para temporários, lotes limitados, legacy sem lease preservado, locks/claim e referência global rechecados antes de excluir. Definitivos órfãos exigem inspeção individual.

## 4. Estratégia de preservação e ordem de integração local

### 4.1 Preparação das fontes — antes de tocar o destino

1. Revalidar status/HEAD/hashes deste inventário e confirmar que os responsáveis encerraram as edições relevantes. Mudança concorrente exige novo snapshot; não transportar um diff enquanto ele está sendo alterado.
2. Fazer backup **fora das worktrees**: patches binários separados de working tree e index, cópia dos arquivos não rastreados com caminhos/bytes originais e manifesto SHA-256, refs/commits/stashes em bundle/backup Git, documentos/evidências e configuração local privada separada. Um bundle não contém arquivos ainda não rastreados; `git diff` também não. Conferir leitura e hashes de uma restauração em diretório descartável.
3. Não usar stash/reset/clean/rebase/checkout para “limpar” as fontes. Não editar `performance-etapa-1`, `profile-image-editor`, `rebuild-skeletons` ou `integrate-three-deliveries`. Os originais continuam no lugar.
4. Confirmar a main remota atual na próxima etapa; congelar o SHA de base aprovado. Criar uma **nova** worktree e branch, sugestão `codex/integracao-final-projeto-garagem`. Não usar a `main` local atrasada nem a worktree `integrate-project-garage` como destino. Criação ainda não executada.
5. Definir manifesto de importação no destino. Evidências homônimas de skeletons têm versões diferentes: conservar as versões de origem em subpastas identificadas no destino, sem sobrescrever os originais. Não copiar `.env.local`, `supabase/.temp`, `.next` ou credenciais por atacado.

### 4.2 Ordem recomendada

| Ordem | Lote | Dependências e critérios |
| --- | --- | --- |
| 1 | Base da main confirmada | Inclui login/SEO/catálogo, favicon final e skeletons commitados. Não reaplicar patches equivalentes. |
| 2 | Editor de perfil | Incorporar `9395207`, depois `45da12b`, apenas no destino. Conferir CSS, `profile-form`, harness, pixels exportados e testes. |
| 3 | Conciliação dos skeletons locais | Manter exports/loadings da main; portar deltas de marcador/footer e eventual ajuste visual aceito. Corrigir teste público dependente do preview e preservar evidências alternativas. |
| 4 | Performance, template e cookies | Importar versão acumulada de login/page/form, inicial, Navbar/Footer, descoberta, template, consentimento/termos/privacidade. Resolver CSS/testes do lote 3; manter prefetch seletivo. |
| 5 | Correções de autenticação e lint | Redirect seguro, Proxy com origem correta e limpeza de imports em descoberta/rankings/modificações. Preservar auth shell/noindex/OAuth existentes. |
| 6 | Backend, privacidade e leases | Código/types/actions/UI/queries, scripts/harness/testes e migrations 130100→200→250→300. Não executar SQL remoto. |
| 7 | Proteção completa de imagens | Rota/loader/Sharp, uploads/queries/SEO/OG/Proxy, Netlify/Edge Function e migrations 140100→150→200. Depende do contrato/leases do lote 6. |
| 8 | Testes/configuração/documentação final | Conciliar `playwright.config.ts`, fixtures/helpers, cobertura Mobile/CI offline, preflights/contenções, relatórios e este plano. Tratar stashes/CI legado somente se uma intenção útil ausente for identificada. |
| 9 | Validação da árvore consolidada | Gates locais, SQL isolado, E2E/visual/performance; registrar manifesto exato, resultados e pendências externas. Só então avaliar aceite local. |

Os lotes são uma ordem de revisão, não permissão para publicar versões intermediárias. Arquivos sobrepostos de backend/imagens, como upload, `queries.ts`, `types.ts`, Proxy e `photo-storage.ts`, devem conservar o estado acumulado final. Podem ser importados juntos e revisados por hunk; não é necessário reconstruir estados intermediários inseguros. A integração futura pode usar patches e transporte seletivo ou commits autorizados no destino; **nenhuma dessas operações foi feita aqui**.

Critério de aceite local: cada caminho pretendido rastreado no destino; zero conflitos pendentes; fontes intactas; correções da seção 3 tratadas; gates válidos; nenhuma credencial/harness ativo no artefato publicável. Migrations remotas, OAuth real e validação Netlify permanecem gates externos mesmo depois do aceite local.

## 5. Validação necessária do conjunto consolidado

### 5.1 O que já foi demonstrado e o que não foi

| Evidência existente | Resultado relatado | Limite |
| --- | --- | --- |
| Segurança de imagens, 14/10 | 25 unitários; 107 verificações SQL/HTTP isoladas; 26 Playwright aprovados e três skips previstos; lint, tipos, build e diff-check verdes | Árvore de performance com editor, sem skeletons atuais da main; Auth/Storage/CDN foram fixtures. |
| Backend, 13–14/10 | Sete testes reais autenticados/cidade; login/logout/refresh e isolamento A/B aprovados; inventários originais preservados | Novo contrato público, leases e privacidade de imagens não estavam aplicados no Supabase. OAuth completo não testado. |
| Editor | Pixels/geometria, gestos e exportação; sete casos aprovados e três skips por dispositivo | Upload/persistência real do perfil não testados nessa entrega. |
| Skeletons commitados | 78 casos de auditoria + 18 recapturas; produção normal bloqueia preview | Estados públicos sem dados e previews; transição real/autenticada sob rede lenta incompleta. |
| Performance | Menos download antecipado do SDK; template remove deslocamento medido do Footer | Não prova melhora estável de LCP/TBT/INP nem mede custo da nova rota de imagens sem cache. |

Os resultados acima foram lidos nos relatórios/logs; **não foram executados novamente nesta preparação**. Não transferir a aprovação de um snapshot para outro automaticamente.

### 5.2 Gates locais, sem Supabase compartilhado

Na nova worktree, usar o lockfile e Node compatível com o ambiente de publicação (workflow atual usa Node 24). Não alterar dependências por causa de um autostash antigo. Antes de rodar, conferir scripts/variáveis para evitar rede no Supabase real.

```bash
# Exemplos futuros; executar somente no destino consolidado.
node --test tests/unit/*.test.mjs
PGLITE_MODULE_PATH=/caminho-validado/@electric-sql/pglite/dist/index.js node scripts/test-backend-migrations.mjs
npm run lint
npm run typecheck
git diff --check
```

PGlite não está no `package.json`; o relatório utilizou 0.5.10 em `/tmp/pg-backend-validation`. Conferir disponibilidade/versão, registrar checksum e não presumir persistência desse diretório. O harness lê SQLs reais com Auth/Storage em fixtures, não reproduz todo o Supabase. Fazer também replay do histórico completo em PostgreSQL/Supabase descartável **já disponível e aprovado**, sem reset de produção ou replay remoto automático.

Para a primeira rodada de build/UI local, definir explicitamente `NEXT_PUBLIC_SUPABASE_URL=''`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=''` e `SUPABASE_SERVICE_ROLE_KEY=''`; não deixar `.env.local` preencher destinos remotos. Build de produção local e `next start`, origin `127.0.0.1`; `PLAYWRIGHT_BASE_URL` deve ser local. Usar flags de harness/preview apenas no servidor de teste, depois validar também um artefato sem elas.

Cobertura mínima:

1. Público/desktop/mobile: inicial, explorar com/sem dados, busca/filtros, rankings, atualizações, perfis/projetos inexistentes e reais, comparar, links e histórico voltar/avançar; sem erros de console/hidratação/5xx ou overflow.
2. Skeletons: 360/390/768/1024/1440/1920 px, estados vazios/preenchidos, rotas dinâmicas e autenticação. Atrasar a resposta real/RSC e observar fallback→conteúdo; preview forçado sozinho não valida transição. Footer oculto só no carregamento de página e acessível depois; redução de movimento respeitada.
3. Cookies: primeira visita, escolha antiga, aceitar/recusar/configurar, salvar/revogar/reabrir pelo rodapé, teclado/foco/escape e links legais. Confirmar ausência de analytics. Avaliar banner sobre o login em tela pequena sem cliques forçados nos testes.
4. Editor: arraste, roda, slider, teclado, pinça, troca/cancelamento, dimensões e correspondência de pixels; depois fluxo real de upload/reload no ambiente aprovado.
5. Modificações: criar/editar/substituir/excluir, descartar upload, lease negado/expirado/reivindicado, falha no move/DB/Storage/compensação e preservação da imagem anterior. Nenhuma edição de custo ativa consentimento por omissão.
6. Imagens: todos os tipos, original e variantes, parâmetros inválidos/duplicados/aliases, HEAD, MIME, falhas seguras, optimizer negando Storage/OG/dinâmica e otimizando assets permitidos; testar Mobile explicitamente.
7. SEO: canonical oficial, redirect do subdomínio, auth/testes noindex e fora do sitemap, favicon/Apple/manifest como conjunto único, OG público/fallback e ausência de metadados de projeto privado.
8. Artefato publicável: `PROFILE_IMAGE_EDITOR_TEST_HARNESS`, `MODIFICATION_PHOTOS_TEST_HARNESS`, `SKELETON_VISUAL_TEST` ausentes/desligados e suas rotas retornando 404. Nenhuma service role em JS cliente, HTML, logs ou documentação pública.

Repetir Lighthouse apenas em série controlada local do conjunto final, sem testes concorrentes: primeira visita/consentimento salvo, Desktop/Mobile, cache frio/quente e catálogo representativo. Medir bytes/RSC antecipados, tempo de clique→criar projeto, LCP do **mesmo elemento**, CLS do Footer, TBT e latência das imagens. Não usar o LCP antigo do Footer como comparação de ganho da descrição; não apresentar TBT como INP de usuários.

Não executar `scripts/qa-supabase.mjs` ou `scripts/run-e2e-official.mjs` por conveniência: relatórios apontam ref legado fixo/escritas e dependência de `cmd.exe`. `validate-backend-real.mjs` e inspeção/limpeza também têm acesso remoto e só cabem na etapa autorizada com destino confirmado.

## 6. Migrations, permissões e sequência de aplicação futura

O baseline tem 37 arquivos de migrations; a worktree de performance acrescenta sete, totalizando 44. A correspondência com 37 versões remotas foi uma observação anterior, não confirmada hoje. Não editar/renumerar migrations históricas para “organizar” a integração. Usar versões exatas, histórico registrado e SQL revisado.

| Ordem | Migration | Pré-condição e efeito | Impacto no site antigo |
| --- | --- | --- | --- |
| 1 | `20261013010000_restrict_modification_photo_ownership.sql` | Conferir as duas policies e correção manual anterior; aplicar/reconciliar pelo mecanismo aprovado, depois verificar versão/efeitos | Guarda de pasta própria. Não marcar aplicada só porque um teste HTTP passou. |
| 2 | `20261013020000_private_modifications_public_projection.sql` | Tabelas existentes; defaults privados, `public_description`, `show_paid_amount`, owner SELECT e três projeções públicas | **Incompatível** com algumas leituras públicas antigas de eventos/gastos/modificações. |
| 3 | `20261013025000_private_expense_defaults_atomic.sql` | Após 200; confirmar `md5(prosrc)` de `save_car_project_atomic`: `93d377d5f735c7a4aa568dcd312b0a7d` ou `15701d0fe6677e752c58cbef63bf3ab1` | Troca defaults omitidos; aborta se corpo remoto divergir. Hash de `pg_get_functiondef` não equivale a hash de `prosrc`. |
| 4 | `20261013030000_pending_modification_photo_leases.sql` | Tabelas/Storage anteriores; leases e RPCs; conceder executor apenas a `service_role` | Aditiva, mas necessária para novos uploads. Não liga agendador. |
| 5 | `20261014010000_project_image_access_registry.sql` | Após leases; tabelas de imagens existentes, inventário/backfill/owners; locks de escrita, registry, triggers e claims | Bucket ainda público. Referências novas indevidas passam a falhar; revisar legado antes. |
| 6 | `20261014015000_project_image_cleanup_guards.sql` | Depende de 130300 e 140100 | Limpeza usa referências globais/claims, sem alterar retenção ou ativar executor. |
| 7 | `20261014020000_activate_private_project_images.sql` | Registro/RPC preparados, bucket **existente** e RLS Storage ativa; aprovação da manutenção/corte | **Incompatível com URLs públicas do site antigo.** Bucket privado, acesso direto/assinatura/escritas por anon/authenticated bloqueados. |

Preflight futuro: `docs/sql/preflight-backend-2026-10-13.sql` e `docs/sql/preflight-imagens-2026-10-14.sql`, executados apenas no projeto confirmado. Ref anterior: `hxqhudfzdwfxnjzmphya`; não é autorização nem comprovação de que a configuração atual aponta para ele.

Além das saídas dos scripts, conferir owner/ACL/`search_path`/SECURITY DEFINER das funções, grants `PUBLIC` herdados, RLS permissiva e restritiva, índices/triggers/constraints, view `public_profiles`, histórico exato, defaults e corpo/hash da RPC atomic. Não trocar a view pública para `security_invoker` sem analisar o contrato. Guardar resultados com caminhos privados fora do Git e de artefatos públicos.

A primeira migration registra uma correção manual já relatada: comparar o efeito integral com o SQL antes de aplicar/reconciliar. **Não usar `migration repair` para pular validação**, nem `supabase db push` contra um vínculo ignorado sem conferir que somente essas sete versões serão aplicadas. Se hash/policy/bucket/tabela divergir, parar, manter manutenção e revisar uma correção incremental; não ampliar grants ou remover a guarda.

Após cada lote, verificar os efeitos esperados e o registro da versão. A notificação de reload schema do PostgREST não comprova por si só que todas as RPCs foram carregadas. Testar REST/RPC com anon, A e B. Verificar que EXECUTE privilegiado da limpeza continua inacessível a usuários comuns.

## 7. Backup e tratamento de imagens antigas

### 7.1 Backup obrigatório, antes do corte

1. Confirmar com o responsável o recurso de backup atualmente disponível; relatórios não comprovam PITR ou ponto de restauração. Não criar recurso pago para preencher a lacuna sem autorização.
2. Exportar schema/dados/roles/grants/policies/functions/triggers/histórico e metadados relevantes de Auth/Storage por ferramenta aprovada. Conferir escopo e possibilidade de restauração. Restringir acesso; não expor senhas/tokens.
3. Inventariar/download dos **bytes de cada objeto** do bucket, junto com caminho, tamanho, MIME/cacheControl/metadados e SHA-256; inventariar referências em todas as tabelas, arrays, perfil/metadata Auth e leases. Backup SQL inclui metadados, não os objetos do Storage. [Limite do backup Supabase](https://supabase.com/docs/guides/platform/backups).
4. Validar leitura de todos os objetos e restauração de amostra em destino privado aprovado; comparar hashes, contagens e referências, registrar data/ref/manifesto. Backup inacessível ou sem bytes reprova o gate.
5. Congelar escritores durante o corte; repetir delta do inventário/backup imediatamente antes das migrations. As contagens antigas de dez usuários/dois objetos são históricas, não o inventário de implantação.

### 7.2 URLs e caches históricos

Converter a UI para `/api/media/project/...` e tornar o bucket privado não prova retirada de todas as cópias. O upload antigo usava cache de um ano. Precisam de verificação as URLs públicas/signed/render antigas e os caches de Storage, browser e Netlify. URLs assinadas usam chave separada e não são revogadas por rotação das chaves Auth. [Entrega e assinatura Supabase](https://supabase.com/docs/guides/storage/serving/downloads).

Incluir no inventário: domínio canônico, subdomínio Netlify, deploy aliases/URLs imutáveis antigos ainda acessíveis, eventuais domínios customizados de Storage, `/_next/image`, `/.netlify/images`, `/api/og`, links public/signed/render e URLs exatas aquecidas anteriormente. A Edge Function nova é parte do novo deploy; **não presumir que ela proteja automaticamente URLs de deploys antigos**. Conferir também skew protection/encaminhamento para versões antigas: manter clientes antigos fora do corte ou exigir reload; não encaminhar consultas privadas ao código anterior. [Funcionamento do adaptador Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

Testar URLs exatas, sem alterar query para burlar cache, com A/B/anônimo, clientes frios e pelo menos duas origens/regiões disponíveis. Registrar status, bytes, `Age` e cache status. Falta de nonce não é deficiência: o objetivo é testar a cópia já existente. Inspecionar disponibilidade real de purge/revogação no plano; não presumir Smart CDN pago. Não há como retirar bytes legitimamente já baixados de uma máquina externa.

Se não houver prova de retirada/expiração/revogação de tokens/cache, preparar **rotação autorizada dos caminhos**, com `scripts/plan-project-image-cutover.mjs` em inventário privado offline. O script só gera mapa; não é executor de migração. Conferir caminhos externos/não canônicos, objeto ausente, pasta alheia e colisões. Fotos externas de terceiros não se tornam privadas por RLS: importar/substituir com autorização ou documentar/remover a referência conforme decisão do responsável.

Rotação futura, sempre em manutenção e com bucket privado:

1. Copiar para novas chaves próprias sem sobrescrever; conferir tamanho/hash/bytes. Preservar formato final de modificações e revisar temporários/leases.
2. Atualizar todas as referências em transação com condição de valor anterior, incluindo arrays, storage_path, perfis e metadata Auth aplicável; conferir registry/triggers e journal por objeto.
3. Somente depois de cópia/referências verificadas e autorização específica, remover cada original pela API Storage, rechecando referência/editor ativo. Nunca apagar `storage.objects` por SQL.
4. Confirmar purge/expiração e negar URLs antigas exatas, inclusive assinadas e caches de otimizadores/deploys antigos. Se alguma ainda entregar bytes, não reabrir.
5. Recuperação sempre para nova chave privada; não restaurar um caminho antigo coberto por token/cache. Falha de remoção é pendência de exposição, não sucesso parcial aceitável para lançamento.

## 8. Procedimento para o único deploy consolidado

Todas as operações remotas abaixo são **futuras e dependem de autorização**. Não foram executadas.

1. **Aceitar a integração local:** resolver pendências, repetir gates e congelar versão/manifesto. Conferir que o código publicável acompanha as sete migrations e não inclui flags de teste.
2. **Confirmar destinos e configuração:** ref Supabase, site/branch de produção Netlify, ambiente/Node/adapter, segredo server-side, scopes de variáveis, build/publish/rewrites, Edge Function e bundling de Sharp. As bibliotecas/fontes atuais ficam no lockfile; registrar versão do adapter efetivamente usada. Nenhum segredo no prefixo `NEXT_PUBLIC_*`.
3. **Preparar execução única:** combinar o caminho commit/push/build/deploy previamente aprovado, evitando que push, PR, preview ou branch deploy publiquem antes das migrations. Alterações em automação Netlify/GitHub só com autorização. Se for necessária validação extra no provedor antes do corte, obter escopo explícito; ela não está incluída automaticamente na regra de um deploy.
4. **Validar ambiente isolado real já aprovado:** migrations, REST, Storage, contas A/B, OAuth de teste e concorrência com múltiplas conexões. Não usar staging com credenciais/dados de produção por omissão. Não criar serviço pago.
5. **Fazer preflight/backup conferido:** seção 6/7, resolver URLs legadas/externas/referências inconsistentes, confirmar mapa/journal/purge e plano de contenção. Informar indisponibilidade esperada ao responsável.
6. **Entrar em manutenção aprovada:** barrar páginas/escritas/uploads/executor e acesso operacional de clientes antigos. A manutenção apenas na interface não fecha o endpoint público de Storage. Não acrescentar fotos privadas ao bucket ainda público durante a transição.
7. **Aplicar as sete migrations na ordem:** reconciliar 130100, aplicar contrato/defaults/leases, preparar registry/backfill/guards e ativar bucket privado. Conferir saída/registro em cada etapa. Nesse intervalo a versão antiga pode perder leituras e fotos; manter manutenção. Não prometer corte sem indisponibilidade.
8. **Retirar a exposição histórica:** rotação/purge/revogação necessários e autorizados, backups/journal preservados; confirmar inventário/referências/bytes. Não reaplicar migrations históricas que reabram o bucket.
9. **Executar um único deploy consolidado Netlify:** incluir loader/rota/Proxy/Edge Function/SQL versionado, build de produção sem harnesses, ambiente correto e Sharp. Registrar deploy ID/SHA/adapter/logs. SQL não é executado automaticamente pelo `next build`; a aplicação das migrations continua separada e coordenada.
10. **Testar ainda em manutenção:** permitir acesso controlado aos validadores e executar a matriz abaixo. Confirmar guards no provedor antes de cache, sem depender apenas de `next start`. Verificar endpoints/aliases de versões antigas.
11. **Reabrir só após todos os gates:** autorização de reabertura, checks de privacidade/auth/navegação/recursos aprovados e nenhum vazamento histórico pendente. Executor de limpeza permanece parado até sua própria validação/autorização; não é pré-condição para reabrir se o comportamento conservador for aceito.

### Matriz real de aceite antes da reabertura

| Área | Exercício real | Aceite |
| --- | --- | --- |
| Login/sessão | Email/senha A/B, refresh, reload, nova aba, logout, rotas protegidas, `next` malicioso | Sessão/destino correto, sem acesso cruzado/redirecionamento externo. |
| Google OAuth | Fluxo interativo completo no domínio oficial, callback PKCE, erro/cancelamento e sessão após reload/logout | Não basta 302 para Google. Perfil/avatar persistem conforme contrato. Não enviar credenciais no chat. |
| Notas/custos | REST direto e RPCs anon/A/B, projetos públicos/privados, defaults omitidos, consentimento ativado/revogado | Notas/email/nome privado ausentes; custo só com consentimento correspondente; owner conserva dados. |
| Imagens | Principal/galeria/peça/evento/modificação/avatar/capa/temporário, original/variantes GET/HEAD | A autorizado; B/anônimo negados para privado com **zero bytes**; fotos públicas permitidas; todos os headers no-store preservados. |
| Cache aquecido | Aquecer foto/HTML/RSC/OG público, tornar privado e repetir URLs exatas como B/anônimo; depois tornar público | Nenhuma imagem/dado privado entregue por cache/optimizer após revogação; nova requisição pública volta a funcionar. |
| Referências globais | Mesmo objeto em projeto público/privado/perfil; remover/trocar/excluir referências | Privado prevalece; reaproveitamento não contorna ACL; nenhum original válido perdido. |
| URLs antigas | Public/signed/render Storage e caches exatos `/_next/image`/`/.netlify/images`/OG em todos os hosts/deploys inventariados | Nenhuma URL histórica indevida entrega bytes; relatório separado para cópias já baixadas. |
| Upload/editor | Todos os tipos, quota, imagem inválida, avatar/capa recortados, salvar/reload, cancelamento/troca/exclusão | Bytes e linhas consistentes; rollback/compensação preserva anterior; URLs retornadas protegidas. |
| Corridas/limpeza | Conexões reais com renovação/salvamento/reivindicação, referência surgindo durante limpeza e Storage falhando | Nenhuma remoção com lease/referência ativa; claims não ressuscitam; legacy sem lease preservado; inspeção primeiro. |
| Navegação/UX/SEO | Mobile/Desktop e larguras da auditoria; fallback→conteúdo, footer/cookies/login, busca/filtros/perfis/projetos/edição; canonical/favicon/OG | Sem 5xx/hidratação/overflow, controles acessíveis, metadados privados ausentes e previews 404. |

Usar dados próprios descartáveis com registro de IDs/caminhos e inventário anterior/posterior; não selecionar dados preexistentes para exclusão. Limitar a rodada à matriz acordada. Aprovação de leitura remota não autoriza criar/excluir contas/objetos automaticamente.

### Se houver falha

Manter manutenção, bucket privado, uploads/executor parados e backups intactos. Usar, após aprovação e conferência das funções existentes, `contencao-backend-2026-10-13.sql` e/ou `contencao-imagens-2026-10-14.sql`. A contenção de imagens supõe as estruturas aplicadas; não executá-la cegamente antes delas. Reparar adiante e retestar.

**Não voltar ao bucket público, ao SELECT permissivo ou ao código antigo que gera URLs públicas.** Rollback de deploy isolado não desfaz contrato SQL com segurança e pode reabrir caminhos/cache antigos. Recuperação do banco/objetos deve preservar os controles privados, usar chaves novas quando necessário e ser validada em manutenção.

## 9. Créditos, CPU, banda e processamento

O plano/limite/saldo efetivo da conta Netlify não foi consultado. Nos planos atuais baseados em créditos, a documentação informa 15 créditos por deploy de produção, 10 por GB-hora de compute, 20 por GB de banda e dois por 10 mil requisições. Esses números são condicionais ao plano e precisam ser reconfirmados no momento da publicação. [Cobrança Netlify](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/).

O único deploy evita publicações repetidas, mas não elimina custo de tráfego/processamento. A nova mídia privada não usa cache compartilhado: cada GET autorizado pode baixar o original do Supabase, fazer duas consultas de autorização e gerar WebP com Sharp. HEAD também percorre o processamento atual. Não há limiter específico nessa rota no código inspecionado. **Inferência de capacidade:** CPU/tempo de função, consultas e egress podem aumentar com muitas variantes/reloads, mesmo mantendo miniaturas responsivas.

Antes de reabrir, medir requisições por página, tamanho do original/variante, duração/CPU/memória/p95 de função, chamadas RPC, egress Supabase e saída Netlify. Registrar volume esperado e reserva de quota para testes/correção. Estimativa condicional de créditos: `15 × deploys + 10 × GB-hora + 20 × GB + 2 × (requisições / 10.000)`; comparar com o medidor real e outras cargas da conta, sem assumir arredondamento ou quota disponível.

Manter larguras/qualidades limitadas, `withoutEnlargement`, WebP normalizado, `sizes` correto e lazy loading fora da imagem principal. Fazer testes locais sequenciais, pequenos lotes de validação remota e inspeção de temporários por índice/limite. Avaliar contenção de abuso/rate limit disponível e capacidade antes do aceite operacional; não habilitar recurso pago. **Não “otimizar” custo ativando cache público de mídia privada**, removendo segunda autorização ou voltando a URLs assinadas longas. Nova medição é necessária: as antigas métricas não incluem essa arquitetura.

## 10. Classificação final e operações futuras

| Estado | Itens | Próxima ação |
| --- | --- | --- |
| **Já integrado** | Login/SEO, catálogo, favicon final, skeletons commitados e trabalhos históricos ancestrais | Partir da main confirmada; não duplicar. |
| **Pronto para revisão/incorporação local** | Dois commits do editor, performance/prefetch/login Server, template/cookies, correções A1–A4, contratos backend/imagens, scripts/testes/preflights/contenções | Preservar fontes; importar no destino por dependências e validar conjunto. |
| **Precisa conciliação/correção local** | Skeletons que removeriam exports/refinamentos, CSS/footer, teste público de preview, cobertura Mobile/gates CI, tratamento de erros de RPC de detalhes, bootstrap com SQL completo | Corrigir exclusivamente no destino da integração; não alterar fontes nesta preparação. |
| **Precisa decisão/validação operacional** | Banner sobre login Mobile, redação/contato/prazos legais conforme operação real, intenções úteis de stashes/CI legado, URLs externas/não canônicas, capacity/rate limit | Registrar decisão e evidência; não alegar prontidão sem tratar o impacto. |
| **Depende de autorização remota** | Preflight/backup privado, testes reais, migrations/ACLs/bucket, manutenção/reabertura, rotação/cópia/remoção/purge, variáveis/configuração e deploy | Autorizar cada escopo concreto quando preparado; executar só na etapa futura. |
| **Depende de autorização Git/publicação futura** | Commit/push/integração em branch de publicação e controle de builds automáticos | Não autorizado nesta tarefa. Evitar push que gere deploy prematuro. |
| **Opcional posterior, com gate próprio** | Agendador/exclusão periódica de temporários, otimizações adicionais de fontes/consultas | Manter desativado até teste concorrente/autorização; não contratar recursos. |

**Resposta final:** a integração local de revisão pode começar em uma nova worktree, com backup/hashes verificados, editor primeiro, skeletons conciliados e pacote acumulado transportado sem perder arquivos novos. Serão necessárias a criação do destino, incorporação seletiva dos dois commits e dos diffs/arquivos novos, correções identificadas e validação completa. A integração final publicável permanece condicionada aos gates externos. Nenhuma operação de integração ou publicação foi executada aqui.

## 11. Anexo de inventário verificável

As listas abaixo foram geradas de um snapshot anterior à criação deste plano. `M` = modificado; `D` = exclusão **já existente** no working tree; `?` = arquivo novo não rastreado. “Main” compara os bytes do arquivo local com o blob de `origin/main`: idêntico, diferente ou ausente. Não indica aprovação de conteúdo. O SHA-256 identifica a versão preservada; este plano fica fora da contagem inicial.


### 11.1 Checkout principal — skeletons e relatórios

Origem: `/home/gustavo/Área de trabalho/ProjetoGaragem`; HEAD `45da12b79891a244678abf54c66d7e2bd9205b0a`.

| Estado | Caminho | Main | SHA-256 local |
| --- | --- | --- | --- |
| M | `src/app/criar-projeto/loading.tsx` | diferente | `76429cb4f1ac9450f71ffc2cb3a9310d043e1904715a3bae5314d2dfe2997f35` |
| M | `src/app/explorar/loading.tsx` | diferente | `9e3ff94bc04e941f6cebd04711a349e805e8df2da494ed584c00d78fc4b74667` |
| M | `src/app/globals.css` | diferente | `f557bc64ae9bf3d298f20fcb43cde0284fe6f10e1a3037119bacb6e54d23dc4f` |
| D | `src/app/loading.tsx` | ausente | `arquivo ausente no working tree` |
| M | `src/app/onboarding/loading.tsx` | diferente | `2c92afbdeeda6e7acbef9983e787f68a337ffb396f2e282f45cd4e58af768c01` |
| M | `src/app/perfil/loading.tsx` | diferente | `5a13492d872a3a66c2703a6efaad882ae243602c67d4b873e9769217d1e41403` |
| M | `src/app/projeto/[slug]/editar/loading.tsx` | idêntico | `99dda1c6b4c0bfaacf4d4fd9229b8476dd88ab55f70008bc56e6c3f6faff58a4` |
| M | `src/app/projeto/[slug]/evolucao/loading.tsx` | idêntico | `a1ed8b33116a3a99ba7d88b112e4d4063e375ae3b862816833ce3be103c22c25` |
| M | `src/app/projeto/[slug]/loading.tsx` | diferente | `5ad4333410051d9f87098875a936bc431809e30739d4462638e493635fc9cd98` |
| M | `src/components/ui/page-skeletons.tsx` | diferente | `77bd3db56e1c65abaff15f56893f210fce86abb3c26358b8cc5579f1ba68e9cb` |
| M | `tests/e2e/public.spec.ts` | diferente | `8586372b47527bb9465a888ce6fe620d7466e2e0ee77f9af8c302d4e5e5d7699` |
| ? | `docs/auditoria-performance-2026-10-12.md` | ausente | `f605d8bdf83ede353f6e5842ccf35f7041845f3d7633ae744e135dcec0b28c29` |
| ? | `docs/diagnostico-permissoes-supabase-2026-10-13.md` | ausente | `6eefe1096f94e6d8022bedda7235206e5c0ea659ae4edfa49b748f6271f4b6c5` |
| ? | `docs/investigacao-final-performance-2026-10-12.md` | ausente | `a11183b1b1b96eeb32a09a58c127f3783d62c871a36b7002e05ec6033a5ee3e5` |
| ? | `docs/investigacao-performance-2026-10-12.md` | ausente | `7884c7e1c7e37de5bb40b18ddde0fc62b6a30cf4bceaa264e6409ef7b5403bd8` |
| ? | `src/app/dev-skeletons/[name]/page.tsx` | diferente | `213d48a098d8d561749f230cbd94186361542b440de3c0ac27cbc63faf142449` |
| ? | `src/app/projeto/[slug]/modificacoes/loading.tsx` | idêntico | `b587057a01066683d2bacc70e06b8fa0686e08392a2b626e66119be19669ab25` |
| ? | `tests/e2e/skeleton-visual.spec.ts` | diferente | `1fa573c526135e919f8fe875cf3871c225d0e3cb7796816717b786deb1b4e57e` |

Pastas de evidências, com todos os caminhos e versões preservados:

| Pasta | Arquivos | Novos locais | Iguais à main | Diferentes da main | Ausentes na main | Hash do manifesto |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `docs/evidencias-performance-2026-10-12/` | 76 | 76 | 0 | 0 | 76 | `57bf51ee4a3dcf2094914d592750372758b668c112f3e5943f7834b7f3d45795` |
| `docs/skeleton-audit/` | 97 | 97 | 30 | 66 | 1 | `5baadbca93dcaaa49aaabf27dec0c7e86dd8903fbc91f6105b774a6f8ba0c2b6` |

<details>
<summary>docs/evidencias-performance-2026-10-12 — manifesto completo</summary>

```text
estado  SHA-256                                                           bytes  caminho
?       e6bb41b4aa24234133dc08f19e1790c92c587557c4b98bdeebdbe06e965b6da8    332846  docs/evidencias-performance-2026-10-12/final/cadastro-mobile-cpu-profile.json
?       b0d6c3121b5424dd70f7ccd24cffdc33089d104e97f21ade890aa12fadd31e78      4348  docs/evidencias-performance-2026-10-12/final/cdp-profile.cjs
?       053423cbb5367fcf1eb12d631087566ca7421109b2fe60fec71a190b7438c3bc     21033  docs/evidencias-performance-2026-10-12/final/cdp-summary.json
?       8a9ca7e3134efc8c6bc41edb9ea9a2993851a1acde1f91d65047fee75423b48f    350252  docs/evidencias-performance-2026-10-12/final/consent-saved-cadastro-mobile-cpu-profile.json
?       4bda1d70d456ad468a2e6319f2d69cc96e2d686f4dd9a60ade4b4c83153922c9     13314  docs/evidencias-performance-2026-10-12/final/consent-saved-cdp-summary.json
?       6293360696bdf20594a9d04000fbef9f6023a073ff6754fc6ea35386f9fd260f    322749  docs/evidencias-performance-2026-10-12/final/consent-saved-login-mobile-cpu-profile.json
?       066ef48add7903884e011d765a5109f13933576a66f9cab3c413172b1599f48c    355088  docs/evidencias-performance-2026-10-12/final/inicio-mobile-cpu-profile.json
?       a7e9a2608802852897fa18d257f97b4feb29e4167ea1531437225f906403d8da    374252  docs/evidencias-performance-2026-10-12/final/login-mobile-cpu-profile.json
?       e9ebafe978bc8e295b453e45d31f9bc878e7ee4c3d9b544cb5b24e1c7080283f    248890  docs/evidencias-performance-2026-10-12/lighthouse/cadastro-desktop.json
?       6fca679dff881a610501591c2f86d071cea89f36e78526f632dc8c83eb42d273        62  docs/evidencias-performance-2026-10-12/lighthouse/cadastro-desktop.log
?       e8241fe17616397bae4bf765dee8423eecaac3f99628bd73fa056deafa94e585    251289  docs/evidencias-performance-2026-10-12/lighthouse/cadastro-mobile.json
?       2a5348e821c990f3e1d026ba65d0bade58b7f304683daf88d6d868c42452c7c0        62  docs/evidencias-performance-2026-10-12/lighthouse/cadastro-mobile.log
?       a5d68f8b3ac6c7fc53fa544b5b6093972a64dc47ebd12d49d55c97f9612eb49b    283666  docs/evidencias-performance-2026-10-12/lighthouse/explorar-desktop.json
?       64155c973f32185750db044b1c17b71364b6eedd6a5d49aa5f29c85b91c9943f        62  docs/evidencias-performance-2026-10-12/lighthouse/explorar-desktop.log
?       85db7ac13f220cb0cb5b518041b23cd0ebf7cf424cfde9cc17a099b1219c9e8a    295508  docs/evidencias-performance-2026-10-12/lighthouse/explorar-mobile.json
?       b48a210df900c83cea7511d93a108faf9bec4e6aaf72d43d862306217583da2e        62  docs/evidencias-performance-2026-10-12/lighthouse/explorar-mobile.log
?       5123290954a81b544832087eef868e2c4d43687da2396c15b9ae12d069a878d8    311728  docs/evidencias-performance-2026-10-12/lighthouse/inicio-desktop.json
?       336fc76febd01b168646ef6f28bfb0f53930d4364a08afd1f684856f57c0e618        62  docs/evidencias-performance-2026-10-12/lighthouse/inicio-desktop.log
?       dcf3f5588b84cc905a2541d6b0ac16089f6f6fbb18851f79652cc237c3a4dc3b    306437  docs/evidencias-performance-2026-10-12/lighthouse/inicio-mobile.json
?       dd6e7325d3200694e2996b4d16466fa269c9d14eaaaea982d567511d5998b198        62  docs/evidencias-performance-2026-10-12/lighthouse/inicio-mobile.log
?       1dd53235b8927e51b62ae1a74f73239f7f59705a005f5c4ffca1cb5c627b836c    273568  docs/evidencias-performance-2026-10-12/lighthouse/login-desktop.json
?       84a5b7ddbe3a236ea91a1293746c363400e53797d4706262360765a7c1d06d6f        62  docs/evidencias-performance-2026-10-12/lighthouse/login-desktop.log
?       9645d76e5976bf41ea971481ea0addb755ec8fc8dff061d6ccbfb6cf597fde70    268541  docs/evidencias-performance-2026-10-12/lighthouse/login-mobile.json
?       90991135c74fa1ad2200157200645f0ec552c82c09ef677774e4dae5a8cfedd7        62  docs/evidencias-performance-2026-10-12/lighthouse/login-mobile.log
?       234a0e15f55dab79a9400f21ec54b933225ecdd041ccb08c83f15c9e0c17592d      4135  docs/evidencias-performance-2026-10-12/lighthouse/summary.json
?       23b08d7fea894ce75d5ba561988b1f0585254230ea3db640010ae3749a29d46e      5467  docs/evidencias-performance-2026-10-12/playwright/collect.cjs
?       bff3612fc6b95b538897e9218ebc2bbdb5e151930612e6edde8a4bbf705339ea     47214  docs/evidencias-performance-2026-10-12/playwright/screenshots/cadastro-android-compacto-360x800-domcontentloaded.png
?       6667ae4f5b215563ff61a6838931e8ad38fa1510f67b8d3016dcccde1f30acb0     63447  docs/evidencias-performance-2026-10-12/playwright/screenshots/cadastro-android-compacto-360x800-settled.png
?       261d484241edbdc8d1940a4533351cf3906212d1f1d9a85d5d5e78593f63c0bf    113700  docs/evidencias-performance-2026-10-12/playwright/screenshots/cadastro-desktop-fullhd-1920x1080-domcontentloaded.png
?       22e012db934d9b0869e7d1ba322c2c3498f00cbf5d31b5b757f647a7552f7ec0    133345  docs/evidencias-performance-2026-10-12/playwright/screenshots/cadastro-desktop-fullhd-1920x1080-settled.png
?       ea36d08a3f965751ce0531fad075c1717464594c3d857cde903c8462dc6e54bb     49218  docs/evidencias-performance-2026-10-12/playwright/screenshots/cadastro-iphone-moderno-390x844-domcontentloaded.png
?       40ea023fcf1453f48be8147b7049c637eb3cfa9676e64839e7dd15a21da87567     64725  docs/evidencias-performance-2026-10-12/playwright/screenshots/cadastro-iphone-moderno-390x844-settled.png
?       6479f501c5bef80817e8cfc975400b1559b28b6e55965fadfce0948d97d7f324    101917  docs/evidencias-performance-2026-10-12/playwright/screenshots/cadastro-notebook-1366x768-domcontentloaded.png
?       fd02e0a858032b1f1ffecf9325b37c2583e98a6caf24c5b7b63295aa07f9a646    130798  docs/evidencias-performance-2026-10-12/playwright/screenshots/cadastro-notebook-1366x768-settled.png
?       a0ab11e86778553ea6adac3ae297ea02e0f19f9889e157bba944fcba672ffe91     78252  docs/evidencias-performance-2026-10-12/playwright/screenshots/cadastro-tablet-768x1024-domcontentloaded.png
?       a0ab11e86778553ea6adac3ae297ea02e0f19f9889e157bba944fcba672ffe91     78252  docs/evidencias-performance-2026-10-12/playwright/screenshots/cadastro-tablet-768x1024-settled.png
?       f8acd85d5646c35d0d8ca3f08256a6907c96813dc8202452d0b436d8a0c46533     54394  docs/evidencias-performance-2026-10-12/playwright/screenshots/explorar-android-compacto-360x800-domcontentloaded.png
?       17c7591a60b6bc4e06eb0b2143688fd67af5324d0966cc60c2163bed39568b8b    144381  docs/evidencias-performance-2026-10-12/playwright/screenshots/explorar-android-compacto-360x800-settled.png
?       35d80538e64bf90511189f9be0a126715870a3d140347e061de1959921729193    111338  docs/evidencias-performance-2026-10-12/playwright/screenshots/explorar-desktop-fullhd-1920x1080-domcontentloaded.png
?       86599913eff1606010913832ffb0b1627b8fbd35fc80d9e5571d569f4e5f8b25    203239  docs/evidencias-performance-2026-10-12/playwright/screenshots/explorar-desktop-fullhd-1920x1080-settled.png
?       ff026af6234fcffe2a4eaa18663b98657b5a2a140b2a45d350894631cf53691c     59262  docs/evidencias-performance-2026-10-12/playwright/screenshots/explorar-iphone-moderno-390x844-domcontentloaded.png
?       44179586db0af7324b91d290adfc7a6f33bd35a84e392b9a5b637c141759623a    149196  docs/evidencias-performance-2026-10-12/playwright/screenshots/explorar-iphone-moderno-390x844-settled.png
?       23046f2befdbb127694f668d6a7ff7502bb8fa79ea4deb3a4be6796e8d3638dc     86376  docs/evidencias-performance-2026-10-12/playwright/screenshots/explorar-notebook-1366x768-domcontentloaded.png
?       8a4c94c1f5fff617b9b0f55b6f58ef7ce046a09e4e53d46fb406142eb6fa10ce    197069  docs/evidencias-performance-2026-10-12/playwright/screenshots/explorar-notebook-1366x768-settled.png
?       d2d9113df94557285bf5e43cda67d1d4382ebeec1a53d65ec27e17c975d0503a     66555  docs/evidencias-performance-2026-10-12/playwright/screenshots/explorar-tablet-768x1024-domcontentloaded.png
?       04c8e94a180e1c2014150ad9a8eb9da67e43197c55f1e3518b8f4efdb4b3c3b4    197395  docs/evidencias-performance-2026-10-12/playwright/screenshots/explorar-tablet-768x1024-settled.png
?       2bfecfd54dc201df164818bef139e5ffc8ca909c212401191437a1c59ffc7f8b    162724  docs/evidencias-performance-2026-10-12/playwright/screenshots/inicio-android-compacto-360x800-domcontentloaded.png
?       1dbab6bdd0b0411acea242168eeed01e532ee9d2e3889823b9e2eba00ce116b6    246160  docs/evidencias-performance-2026-10-12/playwright/screenshots/inicio-android-compacto-360x800-settled.png
?       63bea0403ef37a98adc6b2c902b564828f014ca771bef2bf4e21dfebf52bacbf    282208  docs/evidencias-performance-2026-10-12/playwright/screenshots/inicio-desktop-fullhd-1920x1080-domcontentloaded.png
?       05b1f6e0fe44cdd25910936067f061199c06f414f0828bf8a42cd5cf11bd8f6f    865335  docs/evidencias-performance-2026-10-12/playwright/screenshots/inicio-desktop-fullhd-1920x1080-settled.png
?       a17d17c34ad9c7f49ad63126e1fdc27dd57045b92161e7c9bfee3f058c72b86f    171887  docs/evidencias-performance-2026-10-12/playwright/screenshots/inicio-iphone-moderno-390x844-domcontentloaded.png
?       13a6a1c2d2f946439212f6a19848a68d1737e5e0898ee3b36295ccbf84f6bbf6    275416  docs/evidencias-performance-2026-10-12/playwright/screenshots/inicio-iphone-moderno-390x844-settled.png
?       3c58ccb9280087dc8794ba7dff60e31c5f8f1855e9cabc60bff11bde87c1843d    561334  docs/evidencias-performance-2026-10-12/playwright/screenshots/inicio-notebook-1366x768-domcontentloaded.png
?       92fe81665e18dad7265428c2b1070a9d08da1721ccb25545c34de84882279df0    692452  docs/evidencias-performance-2026-10-12/playwright/screenshots/inicio-notebook-1366x768-settled.png
?       3e79a71203214ec8cb6b6b6679791a58a3de59511b3266c4c9bcdc2e66131903    355998  docs/evidencias-performance-2026-10-12/playwright/screenshots/inicio-tablet-768x1024-domcontentloaded.png
?       3405fb780ddbeebec77c1c041ac4b6f698cb23eb5a417c2c7eeebba20ffa162a    473518  docs/evidencias-performance-2026-10-12/playwright/screenshots/inicio-tablet-768x1024-settled.png
?       9bfb41250a593e74204e6c80f7a5a87b917638e1ccbd0e6e38b0014d302e4d8f     43667  docs/evidencias-performance-2026-10-12/playwright/screenshots/login-android-compacto-360x800-domcontentloaded.png
?       1e6b0001c7cd253ed786a2ce8ca76c8d20977dc0d8cdd4632fa82086c73f6497     58744  docs/evidencias-performance-2026-10-12/playwright/screenshots/login-android-compacto-360x800-settled.png
?       f1d9b3a0c2981039d8b67073c2b20a917e6b1364a78897d9469f070315193217    128104  docs/evidencias-performance-2026-10-12/playwright/screenshots/login-desktop-fullhd-1920x1080-domcontentloaded.png
?       f1d9b3a0c2981039d8b67073c2b20a917e6b1364a78897d9469f070315193217    128104  docs/evidencias-performance-2026-10-12/playwright/screenshots/login-desktop-fullhd-1920x1080-settled.png
?       1565f63d964d5583797d00c1cc029756212dec11496d38807c6a002e73cd27aa     45824  docs/evidencias-performance-2026-10-12/playwright/screenshots/login-iphone-moderno-390x844-domcontentloaded.png
?       63ba8664f53627480139d9257530bfa4b76c8e2507b86dca5a4013624325296e     61616  docs/evidencias-performance-2026-10-12/playwright/screenshots/login-iphone-moderno-390x844-settled.png
?       3e0ca202d8bb551b4bdb4f4981497c0274bf7361d33c4cdd54ecbe1487c5b5b5     96456  docs/evidencias-performance-2026-10-12/playwright/screenshots/login-notebook-1366x768-domcontentloaded.png
?       44f08412c547fb6dd2a9645f4f994ed405a8d0393991171d2b7af267ee243c0c    127874  docs/evidencias-performance-2026-10-12/playwright/screenshots/login-notebook-1366x768-settled.png
?       a1fc67f23c3946dc5247c84e9e7cfa0cc136be9c9ba0844d48f8ec837f72acd6     54371  docs/evidencias-performance-2026-10-12/playwright/screenshots/login-tablet-768x1024-domcontentloaded.png
?       709845ab1eda84223847603c32001df19d26ec3cfcef4a83c1eafc2fc6b28dac     75671  docs/evidencias-performance-2026-10-12/playwright/screenshots/login-tablet-768x1024-settled.png
?       97e77e6525d2f9ae56ad3d8b0d1ca25e4abf3d06adfb06279878dffb19cea005    302840  docs/evidencias-performance-2026-10-12/playwright/summary.json
?       c3e26655040ffdba27a8cee7c81f2f98d43b1a115add469b0d7f9ad4e04f7bef      1346  docs/evidencias-performance-2026-10-12/psi/cadastro-desktop.json
?       5d3dd3f06336fc7de83854681e162a3d8cffcaab3bfcfcb7ebe2bfcb80a813d4      1346  docs/evidencias-performance-2026-10-12/psi/cadastro-mobile.json
?       e01687086ee920953d672f034f65634ff28df5bbec00c6e9a5e5e8608bcea630      1346  docs/evidencias-performance-2026-10-12/psi/explorar-desktop.json
?       911cdc01e6a550673b81afcbcd3c5b772d878845c5bdab75eadcf13c555ded6d      1346  docs/evidencias-performance-2026-10-12/psi/explorar-mobile.json
?       3751e3a5e04c769a6cbdc46e9aff04157ebae676da97d79a49eec8e31046614b      1346  docs/evidencias-performance-2026-10-12/psi/inicio-desktop.json
?       5d3dd3f06336fc7de83854681e162a3d8cffcaab3bfcfcb7ebe2bfcb80a813d4      1346  docs/evidencias-performance-2026-10-12/psi/inicio-mobile.json
?       3487310bacc577f92ef5568abf432dd414fab24d556fba9b9de9532f5087788c      1346  docs/evidencias-performance-2026-10-12/psi/login-desktop.json
?       42ce65a84cacfb7135212a2008a76b2b642e7c38fd3a441ce2d8cc25c0a586e2      1346  docs/evidencias-performance-2026-10-12/psi/login-mobile.json
?       4b7bb4bcc0c1e7f52bb790ea50bc78c02f71377002d643772765e39c6bcc9649      3278  docs/evidencias-performance-2026-10-12/psi/summary.json
```

</details>

<details>
<summary>docs/skeleton-audit — manifesto completo</summary>

```text
estado  SHA-256                                                           bytes  caminho
?       30cf98113d9dfae46d8d0276bf54f00646e1966206fb3a82e73442ae0b8f04ac    145228  docs/skeleton-audit/before/explorar-390.png
?       86f6bc3526928910efb819579909bc7b8508414eefe9fad68d161b415034fb7b     75987  docs/skeleton-audit/screenshots/atualizacoes-1024-real.png
?       0b041189d85f8c5a08169171fdf1ccb7dd5497db54002034097550c62dc43abb     90415  docs/skeleton-audit/screenshots/atualizacoes-1024-skeleton.png
?       6fe4ab7c44ad74b2c07fc610614d8dbdf72d6ed00207b5a762c331afa515514c     79986  docs/skeleton-audit/screenshots/atualizacoes-1440-real.png
?       dd3c4af3481a8a4eb7a2a4d070b8029c957830f44311d2f0f75d19e94506db41     76376  docs/skeleton-audit/screenshots/atualizacoes-1440-skeleton.png
?       7f5f4822c030150c331f660eb067c618835640813a6ffe13a3cbb7f6c123e3d1     82185  docs/skeleton-audit/screenshots/atualizacoes-1920-real.png
?       0aff4871bc492e9fa74c25e6f41ec26af6a696c8a9c437a0b2a16b898fd552c0    166668  docs/skeleton-audit/screenshots/atualizacoes-1920-skeleton.png
?       cc890a6d402b2286262313a4bc0dc56d891452314a00d4a0234bb34b7fc7d936     47731  docs/skeleton-audit/screenshots/atualizacoes-360-real.png
?       cf8f32a8416bb73c41d59c9dabbc9f0fe73053255bb38b769135f1a3955d55ef     76401  docs/skeleton-audit/screenshots/atualizacoes-360-skeleton.png
?       81dace5485967c5340373cf3edae35771f29962d77b0a4e48bbb126d7afab1b9     47724  docs/skeleton-audit/screenshots/atualizacoes-390-real.png
?       712d4317365e0f547c3556240583a07fce01314f41dbd1244767172ec7864335     78377  docs/skeleton-audit/screenshots/atualizacoes-390-skeleton.png
?       336d88a09f913d71db675113eff73c3fc4d943c2cccf3075b451a1e280d9e493     57037  docs/skeleton-audit/screenshots/atualizacoes-768-real.png
?       a9291a6cb0df6a4051f44099a438f05a108adcc425f40c522830a242b98e4c59    104229  docs/skeleton-audit/screenshots/atualizacoes-768-skeleton.png
?       e16b4659f1f469d97b8ec28a75a7088527ec9047ba029abe088c63837546ac53    119823  docs/skeleton-audit/screenshots/comparar-1024-real.png
?       32f2067e4af1ee17be7640c8958829522e11feda3d79e860f2f5bb63707b8131    115883  docs/skeleton-audit/screenshots/comparar-1024-skeleton.png
?       2c0df74a84f4a74579755e14ce347be8c9a2e9e46331104bce6a08019e6622ba    127890  docs/skeleton-audit/screenshots/comparar-1440-real.png
?       5baff7f27294e36f4662e379a27dc23eff98af33448dfcb23264c0249d70000a    132200  docs/skeleton-audit/screenshots/comparar-1440-skeleton.png
?       07d63c1023ae4c45be936c2be3f0cc41301d2630adc4386eee33c78996b12931    130791  docs/skeleton-audit/screenshots/comparar-1920-real.png
?       adbdbfd5192f003c639d503c35f33b677b5951c1c9fee838b4409706e90d5011    167680  docs/skeleton-audit/screenshots/comparar-1920-skeleton.png
?       7cd966a0e861a858d25c39677176c7c64ac1d8454c3d19160cf2d54104cd850b    116350  docs/skeleton-audit/screenshots/comparar-360-real.png
?       f8158fd9dfdfed65bd196bc30ec5ac6a7c72ac306b289db8cdf53fba0ce45266     72100  docs/skeleton-audit/screenshots/comparar-360-skeleton.png
?       d33abd8e281148b96934da068e0926bb1f70f83f1d1328eeb290744e6eb90b06    117049  docs/skeleton-audit/screenshots/comparar-390-real.png
?       1578b3847b86ad8f2451c5f04163f4ac9483e33011d166d8ce3a238d2f651dcf     67035  docs/skeleton-audit/screenshots/comparar-390-skeleton.png
?       2f8349e9b7794219ac4fcbf2902378f92f846ffd7dd1e57959b3ed79a3d58ebd    119044  docs/skeleton-audit/screenshots/comparar-768-real.png
?       bdde7dcc2490abfccc19cdc8ebd3c3a0bce407407f14de3a96d1e2fedf407dd2     86120  docs/skeleton-audit/screenshots/comparar-768-skeleton.png
?       4065145016615f0e734aa3422dabe0cd25a1f736d51f6dee0fb68ac0d1551f53    121753  docs/skeleton-audit/screenshots/criar-projeto-1024-real.png
?       2102d87e9fa3422617436e0404f7a1103de8237584a5c311ae18b985364b79af     70622  docs/skeleton-audit/screenshots/criar-projeto-1024-skeleton.png
?       a50235b9d878254c55b1e307efd9532dc98941932b99cd94c7e1f03e81aefe9e    130280  docs/skeleton-audit/screenshots/criar-projeto-1440-real.png
?       0e965a2b3115d08b064258e9c7f129a357712aaa11307b8b0030a78c304b4241    146818  docs/skeleton-audit/screenshots/criar-projeto-1440-skeleton.png
?       4443646cc439756eebfa927d5e9da8fc3a281bb4858630e821e45f43bec96bbd    133630  docs/skeleton-audit/screenshots/criar-projeto-1920-real.png
?       4925accb2689f8ef5298e4a12fa4ac4c9c8599be7cc27d4e1db6b0b79cc044fe    124484  docs/skeleton-audit/screenshots/criar-projeto-1920-skeleton.png
?       6f7cd7607ae6b276b219a7cf0964a26c3317510f9d359a7939e9cf3bc6380be0    111779  docs/skeleton-audit/screenshots/criar-projeto-360-real.png
?       3b77d7d3e84f5a4d963b9696170ae1729c783330bbbd36ab73e8e625fd591c13     52861  docs/skeleton-audit/screenshots/criar-projeto-360-skeleton.png
?       a920bc766089016e859587458faad8fb38b5f83b9087026e934c01cd26f7fe54    113240  docs/skeleton-audit/screenshots/criar-projeto-390-real.png
?       f12b4df7d982efd9dba482fd82f1b8c27a68482b1ed936d430902166e9e3f044     50090  docs/skeleton-audit/screenshots/criar-projeto-390-skeleton.png
?       3bb2c3d17ee64735c284f196a5cc64cec21769ef02fdd11aed9201c676cf0861    111734  docs/skeleton-audit/screenshots/criar-projeto-768-real.png
?       b95cf0ce95972d8bac262137c4dad77f450f390d29d7cfa3e16a738f1bd7ad1c     81738  docs/skeleton-audit/screenshots/criar-projeto-768-skeleton.png
?       687f41c724a6efa48d305b173d6997ea076dcc6c0f7354dab8129ff6e162dfde    209888  docs/skeleton-audit/screenshots/explorar-1024-real.png
?       465bd45af20952783f167b6e9546262e5d28a81c1869cdd798633a9587a3bb0c    153495  docs/skeleton-audit/screenshots/explorar-1024-skeleton.png
?       7635d11f7202e1d70245e87062ccbb513cdbd06f15f39e4e0a6ca7a1d521d058    203071  docs/skeleton-audit/screenshots/explorar-1440-real.png
?       00bce0b014065219db6a88486f5da2009eff61da5b9a15a3b2aecff63f622f75    126302  docs/skeleton-audit/screenshots/explorar-1440-skeleton.png
?       283e1052a643e8a4a04f5f425768c7b9df2d4445d57b2928e38169e06638516b    208068  docs/skeleton-audit/screenshots/explorar-1920-real.png
?       b0b35eb1f542af538a7c1997e5bb873c4e33d52fed853d257c972c4612fe766a    191067  docs/skeleton-audit/screenshots/explorar-1920-skeleton.png
?       912162561a233a31d10a333d7343d23950ba089694fa63d1fae7f7b2a2cba04d    152320  docs/skeleton-audit/screenshots/explorar-360-real.png
?       f91dbfb669aba5c46986db61c0baf08c224e47da822ebee101ee106261607ba1     61429  docs/skeleton-audit/screenshots/explorar-360-skeleton.png
?       b7d8dde8f25d13e8ff253e7e269d0e9cf206a4b3a676653cdd54471d696b648d    157080  docs/skeleton-audit/screenshots/explorar-390-real.png
?       c3ed63d11707c907c2301b9070a18c9339063602f681b4e2f3537d2e16ade874     70784  docs/skeleton-audit/screenshots/explorar-390-skeleton.png
?       2ae2acbb9f3485fb6876d1cdb02223a6149d2b96276790d2d90d495463e7db3f    206404  docs/skeleton-audit/screenshots/explorar-768-real.png
?       71263b1515b4cd2136c61216c552df5e73236b48221e83edb7d50f190262b4af    119476  docs/skeleton-audit/screenshots/explorar-768-skeleton.png
?       7d49b7cb9a61bd5a4ed4807d3484b30c102bef4e9a56fa14401196ee3f4a389b     28420  docs/skeleton-audit/screenshots/formulario-perfil-1024-real.png
?       3ab48628a5f65e9c9201badf4d6d698562da988b248e55712ea549d62f14ddfa     93204  docs/skeleton-audit/screenshots/formulario-perfil-1024-skeleton.png
?       95da60a3a82162eb73527151e901a91aaa2d005d95089235c74012919079cfe4     51202  docs/skeleton-audit/screenshots/formulario-perfil-1440-real.png
?       aeaf4bf389f0dc904822d96da63c8f96c0ea4b4f30f2d5745637241a9a7138be    106581  docs/skeleton-audit/screenshots/formulario-perfil-1440-skeleton.png
?       50023fb9dcadeed1661cc60469590b734663ad04686c097cc4af10bf312d4731     53366  docs/skeleton-audit/screenshots/formulario-perfil-1920-real.png
?       e1d74617163f74e340f1312331ae6b5660836461b50676a6012965635436a733     73370  docs/skeleton-audit/screenshots/formulario-perfil-1920-skeleton.png
?       859f12baa431e86836025f202818131af7430f2eaa1cfe6dbc847449aca8b4b7     42583  docs/skeleton-audit/screenshots/formulario-perfil-360-real.png
?       99337156a28097d28ec4515e95deb9a9657957790b22e9b6f062098347580cb7     58489  docs/skeleton-audit/screenshots/formulario-perfil-360-skeleton.png
?       80837b462f41d8e9d3190c15af1ff341de64901ee3bcae1c6dd60d4be7b257b5     23256  docs/skeleton-audit/screenshots/formulario-perfil-390-real.png
?       9b0c6b69e8fad05323e450fa31146220acca392bb10c9298b2d0a35e0300e5ba     70614  docs/skeleton-audit/screenshots/formulario-perfil-390-skeleton.png
?       0e7fa6a17cece73ac6122d2762d920a0692d48ad1c402c3d84bdb8f5d3c9ca03     48093  docs/skeleton-audit/screenshots/formulario-perfil-768-real.png
?       6e106c120dea7ce36d4aa41339bcf6b9c7bcbc833931484bb3874346bfeddb60     92514  docs/skeleton-audit/screenshots/formulario-perfil-768-skeleton.png
?       62fe53a001493b297dd8a0a01818901fce627f979a8eae0b4644eb1075555184     56300  docs/skeleton-audit/screenshots/garagem-1024-real.png
?       bd60060aeeee8ec77dd0607500ee7c92aae360fd6cb69fae56459856f5ff5918     74710  docs/skeleton-audit/screenshots/garagem-1024-skeleton.png
?       410b9ad6811ca95a15f404623afd9753d96cca3793609a203374f3127e4d9a7b     59256  docs/skeleton-audit/screenshots/garagem-1440-real.png
?       34d021e361bed2156a90101bd2aa0dafee9c5d6f594ca83f847191551d294934    131396  docs/skeleton-audit/screenshots/garagem-1440-skeleton.png
?       e379690b84e9be0354c5bcac5e400f45efe676eadae59a655db2381aca894108     82455  docs/skeleton-audit/screenshots/garagem-1920-real.png
?       d3577a991ba227548c15b565bd0455e41ee9d145a558f0835572b243efb51415     86301  docs/skeleton-audit/screenshots/garagem-1920-skeleton.png
?       0a4297dfb0109cc728093216dc8022c3655cc7b06dfcb758c27e421615d38b35     63060  docs/skeleton-audit/screenshots/garagem-360-real.png
?       0172ee60a6f6da4ed1ce723db4b047487eb60027693b472992692124fa211bb2     60552  docs/skeleton-audit/screenshots/garagem-360-skeleton.png
?       b232ec1fda39f1eab934a6c2a3f9667751cb134acf8ac0a2d64ac6e73675b2e4     64244  docs/skeleton-audit/screenshots/garagem-390-real.png
?       99feeda6753d88c21fee3698b9cbf3ea4a161d8af84a4ed19026a3b4dc5869fd     86810  docs/skeleton-audit/screenshots/garagem-390-skeleton.png
?       3f6a22eccd2e3233c1d7bff1f73fb0a48a4c3a78b02338f6a63aaf80af44449b     75243  docs/skeleton-audit/screenshots/garagem-768-real.png
?       27eec97f9dbcd55fafe5b094923ab6af3736b71846c728ff9076632a3396ae8a     72893  docs/skeleton-audit/screenshots/garagem-768-skeleton.png
?       3dfadf488ae0731eb034b5c88899584a6ac33c9229fb0c22e12eeedd4b9588e0     48857  docs/skeleton-audit/screenshots/notificacoes-1024-real.png
?       202a5b54c6e686b77d19ec63983eba8e00dae354c6b18a7fbbf9cdb9447fc36c     71527  docs/skeleton-audit/screenshots/notificacoes-1024-skeleton.png
?       f57db40be9e3a56240c8e712610cac595aece7ae051922970dd96d0bb776440e     51380  docs/skeleton-audit/screenshots/notificacoes-1440-real.png
?       8fb689b0a300e01f908705851ffb80fb6c9d3a9f494089deec21b373c02b1395     78249  docs/skeleton-audit/screenshots/notificacoes-1440-skeleton.png
?       7e77b6bb2bbfb2a2c00f746a933a33012b1b9ebcc60dd452ca9385c5f0f07c03     74379  docs/skeleton-audit/screenshots/notificacoes-1920-real.png
?       a9a167ef9ab8f4e0f75e064af5e890b9b168690907d8c7053174596a0eccee5c     91754  docs/skeleton-audit/screenshots/notificacoes-1920-skeleton.png
?       d4261edc2d9ee39d0be58277520d7b2f06b9b77e788bacf772a72f6a8e94fd98     37789  docs/skeleton-audit/screenshots/notificacoes-360-real.png
?       ecd81ca4cf9f59e05df0f08075f9210060f6eb11832b2153e2a40b614ac93eb3     51175  docs/skeleton-audit/screenshots/notificacoes-360-skeleton.png
?       3dd34172f45aded03268a2c35034fb6ea15c5fc643e324ebb198da20288dc063     38575  docs/skeleton-audit/screenshots/notificacoes-390-real.png
?       9cd25faac2c8853cc1096cae8293cb9b8a7bf70f8e03a434b79d55a867075bfa     49901  docs/skeleton-audit/screenshots/notificacoes-390-skeleton.png
?       5f9a37f919f0bf9151d9a10d650b0ed7ff9f0d3342134d20f450d9fb3501fb0b     68957  docs/skeleton-audit/screenshots/notificacoes-768-real.png
?       4d711fdc1da6b1f19f1e44d322ca3301769c023360b4982abb7c34d8139da670     76298  docs/skeleton-audit/screenshots/notificacoes-768-skeleton.png
?       cc71d58ca00771a17cc03f79ebf5ba32e7e9d2f3ea876384c0769d58aada1430    328930  docs/skeleton-audit/screenshots/rankings-1024-real.png
?       72a7199e3dc7937d41faf14fd8a1c6b1cc23ad95f167e090cd5a8f593f1e2fef     96525  docs/skeleton-audit/screenshots/rankings-1024-skeleton.png
?       154d6eb299d255943fff5094bd8f247545645b244f22dd71dc07ce79d21020e7    336272  docs/skeleton-audit/screenshots/rankings-1440-real.png
?       5297cd80f4bf1435278307ea612f132c4b1cbbe38eb913e954d64c48c6872025    247496  docs/skeleton-audit/screenshots/rankings-1440-skeleton.png
?       f6e9b7dcddb8dc19f745c5459d458bd35acfcc25f2b30149009608c91b09d98f    342575  docs/skeleton-audit/screenshots/rankings-1920-real.png
?       2124395c52d0ff7f1f1dbcd94882943e8689f8e08616b4e432e27ef26d27b47b    221533  docs/skeleton-audit/screenshots/rankings-1920-skeleton.png
?       f3ea87e97b6593b6dc6a6a072114a4cbefc97704b17d92300b8a67dfc41401ef    167271  docs/skeleton-audit/screenshots/rankings-360-real.png
?       12098eab34dffb2c2d12ab0d92997cb2d41732e40241dfe3c146a16845d343fb     61152  docs/skeleton-audit/screenshots/rankings-360-skeleton.png
?       1cda31360cc513d051182532d24cb79422f3913a790225ca9883533376931755    174089  docs/skeleton-audit/screenshots/rankings-390-real.png
?       9e1a51cd4b82fbd66d5d3e012eee9d405d92c33fa15f47198a9a0733a47162c8     93256  docs/skeleton-audit/screenshots/rankings-390-skeleton.png
?       b2b463dc509b4171b431173f7b8b16515268dc396bbfa4548542f79ae0e27d93    298982  docs/skeleton-audit/screenshots/rankings-768-real.png
?       788fa577d86449e268570b5a889c85de4caca2e561a4973edc8ddb950cd873b7    121868  docs/skeleton-audit/screenshots/rankings-768-skeleton.png
```

</details>

### 11.2 Worktree de performance — pacote acumulado

Origem: `/home/gustavo/Área de trabalho/ProjetoGaragem-performance-etapa-1`; HEAD `45da12b79891a244678abf54c66d7e2bd9205b0a`.

| Estado | Caminho | Main | SHA-256 local |
| --- | --- | --- | --- |
| M | `next.config.ts` | diferente | `7f8c837dad644eb7e7bc30b4d6ff2ab29d050ae5b9641dc632898c443276b1b0` |
| M | `playwright.config.ts` | diferente | `1571890b28a9294e5d63719d73eac636fed426a787d9e8f72cb6b844f433d969` |
| M | `src/app/(auth)/login/page.tsx` | diferente | `27584db1ab6ee31fa80ceaa076c6ca2745930e1510a5fad79197b7589502201c` |
| M | `src/app/api/og/[slug]/route.tsx` | diferente | `994beffb133418858fdde3c835d5d6a859967c62bb9c78cef114a22a1c83314d` |
| M | `src/app/api/uploads/image/route.ts` | diferente | `bfd539f0fcdab7962734298dfa0f834b766d282712bf8f78769d892ca2d772c4` |
| M | `src/app/carros/actions.ts` | diferente | `f1e6ccbed0df635bfb22cdb43ace33e770449c5db23bde5370fff889b2f56b75` |
| M | `src/app/page.tsx` | diferente | `f0db7b90458b6bbd679db1b1eb5db4ce59fc19e6a305f7c93d0f6d2eb05641f4` |
| M | `src/app/privacy/page.tsx` | diferente | `6db2ffb7885fc557e1ac1283f5eec15af96840c519d32854df64f497eae0a041` |
| M | `src/app/projeto/[slug]/modificacoes/actions.ts` | diferente | `cf992d097a4ef3385e4557c0e96f083c3913a8f3c5f0cf1443e56c7abd5c2160` |
| M | `src/app/projeto/[slug]/modificacoes/page.tsx` | diferente | `ebce4d3c52f8654502f23a81ab93f5a02d3439cf4574d586545a04784ad55b27` |
| M | `src/app/template.tsx` | diferente | `cf979019ca70a407621440f0db7cfc1c62a5f76e3a77d6673d1c4a82b7dcca59` |
| M | `src/app/terms/page.tsx` | diferente | `900adcf12259c49775b2dadac03bab5a25a06d2e20bbecdb9a1308fe03a2b806` |
| M | `src/components/garage/car-form.tsx` | diferente | `2df7555303068e99d7aca50985d778c8f561e99826f8d5b4204830b727fc8b67` |
| M | `src/components/privacy/cookie-consent.tsx` | diferente | `de31374867c64baab04b6fa7d1ef93f834edf9342b5828110e505a8d7d453c2c` |
| M | `src/components/projects/project-discovery-page.tsx` | diferente | `79584ec482b1e49fdc72fa8228d3862805ef922933b34ec7f4dcab830c638172` |
| M | `src/components/projects/project-image.tsx` | diferente | `2e75d202b526a68e6821a48270a7d5edaba80a32cf926a6f6b34e12372ac9cf7` |
| M | `src/components/projects/project-modifications.tsx` | diferente | `ca19f7ae329a0267f0f29d6b0eb6fde523627fa0e475475c62b8011e30ffb865` |
| M | `src/components/projects/project-rankings-board.tsx` | diferente | `2c3c5763df3ccfacf6638e81b9a225042480f18a116ec3f6038bbf716d55749b` |
| M | `src/components/site/site-footer.tsx` | diferente | `304ddd8a766fb1fd3543c8597c1b12ccdf716a17f32e5cbc8586c7ed1e800787` |
| M | `src/components/site/site-navbar.tsx` | diferente | `8795790b691f96f9e3a09f62ee358f656b5c9b8be8825f65d3727b5fe59d3f33` |
| M | `src/lib/auth/redirect.ts` | diferente | `dd65ce04556d75de3f0871f9723cd929c41e038f51d836ba4d79b1dfc6e743c1` |
| M | `src/lib/garage/create-car-project.ts` | diferente | `c8d5cfd31034a5752d78a061f6551e9b7acbc54c08f45be81d02c99f8978f1f2` |
| M | `src/lib/modifications/server.ts` | diferente | `368f4db88101b24c3f2358ddf84f1abbdd968777df44ddc6b8b95be7de272f0c` |
| M | `src/lib/seo.ts` | diferente | `cee9661b5e2537370a8c958040151714ff49a0a6b050a0f5f09abf721cefb692` |
| M | `src/lib/supabase/queries.ts` | diferente | `961bc801904d7440f9455e94fa13d6ec974000727542b05a251a73b5b7b9ca30` |
| M | `src/lib/supabase/server.ts` | diferente | `5dfec18ea06f25cea26cb2629b40a5e334733b1d614e48577038fb109fbe3a94` |
| M | `src/lib/supabase/storage.ts` | diferente | `ef8d23caad6d3ab2e4bfc98b60fe403cc6c4cb69b787a8b693b47b051dc8880a` |
| M | `src/lib/types.ts` | diferente | `823cfa79b5af0d2a8bfb7cea4da69b695fa72f0d56e2cfc05db18f15af50d177` |
| M | `src/proxy.ts` | diferente | `f04700b56e6a7a5ff0554de039e1dd496b212d8fc1701b2423db67924a4cd336` |
| M | `tests/e2e/authenticated.spec.ts` | diferente | `865c4c11f9103e36607721801154fe536f5a3862c11539620d1f78d427b313d5` |
| M | `tests/e2e/helpers.ts` | diferente | `2081536c41b239c98b3fc92948de390d2f9c631c20404963d7789262ec06f021` |
| ? | `docs/auditoria-independente-performance-2026-10-13.md` | ausente | `406218981082c64bead0e70cf6860a42fa3cfaf84528fe0ea54c7037ce020efd` |
| ? | `docs/cookies-protecao-juridica-2026-10-13.md` | ausente | `173bd543ac0a8b6529e21be560549fe4740e1b62aac24084106a1db6c9e6b1b6` |
| ? | `docs/correcoes-auditoria-2026-10-13.md` | ausente | `b224834419e963585d644a1a0d4925a77af8df494e14c8675fd27c83115eaecc` |
| ? | `docs/finalizacao-backend-supabase-2026-10-13.md` | ausente | `15417c56db28c0cabbe50fbb59ba338ea2714a23ccf570f819cfdb4457f05e78` |
| ? | `docs/otimizacao-performance-etapa-1.md` | ausente | `a67b7979d3a2d6cd3e3b019368b9ef1fc5f6e571d53f9292431312393e5d406d` |
| ? | `docs/otimizacao-performance-etapa-2-continuacao.md` | ausente | `7d45cc7d3f991f348585952d20e006f5b3f12a0363506b8327b5676ce29e7360` |
| ? | `docs/otimizacao-performance-etapa-2.md` | ausente | `e4af7a64185f2c97806e6ba6117808284695064149f5b2f95cf115ffa366ef23` |
| ? | `docs/otimizacao-performance-etapa-3.md` | ausente | `afd904d01e4015f10bc322506e949cc7657d1b90121a85ff8fb64b16015f382a` |
| ? | `docs/preparacao-supabase-isolado-2026-10-13.md` | ausente | `913cab2e8684b7f8cd7f1614fdff2af5cf0854356f419e564328b74656948362` |
| ? | `docs/seguranca-imagens-e-plano-integracao.md` | ausente | `24913d881622ea8812af70eef4ad9b5c6918b5cae942bce8408a357fa6896a5d` |
| ? | `docs/sql/contencao-backend-2026-10-13.sql` | ausente | `6fedfac00bbaa839a09dd12ea0a59b4d859981a9bb3d49dc18450d883ab23d69` |
| ? | `docs/sql/contencao-imagens-2026-10-14.sql` | ausente | `b07e2c64b0131a8390da9ae3d3b2784540719914f8e4ade9a10146b49502bd9d` |
| ? | `docs/sql/preflight-backend-2026-10-13.sql` | ausente | `4d5cd488ca20d81d4f7d8a0ec74f7674aa32bbd87ee4d9240ae27683afbbcdb9` |
| ? | `docs/sql/preflight-imagens-2026-10-14.sql` | ausente | `1277295f58713a8183f6cad8328710427ade50589767f37aa204247bffcdf85c` |
| ? | `docs/validacao-correcoes-auditoria.md` | ausente | `f7557980b35ccf2d1e385006e838e36a6aac80d7d59a9f78a9c74a6d107a7689` |
| ? | `docs/validacao-definitiva-supabase-2026-10-13.md` | ausente | `d944d8f62d4a67c634652051e4cf68486b4b897b2633eb2f040b956c001c93db` |
| ? | `docs/validacao-real-supabase-2026-10-13.md` | ausente | `42840a3cfea2385cb159de0c2c301144515cac9a6bbe8d54408391a3adfaeb4c` |
| ? | `netlify.toml` | ausente | `1635d1c791a7dbc3d40e89098a655a07a56d238a78ded040d825750a7bc324f6` |
| ? | `netlify/edge-functions/protect-project-images.ts` | ausente | `24bd556c67be553b92e339fc575121fecce780f56e1ae01eb3813e91b254125d` |
| ? | `scripts/check-isolated-supabase.mjs` | ausente | `ae4fc9d6a8037e426ffb231e5c600597d6c3cf18a7cb488a60d2ed84eda2b5a0` |
| ? | `scripts/inspect-pending-modification-photos.mjs` | ausente | `0218088bab230abf08cbf6b4da440d4ea6c605a71de49388c3941534ca4b481b` |
| ? | `scripts/pending-photo-cleanup-policy.mjs` | ausente | `80d3092e76a5bb455acf1438eea329d8b80a9d8a41bcbb8f1b422c2b8ebd359b` |
| ? | `scripts/plan-project-image-cutover.mjs` | ausente | `61367521e9a2e2458e99ca4d106a81ffb8f7682640ef321ca163da4a9dbd7f98` |
| ? | `scripts/test-backend-migrations.mjs` | ausente | `486f1e26fd3c24587174a04515f60440ed919cc2a3e94977958fc4405a005c79` |
| ? | `scripts/test-image-security.mjs` | ausente | `3e51d102b77fb61bccb5059c4398a2368584ab06dcc479bc85c1e52bb653354b` |
| ? | `scripts/validate-backend-real.mjs` | ausente | `4cc9bf78de3a119523af0f1652acdc28b1ad0b030f7ec593e788f4365c1d0924` |
| ? | `src/app/(auth)/login/login-form.tsx` | ausente | `4a0e9275f5c6ab0d0e9530e92d964f76e14e8db6a9a27057384682773ebf7f5b` |
| ? | `src/app/api/media/project/[...path]/route.ts` | diferente | `4b0657d3943f855fed49e3731031730aca218390986a5fcaf951a18496980d60` |
| ? | `src/app/test-harness/modification-photos/page.tsx` | ausente | `e53080bfa3162f2f9472637b43595fef8d52a6c7b7c17837f991386ea7d5448b` |
| ? | `src/lib/images/delivery.ts` | ausente | `a33214f3350e13a6a0b532fc9730b58efb909368de55ce99aba5a44b9dd60641` |
| ? | `src/lib/images/project-image-url.ts` | ausente | `fb8863dce94b9676a618e372219b0a32e6355776b6c517ee337ef06a37f0c631` |
| ? | `src/lib/images/resize.ts` | ausente | `2868cf9cbf31c62c0ac736b57aa72f57eaf48f0798542a7ba067bf44c3327e1a` |
| ? | `src/lib/modifications/photo-path.ts` | ausente | `35a384f1debb178421542f6464a907114f3326f76fc1ee32e754ebb8430f4c17` |
| ? | `src/lib/modifications/photo-storage.ts` | ausente | `59c0243b71fcc9a7339e3724fbdbe13ae8af5e10548e94dba680b17ef2f167a0` |
| ? | `supabase/migrations/20261013010000_restrict_modification_photo_ownership.sql` | ausente | `59391d9c49035ef1470de510635adb2e1f7fc6f1a829b231e5343d927d2fa554` |
| ? | `supabase/migrations/20261013020000_private_modifications_public_projection.sql` | ausente | `5e50c8c7c67ae59b26461fe166958eef0dc2a1e00da0199542d0a8123d6b331b` |
| ? | `supabase/migrations/20261013025000_private_expense_defaults_atomic.sql` | ausente | `9ae8ef38cc59601af290c401e2d12cc50c4772da7dfd35aefb7a96fdb0c976d9` |
| ? | `supabase/migrations/20261013030000_pending_modification_photo_leases.sql` | ausente | `9974d4348941f5a2f2eeeac758f51fa47b701f5a97014d5d49aa0a3b2291b3ce` |
| ? | `supabase/migrations/20261014010000_project_image_access_registry.sql` | ausente | `1f7d433325f107536d160af5f10a8c9570217cbcd78f399c23e4393e553eb0a8` |
| ? | `supabase/migrations/20261014015000_project_image_cleanup_guards.sql` | ausente | `9006da2d3160a95cb51e23f38972cd049307dac54a9cb1b48e3af3019e5800c6` |
| ? | `supabase/migrations/20261014020000_activate_private_project_images.sql` | ausente | `df7468f2278fede58acae397e23f4010baa734b5af42030dc26c2d7479e1909a` |
| ? | `tests/e2e/authenticated-city.spec.ts` | ausente | `c672da19246dda8765898c10244b3c750697474511a7acc102237eb4971b97d9` |
| ? | `tests/e2e/image-security.spec.ts` | ausente | `c60e4b1ae0a2fb54543a0b6b5134ca99b6fff65354004d14bc8398a18fd2711d` |
| ? | `tests/e2e/modification-photos.spec.ts` | ausente | `c1a935d2ae0883e6509589d96ec4fffc88f285ecad6a928c370c1444a3c770a7` |
| ? | `tests/unit/audit-fixes.test.mjs` | ausente | `eb09543873d11e13eec5851e1d0297791ceba66b01a57e8f94f3213c48edc39c` |
| ? | `tests/unit/image-cutover-plan.test.mjs` | ausente | `0ed9300d701390c0b4e69a3e61ef6a2d4e2ca0646445162e4c3f5cbc0c941209` |
| ? | `tests/unit/image-delivery.test.mjs` | ausente | `c1495a47b6d3055ebef4a34eced222a6907b4ed9d894c0e27ae27626cd264f1b` |
| ? | `tests/unit/image-upload.test.mjs` | ausente | `027be71eb73da009c51bf497a0e76cb64358cb429e89c69a29f139ecde64722a` |
| ? | `tests/unit/modification-actions.test.mjs` | ausente | `df7eddb2063b40b90cf97090d270b3cd4e15f36c786367ae8314adf0a5df0a74` |
| ? | `tests/unit/netlify-image-guard.test.mjs` | ausente | `7b12a0e74571d6bfe9a4d266d3e7bc238a551f86560f3510c9444ccdd2e07124` |
| ? | `tests/unit/pending-photo-cleanup.test.mjs` | ausente | `c1b988322499242f762c9f62e3abc24dfff659d59b17406dc378905de42c4e6a` |

Pastas de evidências, com todos os caminhos e versões preservados:

| Pasta | Arquivos | Novos locais | Iguais à main | Diferentes da main | Ausentes na main | Hash do manifesto |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `docs/evidencias-cookies-juridico-2026-10-13/` | 11 | 11 | 0 | 0 | 11 | `8db53c248a023b87a14ec4ade20987fc6d72a99900168e0f79fa458b7c51e235` |
| `docs/evidencias-finalizacao-backend-2026-10-13/` | 13 | 13 | 0 | 0 | 13 | `dce9d3546b5ca1dafbe8e440e23c9702f929adb4f71c0985f4673a56b6ab5e9c` |
| `docs/evidencias-otimizacao-performance-etapa-1/` | 68 | 68 | 0 | 0 | 68 | `68fa6b9c3b756662d30cbc7e7b8a8038d3110d88541ed6d4fd36642aab32ed06` |
| `docs/evidencias-otimizacao-performance-etapa-2/` | 128 | 128 | 0 | 0 | 128 | `789ba8289f3ad8524c2ec3b1effe5b7f03339f60200594fde8af6e7c4f83f7e4` |
| `docs/evidencias-otimizacao-performance-etapa-3/` | 77 | 77 | 0 | 0 | 77 | `74d2c18a9b5240aeda364d97587c7f12ddb7a7b1efa52ff903e3fb4830c01959` |
| `docs/evidencias-performance-continuacao-2026-10-13/` | 139 | 139 | 0 | 0 | 139 | `d574298fbcdea0a90f36600c0f6662d28640e882d2378bb129d90129fc5723f9` |
| `docs/evidencias-seguranca-imagens-2026-10-14/` | 9 | 9 | 0 | 0 | 9 | `4d6b690cb595c9f4b8a520cff1d9b6f97cecd7e3572c1ec70636993886831aab` |

<details>
<summary>docs/evidencias-cookies-juridico-2026-10-13 — manifesto completo</summary>

```text
estado  SHA-256                                                           bytes  caminho
?       d25529c8c146ca6bb290382042c1734e11bd4481c7c3c7f7379c08544effd61d    197319  docs/evidencias-cookies-juridico-2026-10-13/desktop-configurar.png
?       4b5b6d5f257327d64cce9824ca6705debbc042da7605d534d735175819612b4a    583901  docs/evidencias-cookies-juridico-2026-10-13/desktop-inicial.png
?       770de951d9a66be6870e6e99627eda3a8bbe2a9789b69a26a138ed67c633864c    149590  docs/evidencias-cookies-juridico-2026-10-13/desktop-privacy.png
?       332cb101ff8290b6e897808df4abf50fd779ebcb4659795bd811edba0ae754a9    157513  docs/evidencias-cookies-juridico-2026-10-13/desktop-terms.png
?       915d2b86e8fbb98e1a361b85c2c42afb4f85531b8039da229eeb9f885dd984ff     71898  docs/evidencias-cookies-juridico-2026-10-13/mobile-configurar.png
?       7212afd6807dafa06a2d059898ce199d32168ee1b37a2e3a36ee9f96ddd668aa    188461  docs/evidencias-cookies-juridico-2026-10-13/mobile-inicial.png
?       7647ab7e10c6e546ffe1316223d5640d88554ac24bcc7d07c72a55d20f50e6bc    111793  docs/evidencias-cookies-juridico-2026-10-13/mobile-privacy.png
?       934cc90f54b29adf36eab942236e82a401b588a537705e60401d62f25d737574    120153  docs/evidencias-cookies-juridico-2026-10-13/mobile-terms-delayed.png
?       a87668168521e1d8e757bebd9275adc4765fca1fd8f998e50d3c8c80117039e7    113815  docs/evidencias-cookies-juridico-2026-10-13/mobile-terms.png
?       26c6a3654ff4561e38824efe9e32d0c21d0ad51a87b1ef396d8de8073597bceb      2128  docs/evidencias-cookies-juridico-2026-10-13/resultado.json
?       4ddaf6a5f7f5aa604c8fe2947ea568fdc4686471147e47fe1605c24ee1896319      8523  docs/evidencias-cookies-juridico-2026-10-13/validacao.cjs
```

</details>

<details>
<summary>docs/evidencias-finalizacao-backend-2026-10-13 — manifesto completo</summary>

```text
estado  SHA-256                                                           bytes  caminho
?       6d89beb6443a1d51d3eeb8d7a76fc4c901cde771b8a5f7fa5cae0603da9c775a        21  docs/evidencias-finalizacao-backend-2026-10-13/build-id.txt
?       e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855         0  docs/evidencias-finalizacao-backend-2026-10-13/diff-check.log
?       b99c2252da97790f0535b42f6dfaac7bc584dbbfef1490444e2c64d2979abd97        40  docs/evidencias-finalizacao-backend-2026-10-13/eslint.log
?       517e3c9006678b7ef1a2bcb70c02c4d9e5aa00d452a97eadf833b60a0df95248        94  docs/evidencias-finalizacao-backend-2026-10-13/inspecao-legada.log
?       b346c4d1c55167c58261f6fcbb6374d891ee05060c7715d4e7a7a3713a2fe877       725  docs/evidencias-finalizacao-backend-2026-10-13/inspecao-sem-migration.log
?       b381901318c954b106edd46909dd47ef733fa5cc73ae125b818a4df5f3f638d0      2511  docs/evidencias-finalizacao-backend-2026-10-13/playwright-publico-fotos.log
?       d8a7186fcdf7cf38c9161d769b163f703b551de37ee013f5f4efaa583941604c      1655  docs/evidencias-finalizacao-backend-2026-10-13/postgresql-isolado.log
?       13f92888c1bfd7244898e36aa286b11538721e083d323940caa7ed56b660b8c5      2159  docs/evidencias-finalizacao-backend-2026-10-13/real-483f5cc7-c8ee-42b5-878e-2a76a2e24b19.json
?       d62c8ce7c3af2f69398417356d3b43a58ae27ac14205c56d36a3f7684e599474      2200  docs/evidencias-finalizacao-backend-2026-10-13/real-85a4daaf-92d9-4cbf-8806-73cbf75f8793.json
?       e5235a179522e70569bb9e2940eb9194cc18a6952905c46ab9162abffe6dd9ab      2252  docs/evidencias-finalizacao-backend-2026-10-13/real-994e04f7-dbb2-4941-98b8-ffe586ebcc2e.json
?       b2d22fbd5337849707f63faddf6fa2133ad8231e1a3762ba08a8226768100fdb      1228  docs/evidencias-finalizacao-backend-2026-10-13/resumo-validacao.json
?       295143b8f8413f224a2a27a9d056d98eaeba7ba31d18bd108bcbff4cbc2e3b57        51  docs/evidencias-finalizacao-backend-2026-10-13/typecheck.log
?       80772606111045003a6425d4cd2614a1d79f8b9a2e165c149a578fa36d115a2c      2059  docs/evidencias-finalizacao-backend-2026-10-13/unitarios.log
```

</details>

<details>
<summary>docs/evidencias-otimizacao-performance-etapa-1 — manifesto completo</summary>

```text
estado  SHA-256                                                           bytes  caminho
?       9e4a9641761b04e37d8320d264a6acc79a817074af62628b093d59946fcc46b2       605  docs/evidencias-otimizacao-performance-etapa-1/auth-nav-functional.json
?       893377b0d453a0a19ec60dcaeb2a8d842a4957345f2a5939a08e64d97b2fe6fe        21  docs/evidencias-otimizacao-performance-etapa-1/auth-nav/BUILD_ID
?       93bce99f174fe321b7a1395453ecdaa2e0eb453d2c8c02dcbe6cc470c5d5ff04       683  docs/evidencias-otimizacao-performance-etapa-1/auth-nav/build-manifest.json
?       e2644ab4e814ab24522f4c41575bf16e3c3e4608341809fc0a53d12765504570    262520  docs/evidencias-otimizacao-performance-etapa-1/auth-nav/cadastro-1.json
?       3b76a9b19d01caa837cfe0b3b15cdcaf11a0dc5f04107a6d66cbd4a2e7472a9a    259459  docs/evidencias-otimizacao-performance-etapa-1/auth-nav/cadastro-2.json
?       d7cd464ca40d075fbc442256afe3e3a8b40f065198267cf614e7c2e3129c868e    260549  docs/evidencias-otimizacao-performance-etapa-1/auth-nav/cadastro-3.json
?       a0b9730ca40d8de884f4065a764faf86aea1e7a8565556da89d13b7dc9f111ff       549  docs/evidencias-otimizacao-performance-etapa-1/auth-nav/config.json
?       5a76ef0368b75b418c06dadd4d610d52bc49248f777243cfd16a1c02b2b62feb    258818  docs/evidencias-otimizacao-performance-etapa-1/auth-nav/login-1.json
?       34288251747b23138d65a243df41ce91ebca7fa91ccfb87603280b36a55bf395    259029  docs/evidencias-otimizacao-performance-etapa-1/auth-nav/login-2.json
?       4f32b70d1b4c96443bc6feb01d2ff17837cb0d93b79d2f7f4cef06a713d6b40d    260032  docs/evidencias-otimizacao-performance-etapa-1/auth-nav/login-3.json
?       6c7371e3a2e0b815d11a00b15ded1028d7b42afdc6a7c761c7806d88c7347cb1     28151  docs/evidencias-otimizacao-performance-etapa-1/auth-nav/route-bundle-stats.json
?       1c5585ea7ee93839d4661b86ee43ae6c124a52010eaac1a1a59c8a521ee4935f       467  docs/evidencias-otimizacao-performance-etapa-1/baseline-functional.json
?       8416f8ecc1a0cd3a5251bae4e0a5237737257bcafde7704c271942207c53ffae        21  docs/evidencias-otimizacao-performance-etapa-1/baseline/BUILD_ID
?       8c8bc9e86cd16c31513cb243887c3cc057a841e090c436763c386edaf6a33996       683  docs/evidencias-otimizacao-performance-etapa-1/baseline/build-manifest.json
?       735bef8edf42f61be47ccde3420dbf89a27668a53257f3b4ecd84790ac4052a7    273860  docs/evidencias-otimizacao-performance-etapa-1/baseline/cadastro-1.json
?       b168791c2ba499259197ca84eeb7fc6e045f5ef3b96d286e76aa5cd3f82e3bdf    273848  docs/evidencias-otimizacao-performance-etapa-1/baseline/cadastro-2.json
?       4d7630f2a4f504c5d51f6bddd9d64dff815cd04bd2de3987632f6adaa0e4fae2    265832  docs/evidencias-otimizacao-performance-etapa-1/baseline/cadastro-3.json
?       c155b3e9fb3d056b4b2223e4dbda7a03a102effa71bef2d4f02300dfe07ab25d       563  docs/evidencias-otimizacao-performance-etapa-1/baseline/config.json
?       d620bae60c8eb4991f75094c9832656adaa12bd7ed8ee93df8924bffbaa569c0    326122  docs/evidencias-otimizacao-performance-etapa-1/baseline/inicio-1.json
?       64e2d81aa092725e24a3e15447a38115b59baa40c8c2195dcd28fb9bd9c057d1    331518  docs/evidencias-otimizacao-performance-etapa-1/baseline/inicio-2.json
?       aa5395f1ae16d0c3176f8460d7c0a9059a3ebb6a79453fa39a2dcf0500829d0a    324797  docs/evidencias-otimizacao-performance-etapa-1/baseline/inicio-3.json
?       151748098230cfb5b5391465092f4623761ddf358ac852d808a91265044ef101    274427  docs/evidencias-otimizacao-performance-etapa-1/baseline/login-1.json
?       6f4d19aad5485f87446596166f7c70f18566a951b3a433929c4303b06415e724    261039  docs/evidencias-otimizacao-performance-etapa-1/baseline/login-2.json
?       a5d4f728a897537154c045b94a276e0b279a3f7c68e824779b4c4ffc80f829c5    268219  docs/evidencias-otimizacao-performance-etapa-1/baseline/login-3.json
?       9df440bb5f008c85a6f0068d75755cad67386c0b66d304b79bd699d2b01a3b8e     28151  docs/evidencias-otimizacao-performance-etapa-1/baseline/route-bundle-stats.json
?       6dd84f856559ac2f4632504ea810eb902b071072756d608ba0e836d4eb1b1f03      2012  docs/evidencias-otimizacao-performance-etapa-1/benchmark.cjs
?       4f9a5073fe08c5c2375d143078efff6bfa01741cff3c5a2ac359e62bb524d187       603  docs/evidencias-otimizacao-performance-etapa-1/cookie-functional.json
?       cc16ceae9b4b5d08a8611b06b3a4c1cc804fed9f05f9f809e060df33b8de3db1        21  docs/evidencias-otimizacao-performance-etapa-1/cookie/BUILD_ID
?       60b326cd388140365b90623c4e1709134ff9e452fd2c10514c0e2566b13fb40f       683  docs/evidencias-otimizacao-performance-etapa-1/cookie/build-manifest.json
?       77604551bb7da4d98af41304a6a3920105f87cf9fe43bb3bee38335aa98f1b10    260042  docs/evidencias-otimizacao-performance-etapa-1/cookie/cadastro-1.json
?       6977dc371ec726a6dbee26245a094d0b132463acdce56c1cb54c49792ae65f52    270048  docs/evidencias-otimizacao-performance-etapa-1/cookie/cadastro-2.json
?       4ec9037416641439c1f1cceb2ec587f6f055b4f24d679543b54a81354b62c9c5    270183  docs/evidencias-otimizacao-performance-etapa-1/cookie/cadastro-3.json
?       444cef49ea784045c0666bb61c4a9def06ca0fda6c0107e61a86d423afe6797a       561  docs/evidencias-otimizacao-performance-etapa-1/cookie/config.json
?       77b20c656d2906e5c9d41d13ca4e0d718b8343e2e8b037a9250aa927979d21f9    332637  docs/evidencias-otimizacao-performance-etapa-1/cookie/inicio-1.json
?       eeaaddec50ad104b4496c8c4a25683f1669664bf9cb4e413ca8849e3482bbfc7    326492  docs/evidencias-otimizacao-performance-etapa-1/cookie/inicio-2.json
?       c35e42643acfbf9694fc36b24112dc2642c9b825c2eece988c2a0caae814ef61    332868  docs/evidencias-otimizacao-performance-etapa-1/cookie/inicio-3.json
?       db9123fcb082c68c0c5ab2a92ec7c10e58b2df6eb3ac9bcc89bde0112abba41e    265032  docs/evidencias-otimizacao-performance-etapa-1/cookie/login-1.json
?       3133a499ebb8e31ac81489111a2dc892dd98a7758631a6e8e4df4680de589525    267217  docs/evidencias-otimizacao-performance-etapa-1/cookie/login-2.json
?       e83d7aedfc97cd73ea01a9b1c218bcd8e402e5fa5eca5bc59883b0d2e87a64a9    261323  docs/evidencias-otimizacao-performance-etapa-1/cookie/login-3.json
?       1e2a1379eb6bbda875ab08b32340e020e946a11f5b80452ee455407d15d64e12       869  docs/evidencias-otimizacao-performance-etapa-1/final-functional.json
?       2306b8c76ffb017e3e02acafdc82cf01839ef5f16cbc68edd856229dee52d40a        21  docs/evidencias-otimizacao-performance-etapa-1/final/BUILD_ID
?       a8cc3ca4ef063ba7ab8a48a0896242fa409d0f7d2d8d780714c5b64d4316f85f       683  docs/evidencias-otimizacao-performance-etapa-1/final/build-manifest.json
?       dd38cc3944313b5c7b786f75b32b87f6e0c4e231afc20292b045ff8def0f2da0    257935  docs/evidencias-otimizacao-performance-etapa-1/final/cadastro-1.json
?       e05bf9ba608251d270ad0454c7e01442d2bfec7220ea6f51edc8e30d123a9691    269976  docs/evidencias-otimizacao-performance-etapa-1/final/cadastro-2.json
?       15b279d8146f964ad16023cca8fd65b55de6dd2a3efe4eb1cc57e807cfc7faf4    252518  docs/evidencias-otimizacao-performance-etapa-1/final/cadastro-3.json
?       c38501a63b89de336f5ba31409459e013ec75d3e166f5fd90cba564f4df09e37       560  docs/evidencias-otimizacao-performance-etapa-1/final/config.json
?       176609a8535da9ab089fb24e18f02b47cc2b4cd4a747dfe2297c02114df80c73    321673  docs/evidencias-otimizacao-performance-etapa-1/final/inicio-1.json
?       37014eb391d1d38779382e043e6e3e390cd85f310b6074aea1aa637c2f8cdcf3    323352  docs/evidencias-otimizacao-performance-etapa-1/final/inicio-2.json
?       2c6a89971936f02c09996ea113879a34409c03a2fc55573a38b8b8ea2e98f521    323205  docs/evidencias-otimizacao-performance-etapa-1/final/inicio-3.json
?       3225f785c689ae3aa103192e00fa7ac9195846200e176560ad3bc003d51c4552    261091  docs/evidencias-otimizacao-performance-etapa-1/final/login-1.json
?       03c2fa8436572c460d4e269b0fe57c12a5a93c23c2226558bde0366a01762ff2    263028  docs/evidencias-otimizacao-performance-etapa-1/final/login-2.json
?       5b9558e21437bd60b8c99beee4f5fd2ce06c1391f17a82ecce898fa1abe72936    268440  docs/evidencias-otimizacao-performance-etapa-1/final/login-3.json
?       c2e02c056d62b7e1974aa05384f791183566a5c7ed5d70671914c24f947a6c45      5099  docs/evidencias-otimizacao-performance-etapa-1/functional-smoke.cjs
?       76e1041dda38d7e5f88184c2237bfa9039bac6b46ada5ed1d2e2d7b19726183d       602  docs/evidencias-otimizacao-performance-etapa-1/home-navbar-only-functional.json
?       25a213c20c74a437b1711d09acff1994ffa187997a2ebd7f0e49c6c84ed038b9        21  docs/evidencias-otimizacao-performance-etapa-1/home-navbar-only/BUILD_ID
?       e013847737497cdb08465e9073096d9b4a3b7d4eac637a6e8d1f0ad88a64111f       683  docs/evidencias-otimizacao-performance-etapa-1/home-navbar-only/build-manifest.json
?       7dcd2d991ec43b6d708af45f801836f9cfd4289876a684fef074378f4a5b072b       531  docs/evidencias-otimizacao-performance-etapa-1/home-navbar-only/config.json
?       79676825026ed51ed5f343b9afba1fbeb9e1ad7861a5b03555e89847dd40f14c    331280  docs/evidencias-otimizacao-performance-etapa-1/home-navbar-only/inicio-1.json
?       680c97bd31da439efe74dd3f4f599df13dd864b2664b1644b6e93a9319c9d37e    317787  docs/evidencias-otimizacao-performance-etapa-1/home-navbar-only/inicio-2.json
?       bb1056c87762edf8f624321255e13c4ef08d2ebea020598bf8aed20b9fadcea0    317638  docs/evidencias-otimizacao-performance-etapa-1/home-navbar-only/inicio-3.json
?       138adf99aa04d44f16435212c7125b45079079ddff171c38b6ee5536455c30c6       467  docs/evidencias-otimizacao-performance-etapa-1/prefetch-functional.json
?       c7429c503a6bb8f1fe506a890d3993a201767664417af261cfe28a66d469a6e2        21  docs/evidencias-otimizacao-performance-etapa-1/prefetch/BUILD_ID
?       2da06d73d3a60350f5f6d30f5b4679107f9ace6f5475ec2d335e9f0dcde74cfb       683  docs/evidencias-otimizacao-performance-etapa-1/prefetch/build-manifest.json
?       edcc15837c16a2d016d7661592c7ed9b8c25928f6f94dd700b42718c4d8b7a2a       533  docs/evidencias-otimizacao-performance-etapa-1/prefetch/config.json
?       b4cf480e9f8995162ee3966ad8ca883c62b2a4cbcf8bca197f94488dc7cb3cc2    257231  docs/evidencias-otimizacao-performance-etapa-1/prefetch/login-1.json
?       8997045fcbb62b27cfcb7afe57eeab758e83b223c1eccc372f01fda86335c699    276005  docs/evidencias-otimizacao-performance-etapa-1/prefetch/login-2.json
?       bf6ad3cfe3500c5d6b799442e6cd5d4f746bfce8ca0d4a5aa0680459dec369f1    267091  docs/evidencias-otimizacao-performance-etapa-1/prefetch/login-3.json
?       8482600db281f525bf8a28827718e6a4d3ede686386c516482c92043bd4ea329     28151  docs/evidencias-otimizacao-performance-etapa-1/prefetch/route-bundle-stats.json
```

</details>

<details>
<summary>docs/evidencias-otimizacao-performance-etapa-2 — manifesto completo</summary>

```text
estado  SHA-256                                                           bytes  caminho
?       2174d4ef8e93ec0ed16928d1cebea467111b568b0e03134565d2d7ccdef69214        21  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/BUILD_ID
?       2108c5be22ac3cba052a2112753965f0505cd0494900e383484f778ebcfe30d5       683  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/build-manifest.json
?       239e7ec4328dc236e6d8e9fc5fb2d321dce405995abe96baee72db122b12d7cd    255673  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/cadastro-1.json
?       dafe1c3bb99c1a4e6c10d28284179e54cbd6782e032ae876c9d9340f989aba55    253609  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/cadastro-2.json
?       9f2a032cac95e2861e4c43dbd0dca344d6eea7b37509ffdf6871d7fca2cbe845    259435  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/cadastro-3.json
?       372bd98fcba8451e69c713db7cebeefc3c1219ccae4b08ac7d5cf40e93f0c1b1       572  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/config.json
?       2ab4feedcc72b29a819b562e0835b561344b55159ccb8c46675b5dd631100b18    325129  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/inicio-1.json
?       86254987d8cba2c37c8c3f05b3d7e7714c499c5d4cbeed89f401a1ba3af06803    314221  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/inicio-2.json
?       0aea8c4e506cc4b51cb82707c6b43f3dea60f6098751f28d30455de4e2ce47e3    313099  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/inicio-3.json
?       ab775f9c70c96c27bfffdee7e98b9bba818eaed438959a9c2b34b1163d3567ba    254647  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/login-1.json
?       8bbea9334ba5165796953e0e3ebc6df5ee59ca0fc3c923fd62d882129cd8e1d4    251138  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/login-2.json
?       0811288845a1f44f682dcd1ea9608c83d71c69a26bb5d530360cc0520e026405    252626  docs/evidencias-otimizacao-performance-etapa-2/auth-nav-prefetch/login-3.json
?       bb17d009de4452543e4f9a0449fdf2a125364e449d3389b0e38f03687c61a60d       890  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells-functional.json
?       ee6d0e665c1d514a48a2008bb701db635ffc6d001ecd1735baa60eb82e3d8da2        21  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/BUILD_ID
?       3f7e6e34937ea3d3cbd4a6c8e30b30769068f2e032816d9593e771b1ae898a9f       683  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/build-manifest.json
?       cd8075b6ab7b903a73a39922597a09c43fbcd77b9273269b09aa72b9c6460de1    258934  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/cadastro-1.json
?       13d8db28ade49a5860f06399f35ae3c727bfb39719588a0d08c1456c18b267ac    267266  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/cadastro-2.json
?       0598741ae23cb5b8108fa8a0d2e63e8819e8297ca8ce5710676b84bc3bd0cb9c    257676  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/cadastro-3.json
?       dec783f56f05024c1e305db89d99e79444d0d625ae5bdf8e94fd5fe3ce11208a       573  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/config.json
?       51ef2dcad3d34bf28b2fe08b617d6c3918aa08f6ec59510377934e1e2840050d    326432  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/inicio-1.json
?       e708b64e1c1736e60ad48514480d93669f614791adf2fa84e36af1b669007dad    308274  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/inicio-2.json
?       09da9b9d3f746ac60725b351ac77ca3a940fd430ad923f7e00221ee55cf42752    325086  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/inicio-3.json
?       8d74ff0a7229edb0e383b1298cc6d782aa5b6828c7069e1ba13705cb883e2881    256382  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/login-1.json
?       53c41ba48cc08989ee7f672e6a468c2993ecf6f1bdd0d44c9e3be6b984362742    258952  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/login-2.json
?       b8915274c56f698e0f968b3db1495e1f1af79511608b97f46f0b54baba91f219    257755  docs/evidencias-otimizacao-performance-etapa-2/auth-server-shells/login-3.json
?       5774802ad0f78952e31c4c06f15f951db3eaf23c68f7f93604383945447718a7      2629  docs/evidencias-otimizacao-performance-etapa-2/baseline-navigation.json
?       2306b8c76ffb017e3e02acafdc82cf01839ef5f16cbc68edd856229dee52d40a        21  docs/evidencias-otimizacao-performance-etapa-2/baseline/BUILD_ID
?       a8cc3ca4ef063ba7ab8a48a0896242fa409d0f7d2d8d780714c5b64d4316f85f       683  docs/evidencias-otimizacao-performance-etapa-2/baseline/build-manifest.json
?       5a6b69ddb32a90f3883d9824f35fe167439a5b479e526897bbfaebf30a4b0882    261740  docs/evidencias-otimizacao-performance-etapa-2/baseline/cadastro-1.json
?       a2fb8dd6cf2783f032517cb10c710955d6cbde1b69f8d95aa679ff0bbc9a563e    255538  docs/evidencias-otimizacao-performance-etapa-2/baseline/cadastro-2.json
?       f33b68dc521e2ef1e7aa324e54353d76a9b1b590f2f8434296774941bb2340ba    265301  docs/evidencias-otimizacao-performance-etapa-2/baseline/cadastro-3.json
?       c155b3e9fb3d056b4b2223e4dbda7a03a102effa71bef2d4f02300dfe07ab25d       563  docs/evidencias-otimizacao-performance-etapa-2/baseline/config.json
?       8eb0c56d48fc12b6f58b30adbfea32b34880ade8bb7414063a58035ed22b5a4f    306056  docs/evidencias-otimizacao-performance-etapa-2/baseline/inicio-1.json
?       93a3c2491861d3b49a047dbe41c9292946433f985a1f996dbf4abca0ee71cd62    325447  docs/evidencias-otimizacao-performance-etapa-2/baseline/inicio-2.json
?       7b2a01e417f7687ed8d22847cb7ca225c13c6df6126d433d9febfb8c8c5b8081    322219  docs/evidencias-otimizacao-performance-etapa-2/baseline/inicio-3.json
?       75ca97456ff7ba67dfce6aabe4e62d048bb88d0c20a8ce701c66427217791579    261142  docs/evidencias-otimizacao-performance-etapa-2/baseline/login-1.json
?       e5c56350ab919206525619b811e2858ce9d87205a8df0e98fc3bd487b11a78d7    265113  docs/evidencias-otimizacao-performance-etapa-2/baseline/login-2.json
?       429da041310b1860c0bd4f3dc9a1293254517db87fa47d66d101f9394441f3f3    265427  docs/evidencias-otimizacao-performance-etapa-2/baseline/login-3.json
?       6dd84f856559ac2f4632504ea810eb902b071072756d608ba0e836d4eb1b1f03      2012  docs/evidencias-otimizacao-performance-etapa-2/benchmark.cjs
?       8fa797cd314de77d7f021a5848ff629a45b12dcee7109c0f8af9594279f0bfb1      3732  docs/evidencias-otimizacao-performance-etapa-2/consent-responsive-smoke.cjs
?       e9fec0424ddf76108fc1f6b98db881d3578a55f6e19c7ed1147e71a52d7c155a       888  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask-functional.json
?       bd4ca5959827b889ad77860f424ca98690c81291631192d1623aa71e63090702        21  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/BUILD_ID
?       a01fe801a49aa4d0588b3a8ee4853562ed0df658a0787acc6fb012ce7dbcbbf4       683  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/build-manifest.json
?       3b601bb76c70c26d0a5a00f6b0c0b17a16e71cf41da7325032bb1e4251008f46    263925  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/cadastro-1.json
?       ed8a60c413855c064c4a29591060bd79fa135f1b0829594c8adef08e4274e5e8    259429  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/cadastro-2.json
?       4e1a3668504178fb687ea654cac8541896b42e7574cf9a24bc325e04599af71a    264874  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/cadastro-3.json
?       d96f37984f4f779b8e862d81266ebce471eb593334e741010ac77476956e1182       571  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/config.json
?       cc02cf4d57b21cf7fd3465a15a7f2b81e153468493f3ecec9063a5a303c8bf37    326383  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/inicio-1.json
?       83ce1b6cb70ed2ce3749f54ef0c895db87dd2a1ee173c261c4512ffbc8eef28d    309954  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/inicio-2.json
?       47bacc667a6dd616120ef0f329780f9793357a9a01b61d72a7465e83d01ffc52    300970  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/inicio-3.json
?       bb9490edca9a897124cc21586ba7126cd6f5bf814edd1a7619643ceebc2e6252    264977  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/login-1.json
?       96a475ac5686640513b44bac4aae9f6878afe9d6b617c169d892700117b85d07    265762  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/login-2.json
?       b8982001d4f9014d8362d4492daaad69cf2b91fd98d57d4e4957e61353f2a7b6    261969  docs/evidencias-otimizacao-performance-etapa-2/cookie-microtask/login-3.json
?       a20ea94ce75bdc3d53f876fcd8aea029fcbd2da8d67f7e85c691a48939043dd4      2040  docs/evidencias-otimizacao-performance-etapa-2/final-consent-responsive.json
?       02cccd4c6e1ac907efe415c7b36329df4c9a10506d021a8714783bce400b59f8       877  docs/evidencias-otimizacao-performance-etapa-2/final-functional.json
?       7d17af6421e8ed7ddf8db788af8aec334d8a62717fbb1abd0728eb172b8fade5       774  docs/evidencias-otimizacao-performance-etapa-2/final-home-login-navigation.json
?       d01b97040547af934f05ea857b22f5c9e7dc0336a4db4f3b347ff8f8a83854d3        21  docs/evidencias-otimizacao-performance-etapa-2/final/BUILD_ID
?       9ea76ee64338048a41657f7b81302b4e4b8878bbca8641a113858ed2d66726d3       683  docs/evidencias-otimizacao-performance-etapa-2/final/build-manifest.json
?       3780f6ea1e2be71b397a4c2525d4f240993a5938fb601288caf83c652539bc16    254696  docs/evidencias-otimizacao-performance-etapa-2/final/cadastro-1.json
?       ba77216df3f92b448b7228d7cd19aa9bceadee2d24863b56e58b68978833e174    253662  docs/evidencias-otimizacao-performance-etapa-2/final/cadastro-2.json
?       250777f3ec5bd653474dc4412e008866ae91f9d5cb64c8231f1d327c394791ca    260391  docs/evidencias-otimizacao-performance-etapa-2/final/cadastro-3.json
?       c38501a63b89de336f5ba31409459e013ec75d3e166f5fd90cba564f4df09e37       560  docs/evidencias-otimizacao-performance-etapa-2/final/config.json
?       9ccc7c03652222d9ec22da561393275ae89785ac92e71f59eee48740936bc57a    323387  docs/evidencias-otimizacao-performance-etapa-2/final/inicio-1.json
?       cc184a950f06fe2f70347ee2d8917751b1594ef86fbdba48ae45913079c976ed    324138  docs/evidencias-otimizacao-performance-etapa-2/final/inicio-2.json
?       951eeb69c673d052555e9c789ffc9beb86edf75f93ef6276b7e24b001e701670    318298  docs/evidencias-otimizacao-performance-etapa-2/final/inicio-3.json
?       3816afa8a4c08a6310514857f1dbb15b600abfbbf59d57245dabe7a48deb466d    271999  docs/evidencias-otimizacao-performance-etapa-2/final/login-1.json
?       77e8ff758cc44e440f7710546c274cf42fb603d82c5c12245baa507d03ec45e9    252812  docs/evidencias-otimizacao-performance-etapa-2/final/login-2.json
?       0015fbc128c857e40749d161fe43b3d863a72e35fb334684f9031a7556866db0    261270  docs/evidencias-otimizacao-performance-etapa-2/final/login-3.json
?       4a6060bc4d1022fcbe1ff6d07bd7028c14f25b8eb195b776dc3eca8bc5e2e2d3        21  docs/evidencias-otimizacao-performance-etapa-2/final/validated-build-id
?       c4f001f23c3050a79f2868cc07bc5129b4a216cc7d0946193b4d8716870c86a5        21  docs/evidencias-otimizacao-performance-etapa-2/final/validated-build-id-after-footer-revert
?       3477babb37ef8e1e5fe72cf81a7d218f44c02ebf947a38f7120e5fddc76cd035    256275  docs/evidencias-otimizacao-performance-etapa-2/footer-access-repeat/cadastro-1.json
?       09d286811362a0d0c63917f263e7dbc8b7a388ae8e641d3d99f4d5e7e984e545    248024  docs/evidencias-otimizacao-performance-etapa-2/footer-access-repeat/cadastro-2.json
?       9f1c56a9915e63c91246b0ced48b5e068aabf145ec83a915868770953166e882    256942  docs/evidencias-otimizacao-performance-etapa-2/footer-access-repeat/cadastro-3.json
?       6f97f15bedf0ee569365242725dd13a54b1384aff9ee1604220280007ea46d32       561  docs/evidencias-otimizacao-performance-etapa-2/footer-access-repeat/config.json
?       693487537aada062caa20519b2af0894109a9551e6dacf9a25da3ff68c7d66ad    262810  docs/evidencias-otimizacao-performance-etapa-2/footer-access-repeat/login-1.json
?       99bae4113f2dcc381d57ae42b0f7056e426182aabec5778231a503978d97d1e9    255694  docs/evidencias-otimizacao-performance-etapa-2/footer-access-repeat/login-2.json
?       c2607fb4c8de30b44ea86c77ce3923fc06afd55d2765a4ae3797d92bd6568d2e    261133  docs/evidencias-otimizacao-performance-etapa-2/footer-access-repeat/login-3.json
?       d0883a8b7a12d024880e337c54c4934a0a9b36d1763e4170cf598cdb4ee810eb        21  docs/evidencias-otimizacao-performance-etapa-2/footer-access/BUILD_ID
?       e4c23194a4fbfa019b73a83f92595bfc95568340a780e714f014a8ee403542de       683  docs/evidencias-otimizacao-performance-etapa-2/footer-access/build-manifest.json
?       cd225c75d07a98be63fde0adb119ed1301af08b51acdfedd51dbd0a282953104    259877  docs/evidencias-otimizacao-performance-etapa-2/footer-access/cadastro-1.json
?       109e17c928392460d423b0462430f0aaeceed349b04ccafbba73bdef69b5f630    255942  docs/evidencias-otimizacao-performance-etapa-2/footer-access/cadastro-2.json
?       6b68b240ccea343b572eb89d6b7d97ffd591419cf787a742e48224d5a15fc95e    260176  docs/evidencias-otimizacao-performance-etapa-2/footer-access/cadastro-3.json
?       4be622efff1a009dcd33e7b0adc1a7426423a6d576bbcfe99a5328fdc6affff9       568  docs/evidencias-otimizacao-performance-etapa-2/footer-access/config.json
?       d65f2eb29ed5fad99e9db264457777f25f1a253a042eae5b4283537ca6c3148c    338023  docs/evidencias-otimizacao-performance-etapa-2/footer-access/inicio-1.json
?       0a2d58aa77ef31bfaf0cb709c4abb110152b6d6e2461c7740dfb7054f1305e6f    326231  docs/evidencias-otimizacao-performance-etapa-2/footer-access/inicio-2.json
?       88eaf86f9d7a9c4c4a66f2fc798343ec3a6e9dfbd9965d9dccdf5b80d05d1af8    334807  docs/evidencias-otimizacao-performance-etapa-2/footer-access/inicio-3.json
?       02c2378c5cf3e86354d42781789bf98080cf5775fa3c4086c13b2f88049117f8    256139  docs/evidencias-otimizacao-performance-etapa-2/footer-access/login-1.json
?       1c4185d1ffe5e29278a22c9e47fdefb27090541eb3fe78cca0254a5faadd18f2    255882  docs/evidencias-otimizacao-performance-etapa-2/footer-access/login-2.json
?       cfb4ea968c3fb65e9bdb83ebc36a370bcba322831d58d7741302d97cf9a2bdfb    260777  docs/evidencias-otimizacao-performance-etapa-2/footer-access/login-3.json
?       63c27f70e96bb222a221fcc5702006b9b09930e4a850551d6f64f3bf190d215f       780  docs/evidencias-otimizacao-performance-etapa-2/home-login-prefetch-navigation.json
?       6eb77f340dd5fed2e5d31215800a226efa1503aefd96ed28cf4248b264065612        21  docs/evidencias-otimizacao-performance-etapa-2/home-login-prefetch/BUILD_ID
?       963a29838776d9deb76184e5dd1dcf31dfe9d96d8d40f0bd3594d9487ef7f8f1       683  docs/evidencias-otimizacao-performance-etapa-2/home-login-prefetch/build-manifest.json
?       05c34da40cf7d19c4c83283597b84a65e2f3df20900a0c2e43b6dba8113a6da6       545  docs/evidencias-otimizacao-performance-etapa-2/home-login-prefetch/config.json
?       280ae75541aef654215a451a76944e16517a4e526fa69c15492dce16d19b3f41    319512  docs/evidencias-otimizacao-performance-etapa-2/home-login-prefetch/inicio-1.json
?       bb0ad9e154c54a7bcf7b42f47e1d458096b7214251072a364150adc94e9ef364    328022  docs/evidencias-otimizacao-performance-etapa-2/home-login-prefetch/inicio-2.json
?       f9218ab306e0a7d68ff451598afd9ea1a3ae45013db1f96b312ab883fe0e2957    316991  docs/evidencias-otimizacao-performance-etapa-2/home-login-prefetch/inicio-3.json
?       1e7ec68f7e05f4f3d3755e713ca86fba02b5e98d0836797e2943edb9cc99fdd5       890  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell-functional.json
?       451d6e64fed5374f5c4b4f9bfe6da4dd040a0155200d63bb6ff77c3141944ab4       556  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell-home-repeat/config.json
?       5c6e6b3c666fc110b8d4ff3a28702588ad062916cc3ee4b42f698a2a6b61c420    307746  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell-home-repeat/inicio-1.json
?       96802b0c3bc3c95c4ab26ce864b8072feaeb7d5c3ba50afff4d8acdc201ab353    327235  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell-home-repeat/inicio-2.json
?       21c4bb35a9089aba281436400e5a677bad44a03f04f79f25362118283d73f667    325408  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell-home-repeat/inicio-3.json
?       a1e2e106c3114b107e1e5a4002d7e90aee1e35ffaa94b9024aca632ea04912a6      2639  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell-navigation.json
?       553cc7d3aa77848d42effeccdd26a45f601db21df00d6eeba4d23f9915ea576a        21  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/BUILD_ID
?       cfdd43673cff81f15cea9ccbc824f67e8f787fa4c433aa034a2232abd398344c       683  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/build-manifest.json
?       790a4f02671f72f98258488d4946fc7ed7cd4aacfff1e7a7c1a96e44a173ed98    257886  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/cadastro-1.json
?       ebfad137feae07acdf41d4d4495e5baf422a2e622e6c900a711c87a5f5a6bd93    257689  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/cadastro-2.json
?       a088bd1f7f9c8b22435e9494ba8ff497f1677e1489341301574860b3ab271e5c    256557  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/cadastro-3.json
?       5b1d9b347fbde88e452964dc9dd5a4256c57673e5f253188ef80c8d911c43594       573  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/config.json
?       56ca44ab9725328eec2a3cd8128db3802b8d0f299c9e705b549c95f02cfd93a6    314166  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/inicio-1.json
?       1a2d3b091544359b8722e41e013a9c568f2e503d923e7f1f5b5648ab326e3da2    305685  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/inicio-2.json
?       c7c37a1a4b3ab1619ea8f61953c081faba0317c610622ab85eeed516f0d5b373    324719  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/inicio-3.json
?       592f592316b63eacd223821257864caf449cc446bfdeedf5b2b7bd21c4465dd1    254885  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/login-1.json
?       9c54ee264a32609536ba6026705ed734f74dc0a2ea41d21f8a011bd64a38f906    264337  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/login-2.json
?       e2ef3d49537cc418605bfe3cdbf3f6892d9b23a60a25df7f77705e14d55e631d    258158  docs/evidencias-otimizacao-performance-etapa-2/login-server-shell/login-3.json
?       5111fcd99ee12653de23b9ea4f0a0e06db49235c3222282a47737ac32a7e7664      3548  docs/evidencias-otimizacao-performance-etapa-2/navigation-benchmark.cjs
?       6126c9d070fab7bf2e5e8ac9ced44f2c74c805f819457435afbf66207b27bac8       884  docs/evidencias-otimizacao-performance-etapa-2/profile-menu-functional.json
?       ccc908eb6816e4b06907e789cbce503e32ff5d5f2882da4bb382e12881c06e54        21  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/BUILD_ID
?       a64b6ff841a4ed6507bd815db459b2152717b379cabb59710b824947eb6bd3aa       683  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/build-manifest.json
?       a34cfa19a4971940971c6f410805156b2dc8b084ce02393fc6b1408e04d41009    266569  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/cadastro-1.json
?       0dc3ecd9fdec63abad960eb7e02b0a1d95ce5bc4370800d812ed2f65418aff2f    256985  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/cadastro-2.json
?       417fbf7789044fd77adde9ff46456b217606ee500045d082a10a3b83ff2187d0    258148  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/cadastro-3.json
?       b1d2961b9f4649287b76e8bd93d4cdceb81b1fbe06f0d22357a6f0593643e63e       567  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/config.json
?       1ee2a70c733c8250d422bf1bbb480b9a257fd1eade2d76e2031e67cd3390de4e    325437  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/inicio-1.json
?       79b48161fb10dd60fbeea3ba0346b5bfe60bed73e32c7e0104adad571dcad32c    315974  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/inicio-2.json
?       fc682bdbbe2650bd22da997b9755b46afe261d89b52e64054f8cb78522d4ae3a    310836  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/inicio-3.json
?       3760745c6379d676513a2e773ecb635d23489d9fed08961730ce346d62e4bb12    260266  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/login-1.json
?       725b095f54e56e8e10fef3d4233c479df4b08b98c6cce1f84dc70d6939dafd75    260903  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/login-2.json
?       50b17429f60dd9f45765deb874895aa5258408b44000742ef65b4957577b9922    261666  docs/evidencias-otimizacao-performance-etapa-2/profile-menu/login-3.json
```

</details>

<details>
<summary>docs/evidencias-otimizacao-performance-etapa-3 — manifesto completo</summary>

```text
estado  SHA-256                                                           bytes  caminho
?       277ca6d8ae1e72057466fe6eade0add36a36211a28fe87c768f49e7080d194d3      3788  docs/evidencias-otimizacao-performance-etapa-3/benchmark.cjs
?       3e18ddba95f10aac9da2d8d4314911210c3f8ef47221a241e28e21c20d95997f        21  docs/evidencias-otimizacao-performance-etapa-3/current-first/mobile/BUILD_ID
?       ad408c23bff74c07a33d2bd415df3fdf0ab7a09c6d6d3ed74cf3b6a29d1607f3       683  docs/evidencias-otimizacao-performance-etapa-3/current-first/mobile/build-manifest.json
?       312740b42b0cb19d052f26a02aad1aba0587ec64750461e4ac8359227b43efd7       395  docs/evidencias-otimizacao-performance-etapa-3/current-first/mobile/config.json
?       998a8f1c4f25c5ad762e00d2c582c8ae018d5af48b9dffb9aedb36e304c7bd7d    312870  docs/evidencias-otimizacao-performance-etapa-3/current-first/mobile/explorar-1.json
?       f6221998ff64e09966479a178bf6a91d54b70b1724542de3e47c2c0b065cca02    322292  docs/evidencias-otimizacao-performance-etapa-3/current-first/mobile/explorar-2.json
?       d1d239c691d8a3067a031195442ffe13d0ee758b6f7db4fa24846a2aa976e77d    412533  docs/evidencias-otimizacao-performance-etapa-3/current-first/mobile/explorar-3.json
?       a6b9cfcbce8c901577f9f4389d65724aa0a088c6ff93bc5bfb6cb3c667590fcd    324669  docs/evidencias-otimizacao-performance-etapa-3/current-first/mobile/explorar-4.json
?       d64c001a85e3c96946b8664edcc34ea1cbe0c5afdf3cc35360b9f2e244f9e8ae    328778  docs/evidencias-otimizacao-performance-etapa-3/current-first/mobile/explorar-5.json
?       c1828c72e5030a9a4f7aeb4bed62d7f1ff113fb83c2d539863c63979df0d465a      1642  docs/evidencias-otimizacao-performance-etapa-3/current-first/mobile/summary.json
?       97d64cb484a55561c33fcd9229d58bdc22f0fe58269947e3b855a72e3ee7f903        21  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/BUILD_ID
?       ddfaff93b0dd35219fb604160b5e1757583379c59b8f002ff9616f69f9bef0b3       683  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/build-manifest.json
?       d7088c6ea84e45ab5e6caff75f64b728eed11435cf493aee50b8d13dd9f52214       410  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/config.json
?       d99ddfc5b7c09918012fd58e6d4720640f229c7dd46d110570ee77f56f09692c    316316  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/explorar-1.json
?       285cd5b033075530e6354235c643ec314093794f7055a9a3fe360038f18c2701    327911  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/explorar-2.json
?       acc4ed7f5dfe11b13e157ed645141ea21346bad77abad11136743906a4d342d0    424153  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/explorar-3.json
?       acc7f1d7b5c8b82ee0414fbbabd13f752a434a5493db1b86355e4be705da81bd    323927  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/explorar-4.json
?       9f24c3a9d6c6db3772d82da094d9489502b04dbcb30b35843ef1852425a1d560    323501  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/explorar-5.json
?       b48ef8421f089ade2160ed1742d110cce04a0ad6cb38cbd36fe7e4cda63eed19    277648  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/garagem-1.json
?       f542a1ef898d30a2eb4a55d1dfc5c044e0c492cdcc1114b31220ed595cc309ff    277875  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/garagem-2.json
?       8662de6f3dab19e604c7bf8f712393530fd94a94908c7a01502c5d05c6019e22    279601  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/garagem-3.json
?       dbb2a3aa3e9e738caad2cb1a3c82373a29d62d7a3d1c4498deaf96c990795969    277270  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/garagem-4.json
?       56ad88dbfa1946bb17186bbec11efe3424ddc757ee69f4c82016536a96c82d75    275723  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/garagem-5.json
?       4c3453335816326c556f4e58050cfb1528526a881dd6074a168bd96e3cf4d215      2830  docs/evidencias-otimizacao-performance-etapa-3/current-repeat/mobile/summary.json
?       bdee8da2924e3393d191ee59e2ea676b034ac553e2f28739b1067671b2b3a8a2    197731  docs/evidencias-otimizacao-performance-etapa-3/desktop-configurar.png
?       e804e90eaf7ca5d48402066c4cb2601d1461bcadf81a813e8a5020e57183b30c    582797  docs/evidencias-otimizacao-performance-etapa-3/desktop-inicial.png
?       770de951d9a66be6870e6e99627eda3a8bbe2a9789b69a26a138ed67c633864c    149590  docs/evidencias-otimizacao-performance-etapa-3/desktop-privacy.png
?       332cb101ff8290b6e897808df4abf50fd779ebcb4659795bd811edba0ae754a9    157513  docs/evidencias-otimizacao-performance-etapa-3/desktop-terms.png
?       c5175fab8d11e3b4541a8684f6e81589f991a9dc7ac86ddb308847cb21083a86      2062  docs/evidencias-otimizacao-performance-etapa-3/explore-navigation.cjs
?       cbadd307eab4f55e9cc08f64b8153ca12c5bc69a7de56d4f7d94249defda849f       315  docs/evidencias-otimizacao-performance-etapa-3/explore-navigation.json
?       a883d31b011c68e897a20b893d6c064703946023d00aabd68da3b1dbbcdc3608        21  docs/evidencias-otimizacao-performance-etapa-3/final/mobile/BUILD_ID
?       53e17ce78f9120e873394d8d30b6106a8e5ede589abd5d774a8a3353223343c8       683  docs/evidencias-otimizacao-performance-etapa-3/final/mobile/build-manifest.json
?       99fd4484532104929b4f2d9850aafa0261711c09112e2368b8b6cd6c4b700b89       395  docs/evidencias-otimizacao-performance-etapa-3/final/mobile/config.json
?       400a30d2ba2f7e1ab02f970f6863264665e799e56057f856fd643bc3ed284059    310200  docs/evidencias-otimizacao-performance-etapa-3/final/mobile/explorar-1.json
?       ba3f9a35b89d2a6b21cce1d4b3da56c8132996e50dfccc5237a73d02485106ac    315680  docs/evidencias-otimizacao-performance-etapa-3/final/mobile/explorar-2.json
?       e2aac0029c2eb3b5138191e7ceb91971cbbeaf1538f989b858574e1e2523b719    321762  docs/evidencias-otimizacao-performance-etapa-3/final/mobile/explorar-3.json
?       6f9d6d60a6c7cd4725978f993b2a735d5504f33be926268647851524feacdae3      1169  docs/evidencias-otimizacao-performance-etapa-3/final/mobile/summary.json
?       fbd88676fa7ce6d42db8bd6a8ccca5f61122d8d2d19f59dad310c32f51062338    103491  docs/evidencias-otimizacao-performance-etapa-3/functional-smoke/desktop-explorar.png
?       7257c0460dd2245f647376746140c02f0d64d13a656ca1380c1f1ca2907361fe     56647  docs/evidencias-otimizacao-performance-etapa-3/functional-smoke/desktop-garagem.png
?       ce7dc8234a7c85cb2686670f3d4fc9d32e251534bffa9980e38ab174a9d446f3    163089  docs/evidencias-otimizacao-performance-etapa-3/functional-smoke/desktop-inicial.png
?       05c9a3dc41f533e90335efb2a448f3ec37a617afb5cb8241530a8fdc5127ae16    116050  docs/evidencias-otimizacao-performance-etapa-3/functional-smoke/desktop-login.png
?       b3c7fcb9e39ab6c10950385ce8263f95f93fd5b37eb50a6e82d6cda8dd286a0b     72952  docs/evidencias-otimizacao-performance-etapa-3/functional-smoke/mobile-explorar.png
?       ed3f3514b8d669ece47cd273855f8705f523b4e6945c9183c176908a27cf3591     46731  docs/evidencias-otimizacao-performance-etapa-3/functional-smoke/mobile-garagem.png
?       c6ee2096923b02c708c4585aeb5da1d0bac4701b4f9c40d2152ea2c599b47b2c    183001  docs/evidencias-otimizacao-performance-etapa-3/functional-smoke/mobile-inicial.png
?       cff8750c0c6b1c8d48f3ab9ad34c1b2831c3a40a8165ff752773d245c9faaf34     65647  docs/evidencias-otimizacao-performance-etapa-3/functional-smoke/mobile-login.png
?       5f9769e7ff55fcacdfd1f6db979a7dce242fe6f8187d119faeb602ef1bc5834a      3704  docs/evidencias-otimizacao-performance-etapa-3/functional-smoke/smoke.json
?       d505ee3a8ead4887a45a0ad27e0e274a982c1669bef7ec4be6b3ebade2e4ff02     73724  docs/evidencias-otimizacao-performance-etapa-3/mobile-configurar.png
?       6fd136904f9a3b4cc08fad8da7c7852dc7f2ba1d131ede391cad12e03b557a69    185251  docs/evidencias-otimizacao-performance-etapa-3/mobile-inicial.png
?       b76e02564b1ee6354d2d700e64a183c57aed3676fcded58365e7156a8b0f5e5f    103646  docs/evidencias-otimizacao-performance-etapa-3/mobile-privacy.png
?       a350b6b545fcc12e12c12e95f5b938b141f5bc9e7cdcfb0e2a26099056bd8d57    106080  docs/evidencias-otimizacao-performance-etapa-3/mobile-terms.png
?       51a8693996d34ca3a45a4d9ea2666ff765654921e52f87f4fcb6a73dadceaf56        21  docs/evidencias-otimizacao-performance-etapa-3/no-explore-prefetch/mobile/BUILD_ID
?       f012d6c0acc07b5676a2177102a32bb567fc809b023d6807b82c82f58260c819       683  docs/evidencias-otimizacao-performance-etapa-3/no-explore-prefetch/mobile/build-manifest.json
?       312740b42b0cb19d052f26a02aad1aba0587ec64750461e4ac8359227b43efd7       395  docs/evidencias-otimizacao-performance-etapa-3/no-explore-prefetch/mobile/config.json
?       4f979d0eb3ae822f4335cc3c4275a3ef1016a5758371b5b52c4ebc5ffcd54efb    396020  docs/evidencias-otimizacao-performance-etapa-3/no-explore-prefetch/mobile/explorar-1.json
?       7549f9949d553e40165fea6551ba35b97680fcdca720762158d4d8555295fbf4    405502  docs/evidencias-otimizacao-performance-etapa-3/no-explore-prefetch/mobile/explorar-2.json
?       f2d2d91b882a01f5f6da853cbd08ad4ee22e22c33011d18d975ea9ad760572c2    318011  docs/evidencias-otimizacao-performance-etapa-3/no-explore-prefetch/mobile/explorar-3.json
?       a2245ff33d083eacee7bbdd5630245afc57d84a1de2bd50adc167834dafc37d4    322703  docs/evidencias-otimizacao-performance-etapa-3/no-explore-prefetch/mobile/explorar-4.json
?       42133e90dfe2199944910a95fe0e519a0ef852b82f0247418d7bd3047391ff64    313833  docs/evidencias-otimizacao-performance-etapa-3/no-explore-prefetch/mobile/explorar-5.json
?       cd8c1cdd0aaa7273c250f897eb8144e19820bbb6500e848a8e3ae64447359927      1642  docs/evidencias-otimizacao-performance-etapa-3/no-explore-prefetch/mobile/summary.json
?       36afc4282b763ef1b1bc9ccb62fae794af3daca9d25532d40d5a332914d9761c        21  docs/evidencias-otimizacao-performance-etapa-3/old-template/mobile/BUILD_ID
?       41ffa77b6dd8ad7a00224348b982250d7e77771a5ad7c61c281ea8144f29a8ec       683  docs/evidencias-otimizacao-performance-etapa-3/old-template/mobile/build-manifest.json
?       312740b42b0cb19d052f26a02aad1aba0587ec64750461e4ac8359227b43efd7       395  docs/evidencias-otimizacao-performance-etapa-3/old-template/mobile/config.json
?       7397251d5432caf04daed7e2b77ad6bea5d955983389938821f43c677db006bb    315918  docs/evidencias-otimizacao-performance-etapa-3/old-template/mobile/explorar-1.json
?       b58fe9b690a8f3595320a9d160ae05c68ab4eade27ba7b64658fcbd6241878fb    318548  docs/evidencias-otimizacao-performance-etapa-3/old-template/mobile/explorar-2.json
?       7419246e12384eb91320fed0100b430db41e898f711bec1e767666be7c79a659    321575  docs/evidencias-otimizacao-performance-etapa-3/old-template/mobile/explorar-3.json
?       562bae7e47b6c3036bdfd6005685578bde6ca5bc40c570688620db54678c1623    322575  docs/evidencias-otimizacao-performance-etapa-3/old-template/mobile/explorar-4.json
?       681ea94fd11d7134938c9ae81fe9f2756479009a7b3b797586ece32899f20b35    319593  docs/evidencias-otimizacao-performance-etapa-3/old-template/mobile/explorar-5.json
?       ab293b28a8ecad54accca5a8f0ebf7ddcf29e9c2894c01ce4c1b4b66232c7db7      1747  docs/evidencias-otimizacao-performance-etapa-3/old-template/mobile/summary.json
?       26c6a3654ff4561e38824efe9e32d0c21d0ad51a87b1ef396d8de8073597bceb      2128  docs/evidencias-otimizacao-performance-etapa-3/resultado.json
?       7ab57f013fe960797c2047cf234a675c344492a81e2992d389e9b1bd6adf0ed6      1908  docs/evidencias-otimizacao-performance-etapa-3/skeleton-navigation.cjs
?       56a65a83783593e828b2bad94491480a58250d4cd53ef1ff1fd45d26c8f878a5       245  docs/evidencias-otimizacao-performance-etapa-3/skeleton-navigation.json
?       3fc9bf129c49b92d8dd2a1cf7e8a1858a0bf3d2aea82419e15d562f208b4869e      2742  docs/evidencias-otimizacao-performance-etapa-3/smoke.cjs
?       d615cad9f63324241b0790e5d5815a53c10dafe527ed138d21cd8f5e7857be20      7066  docs/evidencias-otimizacao-performance-etapa-3/statistics-output.json
?       8c4d7253c6dfbec937f3d16800bdaca0225204860e7c916cd863dddcb07499f5     21467  docs/evidencias-otimizacao-performance-etapa-3/statistics.json
?       3d42620aebdf8ce49532804954ad2b142f379e63ee950eddf1fd584db27abd2f      2392  docs/evidencias-otimizacao-performance-etapa-3/summarize.cjs
?       cf979019ca70a407621440f0db7cfc1c62a5f76e3a77d6673d1c4a82b7dcca59       204  docs/evidencias-otimizacao-performance-etapa-3/template-current.tsx.txt
?       4ddaf6a5f7f5aa604c8fe2947ea568fdc4686471147e47fe1605c24ee1896319      8523  docs/evidencias-otimizacao-performance-etapa-3/validacao-cookies.cjs
```

</details>

<details>
<summary>docs/evidencias-performance-continuacao-2026-10-13 — manifesto completo</summary>

```text
estado  SHA-256                                                           bytes  caminho
?       d82a56c002e816ecd068bfbfad8dd8bfa8fe136b5244beb68024b8470992a52c     11029  docs/evidencias-performance-continuacao-2026-10-13/baseline-layout-trace.json
?       bf81d62fde2e78a10600e7697d6eb62664434c41a27a277705106430e218d1ad        21  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/BUILD_ID
?       f9a1f69c1b64178a1e9e3b31f275c5fa07a6f25b2bd6eb2053c13048d3586312       683  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/build-manifest.json
?       03913879c50747cd9679ab3aa774c7c0f844bbcd3fc1c0539ea5565779d7de53       425  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/config.json
?       b4349b79dc2dd50db2c8e7d39a8797eaf5e7db67c6a8a61c94fb38e1e9474751    318684  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/explorar-1.json
?       4f83a4b014fd839933820f0d8e32759085586693257ce0bb77a61f018fdbece5    321077  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/explorar-2.json
?       becab4dbbec62497396b622d145df8ba892a38b961469e0a19a1c36e3a384f82    316319  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/explorar-3.json
?       c8e4080ebd7118846f1314cf2900a56f701d3464c6c56de1d1509d04a5a2e9db    285350  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/garagem-1.json
?       09294b7bc9d7eeb59e663d3bf151bfe849ee36d26aa2c0128f2a4031e713d259    278906  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/garagem-2.json
?       655d60856f836453eee3fb3460b91138652061fabd8ef63bf29f2db94e663373    283331  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/garagem-3.json
?       822186cd365ca6214e4c8fe0efc69f867dfc61ab14dfc624955536e564a2aee4    329434  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/inicial-1.json
?       0e3eaadee852ce39e1c9f83a6f47e519ef387edc6d5e7b2c52410faa47773a7d    332311  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/inicial-2.json
?       06c5d7ad89696c5855f34ef6a8444c537d64dc50263adc313f9013cf75eb1205    332674  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/inicial-3.json
?       51abed66e4417823fa39141dd00c2acee404a79cc1038e5091634521651c9deb      2718  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/desktop/summary.json
?       bf81d62fde2e78a10600e7697d6eb62664434c41a27a277705106430e218d1ad        21  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/BUILD_ID
?       f9a1f69c1b64178a1e9e3b31f275c5fa07a6f25b2bd6eb2053c13048d3586312       683  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/build-manifest.json
?       fe49b1765c8b140bdc1773de0827a24664b44444c4c014f2e85885f70b806968       425  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/config.json
?       37c757013d521e7bf2455fc47baaa43ab0ce72394089aacf1d9b9be034a36bbf    338019  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/explorar-1.json
?       3d1832be1aade322fa9fb6bf430ce357b3515225d574b2a1d30c1d31c3140c92    328438  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/explorar-2.json
?       4d90a398351985ee0d305e5ea4a9326d6dd022c72b8a0dba58af48ed9898e5a2    329868  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/explorar-3.json
?       5902e2ea225986c37a3273057399dc6225afd3f4df1c706ef98593f0eef06c1e    290168  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/garagem-1.json
?       4ede0f3e7c74c9189028faef5f3f53042276e9c49eb561f09f53c99d123fbf5f    288823  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/garagem-2.json
?       9bafa716ebf63d96e160b3ed7efabf7deecf9714f586b77581609d76de8bdc73    285546  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/garagem-3.json
?       f52e6d829426ca55da5c353278be43d8c4b3544ef2216435a4f98cbcefbbc72e    320675  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/inicial-1.json
?       0e5ba7d1e7633fb08f7f15fcb0c655fdcd96435aeded835d0cb37e7a44087a74    330182  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/inicial-2.json
?       0890db821cfb3471ec16b25e4a31733150d059faba4d99f895dd96261d7f5c49    323834  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/inicial-3.json
?       531031494d2278e3cefe2caf1a1b925d22e6321b132f8374241ea8127c91375c      2735  docs/evidencias-performance-continuacao-2026-10-13/baseline-repeat/mobile/summary.json
?       fbd88676fa7ce6d42db8bd6a8ccca5f61122d8d2d19f59dad310c32f51062338    103491  docs/evidencias-performance-continuacao-2026-10-13/baseline-smoke/desktop-explorar.png
?       ab072bbe4b0ff9b898b575b8d11b08ab42b5972e4bf9635d53aadb6402b92321     76508  docs/evidencias-performance-continuacao-2026-10-13/baseline-smoke/desktop-garagem.png
?       1bdd282b065af86f0bb9aec09dd1b5247b17f640a5dd442c158bcf2c6bc3b2ef    584161  docs/evidencias-performance-continuacao-2026-10-13/baseline-smoke/desktop-inicial.png
?       05c9a3dc41f533e90335efb2a448f3ec37a617afb5cb8241530a8fdc5127ae16    116050  docs/evidencias-performance-continuacao-2026-10-13/baseline-smoke/desktop-login.png
?       8b659e7989499e11ec1b7962d362d5577fb48c2af00a0f2f81634931f0ba94e3     72950  docs/evidencias-performance-continuacao-2026-10-13/baseline-smoke/mobile-explorar.png
?       c0fbfcd66ffe517435db37a02c8103a39a45e63cea7017ca6b81098cd06a1b05     63954  docs/evidencias-performance-continuacao-2026-10-13/baseline-smoke/mobile-garagem.png
?       7cb2232d043acd05c7b6e681c16f05ecf30066e01602b2131cf27fa37c01559c    196489  docs/evidencias-performance-continuacao-2026-10-13/baseline-smoke/mobile-inicial.png
?       cff8750c0c6b1c8d48f3ab9ad34c1b2831c3a40a8165ff752773d245c9faaf34     65647  docs/evidencias-performance-continuacao-2026-10-13/baseline-smoke/mobile-login.png
?       0f5559dfaed69581212c4ce9156a72afe446dec4a3dbc00f872e10bc93d0334f      3698  docs/evidencias-performance-continuacao-2026-10-13/baseline-smoke/smoke.json
?       bf81d62fde2e78a10600e7697d6eb62664434c41a27a277705106430e218d1ad        21  docs/evidencias-performance-continuacao-2026-10-13/baseline/desktop/BUILD_ID
?       f9a1f69c1b64178a1e9e3b31f275c5fa07a6f25b2bd6eb2053c13048d3586312       683  docs/evidencias-performance-continuacao-2026-10-13/baseline/desktop/build-manifest.json
?       0909555fa3ee77903ef0f97ecafbacb7819ab4795c61ea2dda6e718b1343de36    266644  docs/evidencias-performance-continuacao-2026-10-13/baseline/desktop/cadastro-1.json
?       b278d183aca4234028c5805c4d71da95f464c79b4e8a3de51028fad2ebb2e4d1       454  docs/evidencias-performance-continuacao-2026-10-13/baseline/desktop/config.json
?       e45b58d0ff745d185f56741bd9f68b783a0be76c54e11ac0ae2ef9366bbde96e    319886  docs/evidencias-performance-continuacao-2026-10-13/baseline/desktop/explorar-1.json
?       296fa9bcb7e82fb586c3d77e1af76c3669db32f45136e4bf6f0422c86475f8f3    283913  docs/evidencias-performance-continuacao-2026-10-13/baseline/desktop/garagem-1.json
?       12f10fb0ec686a2f31ea27d31361772539cdb28ef47419195243dfd829b61db3    331550  docs/evidencias-performance-continuacao-2026-10-13/baseline/desktop/inicial-1.json
?       4dbaa090351f99cf223fcbadb78ed184950f3411bd83c185a076dc518d0ff499    272062  docs/evidencias-performance-continuacao-2026-10-13/baseline/desktop/login-1.json
?       02bc209ac32352f2d0b201fce245b443ab6f011210b6afc090d2d38ee0bcf314      1781  docs/evidencias-performance-continuacao-2026-10-13/baseline/desktop/summary.json
?       bf81d62fde2e78a10600e7697d6eb62664434c41a27a277705106430e218d1ad        21  docs/evidencias-performance-continuacao-2026-10-13/baseline/mobile/BUILD_ID
?       f9a1f69c1b64178a1e9e3b31f275c5fa07a6f25b2bd6eb2053c13048d3586312       683  docs/evidencias-performance-continuacao-2026-10-13/baseline/mobile/build-manifest.json
?       8b3ec18d45a453aa2672754510ca45fd6c157d9005849243e623e98eec1322c2    261501  docs/evidencias-performance-continuacao-2026-10-13/baseline/mobile/cadastro-1.json
?       d4a644cb4f458ab83e6892ad5ce76ce93261b55d570b5aee0f6b1031b7570640       454  docs/evidencias-performance-continuacao-2026-10-13/baseline/mobile/config.json
?       9821f16dfa8ccba56ac98e428e938f0363780c0b9b00643232f49fe7aa0a1d96    323020  docs/evidencias-performance-continuacao-2026-10-13/baseline/mobile/explorar-1.json
?       1366bfc5ce6073366ce3e4ea7411670cac1ace52c541b75761ec85f09e23f7fd    281072  docs/evidencias-performance-continuacao-2026-10-13/baseline/mobile/garagem-1.json
?       9cba72030c73768ac4171020713d952ae621bfcd6b6fbfb7cfe2ae1550423e7a    304764  docs/evidencias-performance-continuacao-2026-10-13/baseline/mobile/inicial-1.json
?       0343b9f9b2e403c430f591ff786e9708694c8de06eb99f8941066c8ac07f1b22    264289  docs/evidencias-performance-continuacao-2026-10-13/baseline/mobile/login-1.json
?       ecf61b443706bca25a053a0c11a41dd385ab55bac2e7466f69f6d6dd4fc4aa0b      1739  docs/evidencias-performance-continuacao-2026-10-13/baseline/mobile/summary.json
?       277ca6d8ae1e72057466fe6eade0add36a36211a28fe87c768f49e7080d194d3      3788  docs/evidencias-performance-continuacao-2026-10-13/benchmark.cjs
?       a8dda73b16b209c164a999be0afb23d21803af7fc7c5b8644fbfdcb9e6110a82     10383  docs/evidencias-performance-continuacao-2026-10-13/candidate-layout-trace.json
?       fbd88676fa7ce6d42db8bd6a8ccca5f61122d8d2d19f59dad310c32f51062338    103491  docs/evidencias-performance-continuacao-2026-10-13/candidate-smoke/desktop-explorar.png
?       ab072bbe4b0ff9b898b575b8d11b08ab42b5972e4bf9635d53aadb6402b92321     76508  docs/evidencias-performance-continuacao-2026-10-13/candidate-smoke/desktop-garagem.png
?       765c786cab3c040be849ed8e551bd314c0cbd2af6ad63374bc1be6a76412f39a    580129  docs/evidencias-performance-continuacao-2026-10-13/candidate-smoke/desktop-inicial.png
?       05c9a3dc41f533e90335efb2a448f3ec37a617afb5cb8241530a8fdc5127ae16    116050  docs/evidencias-performance-continuacao-2026-10-13/candidate-smoke/desktop-login.png
?       2b15a955168c7bcd72a3a04648eb85a2d4bdaf62916f29a762f1ebf62fc6c731     57840  docs/evidencias-performance-continuacao-2026-10-13/candidate-smoke/mobile-explorar.png
?       c0fbfcd66ffe517435db37a02c8103a39a45e63cea7017ca6b81098cd06a1b05     63954  docs/evidencias-performance-continuacao-2026-10-13/candidate-smoke/mobile-garagem.png
?       7cb2232d043acd05c7b6e681c16f05ecf30066e01602b2131cf27fa37c01559c    196489  docs/evidencias-performance-continuacao-2026-10-13/candidate-smoke/mobile-inicial.png
?       cff8750c0c6b1c8d48f3ab9ad34c1b2831c3a40a8165ff752773d245c9faaf34     65647  docs/evidencias-performance-continuacao-2026-10-13/candidate-smoke/mobile-login.png
?       6d9ef51d91da2192e990772d76575a0d4aac694e0cb5bbdd9227bd649ea3058e      3667  docs/evidencias-performance-continuacao-2026-10-13/candidate-smoke/smoke.json
?       5b8006d0e182ac9d8dee8a3603d62ed2dc8c100bcd78119a67e67ee0bc3f0d79        21  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/BUILD_ID
?       58d9ef4636122423d2940cd0ec06e740c1e573940382505b3a0c290efbc1f306       683  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/build-manifest.json
?       03913879c50747cd9679ab3aa774c7c0f844bbcd3fc1c0539ea5565779d7de53       425  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/config.json
?       4f2cbd11400c6237aca28098242e01cd716d76d7a91f5ca56009c0cc387a5f01    312202  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/explorar-1.json
?       5e10553babb169712157c117e3d39442ec58232bb2ebd03595474536375a1b05    307607  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/explorar-2.json
?       c74b50612c31bc368690abc6fc0e931952a2a9d47461cd6191b99d2592de466f    307983  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/explorar-3.json
?       59d966221973a7f608f4ef1be8c2d34ed7ab5a70ef74bb4d42466a1c7380a5ca    281506  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/garagem-1.json
?       5a2e583d059de60c8bcb5333cdb4145fde3f42a038bc2363a05fee563ac8eba3    285502  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/garagem-2.json
?       e3eca5dfbed2f204d5646306b502a2183a2e71aef25e46225c0a796f7005a007    280890  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/garagem-3.json
?       d33f96204289cc0d1418a1460eb68948589f9aee56a01ff046a30063021fb80c    318002  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/inicial-1.json
?       357823ae15642f5ea3dcbaf5785f3027847ba6e51e7b3c5f0b3f74a8a7bc5f64    323035  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/inicial-2.json
?       03bbaab88b470aeb71dc58f9d194f73e1e0142d37d15037bd8cbda517ba5f246    327208  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/inicial-3.json
?       004bb9997b9b155beae2024a8347b92874b2d25fb1ae115beaa95c6149dd8e28      2766  docs/evidencias-performance-continuacao-2026-10-13/candidate/desktop/summary.json
?       5b8006d0e182ac9d8dee8a3603d62ed2dc8c100bcd78119a67e67ee0bc3f0d79        21  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/BUILD_ID
?       58d9ef4636122423d2940cd0ec06e740c1e573940382505b3a0c290efbc1f306       683  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/build-manifest.json
?       fe49b1765c8b140bdc1773de0827a24664b44444c4c014f2e85885f70b806968       425  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/config.json
?       d04a7de1955907cce12be89e674e36ed4c30346ff53451cef1a458489bd1ea84    309913  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/explorar-1.json
?       cee898e27a03a722bd5adacabfb56832a637d0295f01dfc997d40777ddf07f0d    314177  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/explorar-2.json
?       12723067c5877d5e06d518954a04b8c0a7933bb2377fb17c331c2161131e53de    315064  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/explorar-3.json
?       f3f410fdca59e6a3d8e3492f8850a08289fb26781842da4d67bd1ef4a5aa858a    277407  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/garagem-1.json
?       b7733912a70807bb8f404aaae2c379107e8d5c30888f181d4f2d25550637cd20    278131  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/garagem-2.json
?       158bb370675d559cd885e34f5c1e50e1a9a67e3650e1c832a40354773b0faee2    262942  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/garagem-3.json
?       31fb7d34972dfad4214a178e5f145b10e90692934f88ac809d4c613b353e2d3b    324434  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/inicial-1.json
?       31e02cb70b21216326476bb539e43d864d4c776810d29e34e385cb144ce9c071    312303  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/inicial-2.json
?       33e5aa8a06482212b69c12370f972253c9ad4814dbf4eea76bfb35aef73a2df7    312295  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/inicial-3.json
?       f6d23d46f13b5313dd889e86651f9f1d8c58e2cb7fc8b7808af85fea7e757247      2668  docs/evidencias-performance-continuacao-2026-10-13/candidate/mobile/summary.json
?       bdee8da2924e3393d191ee59e2ea676b034ac553e2f28739b1067671b2b3a8a2    197731  docs/evidencias-performance-continuacao-2026-10-13/desktop-configurar.png
?       1bdd282b065af86f0bb9aec09dd1b5247b17f640a5dd442c158bcf2c6bc3b2ef    584161  docs/evidencias-performance-continuacao-2026-10-13/desktop-inicial.png
?       770de951d9a66be6870e6e99627eda3a8bbe2a9789b69a26a138ed67c633864c    149590  docs/evidencias-performance-continuacao-2026-10-13/desktop-privacy.png
?       332cb101ff8290b6e897808df4abf50fd779ebcb4659795bd811edba0ae754a9    157513  docs/evidencias-performance-continuacao-2026-10-13/desktop-terms.png
?       3ac12334001b9b0e4dd8e7896900c6a8fd3bc9479210b5991ba7069e36549ff0     10011  docs/evidencias-performance-continuacao-2026-10-13/final-layout-trace.json
?       fbd88676fa7ce6d42db8bd6a8ccca5f61122d8d2d19f59dad310c32f51062338    103491  docs/evidencias-performance-continuacao-2026-10-13/final-smoke/desktop-explorar.png
?       ab072bbe4b0ff9b898b575b8d11b08ab42b5972e4bf9635d53aadb6402b92321     76508  docs/evidencias-performance-continuacao-2026-10-13/final-smoke/desktop-garagem.png
?       765c786cab3c040be849ed8e551bd314c0cbd2af6ad63374bc1be6a76412f39a    580129  docs/evidencias-performance-continuacao-2026-10-13/final-smoke/desktop-inicial.png
?       05c9a3dc41f533e90335efb2a448f3ec37a617afb5cb8241530a8fdc5127ae16    116050  docs/evidencias-performance-continuacao-2026-10-13/final-smoke/desktop-login.png
?       2b15a955168c7bcd72a3a04648eb85a2d4bdaf62916f29a762f1ebf62fc6c731     57840  docs/evidencias-performance-continuacao-2026-10-13/final-smoke/mobile-explorar.png
?       ed3f3514b8d669ece47cd273855f8705f523b4e6945c9183c176908a27cf3591     46731  docs/evidencias-performance-continuacao-2026-10-13/final-smoke/mobile-garagem.png
?       08e8b021a07097206cece0b4c6645e169387bb8181881026968be89ab8241ebf    187617  docs/evidencias-performance-continuacao-2026-10-13/final-smoke/mobile-inicial.png
?       6c4234a612e4ce277d47603d5deeda8cbd49c962ebb750d9f7b3d5115acd875b     47972  docs/evidencias-performance-continuacao-2026-10-13/final-smoke/mobile-login.png
?       5f9769e7ff55fcacdfd1f6db979a7dce242fe6f8187d119faeb602ef1bc5834a      3704  docs/evidencias-performance-continuacao-2026-10-13/final-smoke/smoke.json
?       fe0a396d03b2a6931d0216056bd4874a4eb28be533553d0d98aae4f20674efe0        21  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/BUILD_ID
?       5d635d69bd036cb0af90a869d9e04cd61f8fd5460a86139e10ec24e7bbdb84ef       683  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/build-manifest.json
?       03913879c50747cd9679ab3aa774c7c0f844bbcd3fc1c0539ea5565779d7de53       425  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/config.json
?       d371249c15680b9fec8b921c4f0a763964bcae7644ed8e057961154ff26b8476    317712  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/explorar-1.json
?       7bd8aade5a5d293385b4788ac183c6000a1320f8ece1a10fd0167e3adf7203f1    323468  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/explorar-2.json
?       169e8be70912d6500737d811b601f2b82540fd88709bd220affa3954f4630736    321124  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/explorar-3.json
?       9d56a774df753c26d6f096d86a3ec4a2610b94f62ee83aed4f1051eaeda6c125    286136  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/garagem-1.json
?       b73f343fe421134751a13d0626a3c735c4341bb9135287201444c2d15ef9c51e    283571  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/garagem-2.json
?       e9b83525b2a048c22ee6139c4ba38bb4ed570a5bf6f6baed8f859a55f8018927    283830  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/garagem-3.json
?       c973930debdde8bcc921a05fe465c09f12b4f5a6b8c1b1615015eda93d5d4def    315125  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/inicial-1.json
?       01f3be74aeb38f78bd654effd258fd512a5bc8ce212a156b534faa19af03814c    339496  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/inicial-2.json
?       8855d1d6169d830bb18df0627dfba2262e1c9d43fc0b3ac88ccdc9589137e9f6    330359  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/inicial-3.json
?       cad563bbdc748cb632b250faf2c91c769370fb942923269a463e838bb5bdcae8      2767  docs/evidencias-performance-continuacao-2026-10-13/final/desktop/summary.json
?       fe0a396d03b2a6931d0216056bd4874a4eb28be533553d0d98aae4f20674efe0        21  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/BUILD_ID
?       5d635d69bd036cb0af90a869d9e04cd61f8fd5460a86139e10ec24e7bbdb84ef       683  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/build-manifest.json
?       fe49b1765c8b140bdc1773de0827a24664b44444c4c014f2e85885f70b806968       425  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/config.json
?       5cf350b84435e4504c127ee9ba3d2d668fba09ab640663ad45c95bb5ec4aeb5a    322389  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/explorar-1.json
?       deea2b708fab932a61815fed3c8484af8bf17a94bb53c7179a4c5fee09b08d32    322636  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/explorar-2.json
?       f65421e26e6aeb2beab980db800153e298faaf7d2ab7024985c3385b17120692    426439  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/explorar-3.json
?       7fc0406d6bf972b0da0bc6650eacd1e989c92952cd2cbaf0f09b4f8d3a13717c    277497  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/garagem-1.json
?       2507ebad8700595812d2f855eacca82b4904933d4e065eeea48b3e6a02944ebe    283468  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/garagem-2.json
?       b55a1ca414c3b39ac38008440a4943103cf224640ce7a360f1cafa8b91f64529    289560  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/garagem-3.json
?       6435a5af0f33156ef5b48b3d67a395049488f3c851a099940fbded285e26809e    311590  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/inicial-1.json
?       809b8a7507368c54e74477cadaebb759a4dd03a0c5e59923e35c38da9a4b0168    311930  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/inicial-2.json
?       93dc001c9d49bddb15d3fb8c7fb4246767991fe7bcb3a3cb4fa8eb2387925194    307619  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/inicial-3.json
?       378ec983ef7bee94ef44d399f4d123aa06cebe28f53b52384a78d5a6bd2bdf6b      2648  docs/evidencias-performance-continuacao-2026-10-13/final/mobile/summary.json
?       23bf3631417bff1956efd616ccaecffea519932b7f1b642c80e816bfec8e628a      2625  docs/evidencias-performance-continuacao-2026-10-13/layout-trace.cjs
?       1eaa843883064c25675ac7289140c764c60a2d1e4ce14833d486b039a4d4cdd1     73567  docs/evidencias-performance-continuacao-2026-10-13/mobile-configurar.png
?       9ebaac3ab7d142107cdf4525919258266f94302ca4a1142a0e58ad0fb55f2068    188766  docs/evidencias-performance-continuacao-2026-10-13/mobile-inicial.png
?       b76e02564b1ee6354d2d700e64a183c57aed3676fcded58365e7156a8b0f5e5f    103646  docs/evidencias-performance-continuacao-2026-10-13/mobile-privacy.png
?       a350b6b545fcc12e12c12e95f5b938b141f5bc9e7cdcfb0e2a26099056bd8d57    106080  docs/evidencias-performance-continuacao-2026-10-13/mobile-terms.png
?       26c6a3654ff4561e38824efe9e32d0c21d0ad51a87b1ef396d8de8073597bceb      2128  docs/evidencias-performance-continuacao-2026-10-13/resultado.json
?       3fc9bf129c49b92d8dd2a1cf7e8a1858a0bf3d2aea82419e15d562f208b4869e      2742  docs/evidencias-performance-continuacao-2026-10-13/smoke.cjs
?       4ddaf6a5f7f5aa604c8fe2947ea568fdc4686471147e47fe1605c24ee1896319      8523  docs/evidencias-performance-continuacao-2026-10-13/validacao-cookies.cjs
```

</details>

<details>
<summary>docs/evidencias-seguranca-imagens-2026-10-14 — manifesto completo</summary>

```text
estado  SHA-256                                                           bytes  caminho
?       cca32d883f18ecf0b5504c654a65b027b0fe1a89515e6cbe96675b3090aa2ef4      2279  docs/evidencias-seguranca-imagens-2026-10-14/build.log
?       e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855         0  docs/evidencias-seguranca-imagens-2026-10-14/diff-check.log
?       b99c2252da97790f0535b42f6dfaac7bc584dbbfef1490444e2c64d2979abd97        40  docs/evidencias-seguranca-imagens-2026-10-14/lint.log
?       53e07885f3de573ffdaef4efe10ad40b8658a6d89cc715032acb2305535cd34e      4870  docs/evidencias-seguranca-imagens-2026-10-14/playwright.log
?       028443f3db8c6f68889b26a0ce2f613d8fc7759b4c19e6c9b003b6890c39b1d9       974  docs/evidencias-seguranca-imagens-2026-10-14/resultado.json
?       b4e209dbd81a21d6f82a34730ba0fe9239e1afe7378e20636aa13b1be2e0a83a      6008  docs/evidencias-seguranca-imagens-2026-10-14/sql-http.log
?       afee2c2910ef9248421973c8d52197aecba4c9dfddeaa39d59f01c9681593073      2621  docs/evidencias-seguranca-imagens-2026-10-14/status-inicial.txt
?       295143b8f8413f224a2a27a9d056d98eaeba7ba31d18bd108bcbff4cbc2e3b57        51  docs/evidencias-seguranca-imagens-2026-10-14/typecheck.log
?       d8e48cc3d7898c9f8a8599c01a5fcff175df10da2efbfb71e79f15cd14c3c8c1      5158  docs/evidencias-seguranca-imagens-2026-10-14/unit.log
```

</details>

### 11.3 Caminhos de entregas commitadas e histórico

Estes caminhos vêm de `git show --name-status`; podem estar em mais de uma entrega. Os trabalhos equivalentes já incorporados à main continuam registrados para rastreabilidade.

<details>
<summary>Login/SEO já integrado</summary>

```text
67147f7e4d12457b3bdbbc86a75b22809dbb4c3d feat: refine Google sign-in and auth SEO

A	src/app/(auth)/layout.tsx
M	src/app/sitemap.ts
M	src/components/auth/auth-shell.tsx
M	src/components/auth/google-signin-button.tsx

```

</details>

<details>
<summary>Catálogo já integrado</summary>

```text
0992552b184bca8b6be1aed4a496463da312ef17 feat: add project modifications catalog

M	playwright.config.ts
D	public/demo-projects/gol-01.webp
D	public/demo-projects/gol-02.webp
D	public/demo-projects/gol-03.webp
D	public/demo-projects/subaru-01.webp
D	public/demo-projects/subaru-02.webp
D	public/demo-projects/subaru-03.webp
D	public/demo-projects/uno-01.webp
D	public/demo-projects/uno-02.webp
D	public/demo-projects/uno-03.webp
A	public/modifications/audio/alto-falantes.webp
A	public/modifications/audio/amplificador.webp
A	public/modifications/audio/multimidia.webp
A	public/modifications/audio/subwoofer.webp
A	public/modifications/brakes/discos.webp
A	public/modifications/brakes/kit-freio.webp
A	public/modifications/brakes/mangueiras.webp
A	public/modifications/brakes/pastilhas.webp
A	public/modifications/brakes/pincas.webp
A	public/modifications/electrical/chicote.webp
A	public/modifications/electrical/fusiveis.webp
A	public/modifications/electrical/instrumentacao-eletrica.webp
A	public/modifications/electrical/reles.webp
A	public/modifications/electrical/sensores.webp
A	public/modifications/electrical/sistema-eletrico-customizado.webp
A	public/modifications/electrical/wideband.webp
A	public/modifications/engine/bicos-injetores.webp
A	public/modifications/engine/bobinas.webp
A	public/modifications/engine/bomba-combustivel.webp
A	public/modifications/engine/cabecote.webp
A	public/modifications/engine/coletor-admissao.webp
A	public/modifications/engine/coletor-escape.webp
A	public/modifications/engine/comando.webp
A	public/modifications/engine/downpipe.webp
A	public/modifications/engine/ecu-modulo.webp
A	public/modifications/engine/escape.webp
A	public/modifications/engine/intake-filtro-esportivo.webp
A	public/modifications/engine/intercooler.webp
A	public/modifications/engine/motor.webp
A	public/modifications/engine/pistoes-bielas.webp
A	public/modifications/engine/radiador.webp
A	public/modifications/engine/regulador-pressao.webp
A	public/modifications/engine/supercharger.webp
A	public/modifications/engine/turbo.webp
A	public/modifications/engine/velas.webp
A	public/modifications/exterior/aerofolio.webp
A	public/modifications/exterior/body-kit.webp
A	public/modifications/exterior/capo.webp
A	public/modifications/exterior/difusor.webp
A	public/modifications/exterior/front-lip.webp
A	public/modifications/exterior/para-choque.webp
A	public/modifications/exterior/side-skirts.webp
A	public/modifications/exterior/spoiler.webp
A	public/modifications/interior/banco-concha.webp
A	public/modifications/interior/banco-esportivo.webp
A	public/modifications/interior/cintos.webp
A	public/modifications/interior/instrumentacao-interior.webp
A	public/modifications/interior/manopla.webp
A	public/modifications/interior/painel-digital.webp
A	public/modifications/interior/pedaleiras.webp
A	public/modifications/interior/roll-cage.webp
A	public/modifications/interior/volante.webp
A	public/modifications/lighting/drl.webp
A	public/modifications/lighting/farois-auxiliares.webp
A	public/modifications/lighting/farois.webp
A	public/modifications/lighting/lanternas.webp
A	public/modifications/suspension/amortecedores.webp
A	public/modifications/suspension/barra-estabilizadora.webp
A	public/modifications/suspension/bracos.webp
A	public/modifications/suspension/buchas.webp
A	public/modifications/suspension/camber-alinhamento.webp
A	public/modifications/suspension/coilover.webp
A	public/modifications/suspension/molas.webp
A	public/modifications/suspension/suspensao-fixa.webp
A	public/modifications/suspension/suspensao-rosca.webp
A	public/modifications/transmission/alavanca.webp
A	public/modifications/transmission/cambio.webp
A	public/modifications/transmission/diferencial.webp
A	public/modifications/transmission/embreagem.webp
A	public/modifications/transmission/relacoes-marcha.webp
A	public/modifications/transmission/short-shifter.webp
A	public/modifications/wheels/adaptadores.webp
A	public/modifications/wheels/espacadores.webp
A	public/modifications/wheels/pneus.webp
A	public/modifications/wheels/rodas.webp
A	scripts/extract-modification-assets.py
M	src/app/api/projects/search-suggestions/route.ts
M	src/app/api/uploads/image/route.ts
M	src/app/garagem/page.tsx
A	src/app/projeto/[slug]/modificacoes/actions.ts
A	src/app/projeto/[slug]/modificacoes/page.tsx
M	src/components/projects/local-garage-panel.tsx
M	src/components/projects/local-project-resolver.tsx
M	src/components/projects/project-card.tsx
M	src/components/projects/project-detail.tsx
M	src/components/projects/project-discovery-page.tsx
M	src/components/projects/project-form.tsx
A	src/components/projects/project-modifications.tsx
M	src/components/projects/project-rankings-board.tsx
A	src/lib/modifications/catalog-assets.ts
A	src/lib/modifications/server.ts
A	src/lib/modifications/types.ts
D	src/lib/projects/demo-projects.ts
M	src/lib/projects/server.ts
M	src/lib/projects/types.ts
M	src/lib/projects/utils.ts
M	src/lib/supabase/storage.ts
M	src/lib/types.ts
A	supabase/migrations/20260929120000_add_modification_catalog.sql
M	supabase/schema.sql
M	tests/e2e/catalog-and-dates.spec.ts
M	tests/e2e/project-data.spec.ts
D	tests/e2e/project-hydration.spec.ts
A	tests/e2e/project-modifications.spec.ts
M	tests/e2e/public.spec.ts

```

</details>

<details>
<summary>Favicon final equivalente ao squash da main</summary>

```text
0f80ecc3be8ad0f43150283b8c95cd45109544a1 feat: improve transparent favicon contrast

A	docs/favicon/background-tests.png
A	docs/favicon/comparison.png
A	docs/favicon/original.png
A	scripts/generate-favicons.py
M	src/app/apple-icon.png
M	src/app/favicon.ico
M	src/app/icon.png
M	src/app/icon1.png
M	src/app/icon2.png
A	src/app/icon3.png
A	src/app/icon4.png

```

</details>

<details>
<summary>Editor pendente, em ordem</summary>

```text
9395207c50ca9232b8c6570afbeaff5d404601fb feat: rebuild profile image crop editor

M	playwright.config.ts
M	src/app/globals.css
A	src/app/test-harness/profile-image-editor/page.tsx
A	src/app/test-harness/profile-image-editor/profile-image-editor-harness.tsx
M	src/components/garage/profile-image-crop-dialog.tsx
A	src/lib/profile/image-crop.ts
A	tests/e2e/profile-image-editor.spec.ts

45da12b79891a244678abf54c66d7e2bd9205b0a test: validate profile crop interactions and document evidence

A	docs/profile-image-editor-qa.md
A	docs/screenshots/profile-editor-avatar-after.png
A	docs/screenshots/profile-editor-avatar-before.png
A	docs/screenshots/profile-editor-avatar-mobile-pinch.png
A	docs/screenshots/profile-editor-cover-after.png
A	docs/screenshots/profile-editor-cover-before.png
A	docs/screenshots/profile-editor-cover-mobile-pinch.png
M	src/app/test-harness/profile-image-editor/profile-image-editor-harness.tsx
M	src/components/garage/profile-form.tsx
M	src/components/garage/profile-image-crop-dialog.tsx
M	tests/e2e/profile-image-editor.spec.ts

```

</details>

<details>
<summary>Skeletons equivalentes à entrega integrada</summary>

```text
f865a4662a87cc70ead72e2395a65caca59e8cd0 Rebuild responsive page skeletons and add visual audit

A	docs/skeleton-audit/README.md
A	docs/skeleton-audit/comparisons/atualizacoes-1024-comparison.png
A	docs/skeleton-audit/comparisons/atualizacoes-1440-comparison.png
A	docs/skeleton-audit/comparisons/atualizacoes-1920-comparison.png
A	docs/skeleton-audit/comparisons/atualizacoes-360-comparison.png
A	docs/skeleton-audit/comparisons/atualizacoes-390-comparison.png
A	docs/skeleton-audit/comparisons/atualizacoes-768-comparison.png
A	docs/skeleton-audit/comparisons/comparar-1024-comparison.png
A	docs/skeleton-audit/comparisons/comparar-1440-comparison.png
A	docs/skeleton-audit/comparisons/comparar-1920-comparison.png
A	docs/skeleton-audit/comparisons/comparar-360-comparison.png
A	docs/skeleton-audit/comparisons/comparar-390-comparison.png
A	docs/skeleton-audit/comparisons/comparar-768-comparison.png
A	docs/skeleton-audit/comparisons/criar-projeto-1024-comparison.png
A	docs/skeleton-audit/comparisons/criar-projeto-1440-comparison.png
A	docs/skeleton-audit/comparisons/criar-projeto-1920-comparison.png
A	docs/skeleton-audit/comparisons/criar-projeto-360-comparison.png
A	docs/skeleton-audit/comparisons/criar-projeto-390-comparison.png
A	docs/skeleton-audit/comparisons/criar-projeto-768-comparison.png
A	docs/skeleton-audit/comparisons/explorar-1024-comparison.png
A	docs/skeleton-audit/comparisons/explorar-1440-comparison.png
A	docs/skeleton-audit/comparisons/explorar-1920-comparison.png
A	docs/skeleton-audit/comparisons/explorar-360-comparison.png
A	docs/skeleton-audit/comparisons/explorar-390-comparison.png
A	docs/skeleton-audit/comparisons/explorar-768-comparison.png
A	docs/skeleton-audit/comparisons/formulario-perfil-1024-comparison.png
A	docs/skeleton-audit/comparisons/formulario-perfil-1440-comparison.png
A	docs/skeleton-audit/comparisons/formulario-perfil-1920-comparison.png
A	docs/skeleton-audit/comparisons/formulario-perfil-360-comparison.png
A	docs/skeleton-audit/comparisons/formulario-perfil-390-comparison.png
A	docs/skeleton-audit/comparisons/formulario-perfil-768-comparison.png
A	docs/skeleton-audit/comparisons/garagem-1024-comparison.png
A	docs/skeleton-audit/comparisons/garagem-1440-comparison.png
A	docs/skeleton-audit/comparisons/garagem-1920-comparison.png
A	docs/skeleton-audit/comparisons/garagem-360-comparison.png
A	docs/skeleton-audit/comparisons/garagem-390-comparison.png
A	docs/skeleton-audit/comparisons/garagem-768-comparison.png
A	docs/skeleton-audit/comparisons/notificacoes-1024-comparison.png
A	docs/skeleton-audit/comparisons/notificacoes-1440-comparison.png
A	docs/skeleton-audit/comparisons/notificacoes-1920-comparison.png
A	docs/skeleton-audit/comparisons/notificacoes-360-comparison.png
A	docs/skeleton-audit/comparisons/notificacoes-390-comparison.png
A	docs/skeleton-audit/comparisons/notificacoes-768-comparison.png
A	docs/skeleton-audit/comparisons/rankings-1024-comparison.png
A	docs/skeleton-audit/comparisons/rankings-1440-comparison.png
A	docs/skeleton-audit/comparisons/rankings-1920-comparison.png
A	docs/skeleton-audit/comparisons/rankings-360-comparison.png
A	docs/skeleton-audit/comparisons/rankings-390-comparison.png
A	docs/skeleton-audit/comparisons/rankings-768-comparison.png
A	docs/skeleton-audit/screenshots/atualizacoes-1024-real.png
A	docs/skeleton-audit/screenshots/atualizacoes-1024-skeleton.png
A	docs/skeleton-audit/screenshots/atualizacoes-1440-real.png
A	docs/skeleton-audit/screenshots/atualizacoes-1440-skeleton.png
A	docs/skeleton-audit/screenshots/atualizacoes-1920-real.png
A	docs/skeleton-audit/screenshots/atualizacoes-1920-skeleton.png
A	docs/skeleton-audit/screenshots/atualizacoes-360-real.png
A	docs/skeleton-audit/screenshots/atualizacoes-360-skeleton.png
A	docs/skeleton-audit/screenshots/atualizacoes-390-real.png
A	docs/skeleton-audit/screenshots/atualizacoes-390-skeleton.png
A	docs/skeleton-audit/screenshots/atualizacoes-768-real.png
A	docs/skeleton-audit/screenshots/atualizacoes-768-skeleton.png
A	docs/skeleton-audit/screenshots/comparar-1024-real.png
A	docs/skeleton-audit/screenshots/comparar-1024-skeleton.png
A	docs/skeleton-audit/screenshots/comparar-1440-real.png
A	docs/skeleton-audit/screenshots/comparar-1440-skeleton.png
A	docs/skeleton-audit/screenshots/comparar-1920-real.png
A	docs/skeleton-audit/screenshots/comparar-1920-skeleton.png
A	docs/skeleton-audit/screenshots/comparar-360-real.png
A	docs/skeleton-audit/screenshots/comparar-360-skeleton.png
A	docs/skeleton-audit/screenshots/comparar-390-real.png
A	docs/skeleton-audit/screenshots/comparar-390-skeleton.png
A	docs/skeleton-audit/screenshots/comparar-768-real.png
A	docs/skeleton-audit/screenshots/comparar-768-skeleton.png
A	docs/skeleton-audit/screenshots/criar-projeto-1024-real.png
A	docs/skeleton-audit/screenshots/criar-projeto-1024-skeleton.png
A	docs/skeleton-audit/screenshots/criar-projeto-1440-real.png
A	docs/skeleton-audit/screenshots/criar-projeto-1440-skeleton.png
A	docs/skeleton-audit/screenshots/criar-projeto-1920-real.png
A	docs/skeleton-audit/screenshots/criar-projeto-1920-skeleton.png
A	docs/skeleton-audit/screenshots/criar-projeto-360-real.png
A	docs/skeleton-audit/screenshots/criar-projeto-360-skeleton.png
A	docs/skeleton-audit/screenshots/criar-projeto-390-real.png
A	docs/skeleton-audit/screenshots/criar-projeto-390-skeleton.png
A	docs/skeleton-audit/screenshots/criar-projeto-768-real.png
A	docs/skeleton-audit/screenshots/criar-projeto-768-skeleton.png
A	docs/skeleton-audit/screenshots/explorar-1024-real.png
A	docs/skeleton-audit/screenshots/explorar-1024-skeleton.png
A	docs/skeleton-audit/screenshots/explorar-1440-real.png
A	docs/skeleton-audit/screenshots/explorar-1440-skeleton.png
A	docs/skeleton-audit/screenshots/explorar-1920-real.png
A	docs/skeleton-audit/screenshots/explorar-1920-skeleton.png
A	docs/skeleton-audit/screenshots/explorar-360-real.png
A	docs/skeleton-audit/screenshots/explorar-360-skeleton.png
A	docs/skeleton-audit/screenshots/explorar-390-real.png
A	docs/skeleton-audit/screenshots/explorar-390-skeleton.png
A	docs/skeleton-audit/screenshots/explorar-768-real.png
A	docs/skeleton-audit/screenshots/explorar-768-skeleton.png
A	docs/skeleton-audit/screenshots/formulario-perfil-1024-real.png
A	docs/skeleton-audit/screenshots/formulario-perfil-1024-skeleton.png
A	docs/skeleton-audit/screenshots/formulario-perfil-1440-real.png
A	docs/skeleton-audit/screenshots/formulario-perfil-1440-skeleton.png
A	docs/skeleton-audit/screenshots/formulario-perfil-1920-real.png
A	docs/skeleton-audit/screenshots/formulario-perfil-1920-skeleton.png
A	docs/skeleton-audit/screenshots/formulario-perfil-360-real.png
A	docs/skeleton-audit/screenshots/formulario-perfil-360-skeleton.png
A	docs/skeleton-audit/screenshots/formulario-perfil-390-real.png
A	docs/skeleton-audit/screenshots/formulario-perfil-390-skeleton.png
A	docs/skeleton-audit/screenshots/formulario-perfil-768-real.png
A	docs/skeleton-audit/screenshots/formulario-perfil-768-skeleton.png
A	docs/skeleton-audit/screenshots/garagem-1024-real.png
A	docs/skeleton-audit/screenshots/garagem-1024-skeleton.png
A	docs/skeleton-audit/screenshots/garagem-1440-real.png
A	docs/skeleton-audit/screenshots/garagem-1440-skeleton.png
A	docs/skeleton-audit/screenshots/garagem-1920-real.png
A	docs/skeleton-audit/screenshots/garagem-1920-skeleton.png
A	docs/skeleton-audit/screenshots/garagem-360-real.png
A	docs/skeleton-audit/screenshots/garagem-360-skeleton.png
A	docs/skeleton-audit/screenshots/garagem-390-real.png
A	docs/skeleton-audit/screenshots/garagem-390-skeleton.png
A	docs/skeleton-audit/screenshots/garagem-768-real.png
A	docs/skeleton-audit/screenshots/garagem-768-skeleton.png
A	docs/skeleton-audit/screenshots/notificacoes-1024-real.png
A	docs/skeleton-audit/screenshots/notificacoes-1024-skeleton.png
A	docs/skeleton-audit/screenshots/notificacoes-1440-real.png
A	docs/skeleton-audit/screenshots/notificacoes-1440-skeleton.png
A	docs/skeleton-audit/screenshots/notificacoes-1920-real.png
A	docs/skeleton-audit/screenshots/notificacoes-1920-skeleton.png
A	docs/skeleton-audit/screenshots/notificacoes-360-real.png
A	docs/skeleton-audit/screenshots/notificacoes-360-skeleton.png
A	docs/skeleton-audit/screenshots/notificacoes-390-real.png
A	docs/skeleton-audit/screenshots/notificacoes-390-skeleton.png
A	docs/skeleton-audit/screenshots/notificacoes-768-real.png
A	docs/skeleton-audit/screenshots/notificacoes-768-skeleton.png
A	docs/skeleton-audit/screenshots/rankings-1024-real.png
A	docs/skeleton-audit/screenshots/rankings-1024-skeleton.png
A	docs/skeleton-audit/screenshots/rankings-1440-real.png
A	docs/skeleton-audit/screenshots/rankings-1440-skeleton.png
A	docs/skeleton-audit/screenshots/rankings-1920-real.png
A	docs/skeleton-audit/screenshots/rankings-1920-skeleton.png
A	docs/skeleton-audit/screenshots/rankings-360-real.png
A	docs/skeleton-audit/screenshots/rankings-360-skeleton.png
A	docs/skeleton-audit/screenshots/rankings-390-real.png
A	docs/skeleton-audit/screenshots/rankings-390-skeleton.png
A	docs/skeleton-audit/screenshots/rankings-768-real.png
A	docs/skeleton-audit/screenshots/rankings-768-skeleton.png
A	scripts/generate-skeleton-comparisons.mjs
M	src/app/atualizacoes/loading.tsx
M	src/app/comparar/loading.tsx
M	src/app/criar-projeto/loading.tsx
A	src/app/dev-skeletons/[name]/page.tsx
M	src/app/explorar/loading.tsx
M	src/app/garagem/loading.tsx
M	src/app/globals.css
D	src/app/loading.tsx
M	src/app/notificacoes/loading.tsx
M	src/app/onboarding/loading.tsx
M	src/app/perfil/loading.tsx
M	src/app/projeto/[slug]/editar/loading.tsx
M	src/app/projeto/[slug]/evolucao/loading.tsx
A	src/app/projeto/[slug]/modificacoes/loading.tsx
M	src/app/rankings/loading.tsx
M	src/components/ui/page-skeletons.tsx
M	src/components/ui/skeleton.tsx
A	tests/e2e/skeleton-dynamic.spec.ts
A	tests/e2e/skeleton-visual.spec.ts

```

</details>

<details>
<summary>Experimentos de favicon preservados</summary>

```text
d18adcb12c230d272dab582efa35dd8f6946c8db chore: improve favicon contrast

A	docs/favicon/background-tests.png
A	docs/favicon/comparison.png
A	docs/favicon/original.png
A	scripts/generate-favicons.py
M	src/app/apple-icon.png
M	src/app/favicon.ico
M	src/app/icon.png
M	src/app/icon1.png
M	src/app/icon2.png
A	src/app/icon3.png
A	src/app/icon4.png

f375fed72be009699f7a80f952dd9b76102e23e1 chore: strengthen favicon outline

M	docs/favicon/background-tests.png
M	docs/favicon/comparison.png
M	scripts/generate-favicons.py
M	src/app/apple-icon.png
M	src/app/favicon.ico
M	src/app/icon.png
M	src/app/icon1.png
M	src/app/icon2.png
M	src/app/icon3.png
M	src/app/icon4.png

2b02cb54ad5aa4fa2ec74a6303baa36857f43bbf feat: introduce premium favicon concept

M	docs/favicon/background-tests.png
M	docs/favicon/comparison.png
A	docs/favicon/variants/impactante.png
A	docs/favicon/variants/minimalista.png
A	docs/favicon/variants/premium.png
M	scripts/generate-favicons.py
M	src/app/apple-icon.png
M	src/app/favicon.ico
M	src/app/icon.png
M	src/app/icon1.png
M	src/app/icon2.png
M	src/app/icon3.png
M	src/app/icon4.png

8f6b3806e4c40b9edcd0764a29215b98662e7d2f chore: select premium favicon variant

M	docs/favicon/comparison.png
M	scripts/generate-favicons.py
M	src/app/apple-icon.png
M	src/app/favicon.ico
M	src/app/icon.png
M	src/app/icon1.png
M	src/app/icon2.png
M	src/app/icon3.png
M	src/app/icon4.png

79ba39fdc8de4779d41c5f189a9a9b9655e2a2ec chore: refine premium favicon rendering

M	docs/favicon/background-tests.png
M	docs/favicon/comparison.png
M	docs/favicon/variants/impactante.png
M	docs/favicon/variants/minimalista.png
M	docs/favicon/variants/premium.png
M	scripts/generate-favicons.py
M	src/app/apple-icon.png
M	src/app/favicon.ico
M	src/app/icon.png
M	src/app/icon1.png
M	src/app/icon2.png
M	src/app/icon3.png
M	src/app/icon4.png

d8e9a74bfdb9af947d6d7f39750e7960db2d261d chore: rebalance premium favicon mark

M	docs/favicon/background-tests.png
M	docs/favicon/comparison.png
M	docs/favicon/variants/impactante.png
M	docs/favicon/variants/premium.png
M	scripts/generate-favicons.py
M	src/app/apple-icon.png
M	src/app/favicon.ico
M	src/app/icon.png
M	src/app/icon1.png
M	src/app/icon2.png
M	src/app/icon3.png
M	src/app/icon4.png

```

</details>

<details>
<summary>CI legado, somente ref remota</summary>

```text
518f142a2f6029730a164dbc2600d76a855d1921 fix: update vulnerable Next.js dependencies

M	package-lock.json
M	package.json

ca5308dbce1a6fa3c21a807e1f48126ac3e67d3a ci: stabilize Playwright workflow

M	.github/workflows/ci.yml
M	tests/e2e/public.spec.ts

```

</details>

### 11.4 Stashes — caminhos preservados

<details>
<summary>stash@{0} — 75e003b6c95415fb3b643ad511233102319b3877 On main: sync-snapshot-2026-09-27-preserve-local-work</summary>

```text
M	next.config.ts
M	playwright.config.ts
M	src/app/carros/actions.ts
M	src/components/garage/comments.tsx
M	src/components/projects/project-detail.tsx
M	src/components/projects/project-filters.tsx
M	src/components/projects/project-social-actions.tsx
M	src/components/site/site-footer.tsx
M	src/lib/garage/create-car-project.ts
M	src/lib/projects/demo-projects.ts
M	src/lib/projects/mappers.ts
M	src/lib/projects/server.ts
M	src/lib/projects/utils.ts
M	src/lib/supabase/env.ts
M	src/lib/supabase/server.ts
M	src/lib/types.ts
Arquivos não rastreados guardados no stash:
src/app/privacy/page.tsx
src/app/terms/page.tsx
supabase/migrations/20260915090000_atomic_project_mutation.sql
supabase/migrations/20260915100000_protect_project_views.sql
tests/e2e/project-data.spec.ts
tests/e2e/project-hydration.spec.ts
```

</details>

<details>
<summary>stash@{1} — b2890c68a30af3531d1d22f4eca3109bb53e71b0 On main: autostash</summary>

```text
M	AGENTS.md
M	next.config.ts
M	package-lock.json
M	package.json
M	playwright.config.ts
M	src/app/carros/actions.ts
M	src/components/garage/comments.tsx
M	src/components/projects/project-detail.tsx
M	src/components/projects/project-filters.tsx
M	src/components/projects/project-social-actions.tsx
M	src/lib/garage/create-car-project.ts
M	src/lib/projects/demo-projects.ts
M	src/lib/projects/mappers.ts
M	src/lib/projects/server.ts
M	src/lib/projects/types.ts
M	src/lib/projects/utils.ts
M	src/lib/supabase/env.ts
M	src/lib/supabase/server.ts
M	src/lib/types.ts
```

</details>

### 11.5 Refs verificadas

```text
refs/heads/codex/favicon-contrast-outline d8e9a74bfdb9af947d6d7f39750e7960db2d261d
refs/heads/codex/final-transparent-favicon 0f80ecc3be8ad0f43150283b8c95cd45109544a1
refs/heads/codex/integrate-three-deliveries ccccf5f1b1b54e26c2bd72530d519d945a2e089d
refs/heads/codex/login-seo 0992552b184bca8b6be1aed4a496463da312ef17
refs/heads/codex/performance-etapa-1 45da12b79891a244678abf54c66d7e2bd9205b0a
refs/heads/codex/profile-image-editor 45da12b79891a244678abf54c66d7e2bd9205b0a
refs/heads/codex/rebuild-skeletons f865a4662a87cc70ead72e2395a65caca59e8cd0
refs/heads/main a736c95d8276f9b73a42dde0b7f0c79662745f6e
refs/remotes/origin/HEAD 8841a3acce71a1ce02aec99131423116d174e3d3
refs/remotes/origin/ci/stabilize-playwright ca5308dbce1a6fa3c21a807e1f48126ac3e67d3a
refs/remotes/origin/codex/favicon-contrast-outline d8e9a74bfdb9af947d6d7f39750e7960db2d261d
refs/remotes/origin/codex/final-transparent-favicon 0f80ecc3be8ad0f43150283b8c95cd45109544a1
refs/remotes/origin/codex/fix-garage-inspiration-selection 908542b92e08e02a50a8646e499d54aa9531c3dc
refs/remotes/origin/codex/integrate-three-deliveries ccccf5f1b1b54e26c2bd72530d519d945a2e089d
refs/remotes/origin/codex/login-seo 0992552b184bca8b6be1aed4a496463da312ef17
refs/remotes/origin/codex/qa-final-performance c0eb8242f2319e1bcb44ea397e109cf4da4d0489
refs/remotes/origin/main 8841a3acce71a1ce02aec99131423116d174e3d3
refs/stash 75e003b6c95415fb3b643ad511233102319b3877
```

### 11.6 Integridade ao encerrar

Os hashes e estados de todos os 718 caminhos pendentes das duas fontes foram reconferidos após a criação deste documento. Não houve perda ou alteração de bytes, refs, index ou stashes. O único novo caminho da tarefa é `docs/plano-integracao-final-projeto-garagem.md`. Arquivos ignorados privados não tiveram conteúdo inspecionado; as operações da tarefa não os escreveram.
