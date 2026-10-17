# Finalização do backend, privacidade e Supabase

Solicitação de 13/10/2026; validação concluída em 14/10/2026, fuso America/Bahia.

## 1. Resultado e ambiente preservado

**O backend principal funciona, mas a preparação para lançamento ainda não está concluída.** As correções de privacidade estão implementadas localmente e testadas em PostgreSQL isolado. Não foram aplicadas ao Supabase compartilhado. Fotos em projetos privados continuam sendo um bloqueio: o bucket atual é público e uma URL de imagem descartável respondeu HTTP 200 sem autenticação.

- Worktree confirmada: `/home/gustavo/Área de trabalho/ProjetoGaragem-performance-etapa-1`.
- Branch: `codex/performance-etapa-1`; HEAD inicial `45da12b79891a244678abf54c66d7e2bd9205b0a`.
- O checkout inicial da conversa era outra worktree. Ele foi consultado para ler o diagnóstico de permissões, sem edições.
- Havia alterações locais de etapas anteriores, inclusive arquivos não rastreados. Foram preservadas; o diff acumulado não deve ser atribuído integralmente a esta execução.
- Não houve commit, push, merge, deploy, build remoto, reset, exclusão global, alteração de provedor OAuth ou contratação de serviço.
- Todos os builds foram locais. Os flags dos dois test harnesses foram usados somente no build local de validação.

Foram lidos os cinco relatórios solicitados, o diagnóstico de permissões e as migrations relevantes. Também foram consultadas as instruções locais do Next 16.3.3 para Route Handlers, mutações, Proxy e invalidação de cache.

## 2. Estado remoto observado nesta execução

Project Ref fixado e verificado nas requisições: **`hxqhudfzdwfxnjzmphya`**. A chave pública foi obtida do bundle servido pelo domínio oficial; a chave secreta local foi usada somente para inventário, preparação/remoção das próprias contas descartáveis e operações de Storage. Nenhuma credencial consta nas evidências.

| Verificação | Resultado observado |
| --- | --- |
| Auth antes e após cada ciclo completo | 10 contas originais, preservadas |
| Storage antes e após cada ciclo completo | 2 objetos originais; inventário de caminhos idêntico |
| SELECT administrativo nas cinco tabelas do diagnóstico | HTTP 403 / `42501`, sem novos GRANTs |
| SELECT anônimo direto em `project_modifications` | HTTP 401 / `42501` |
| SELECT anônimo em `car_build_updates` e `public_profiles`, com limite zero | HTTP 200 |
| Caminho de foto de B gravado por A numa modificação de A | Rejeitado com `42501` |
| Google OAuth, início do fluxo | HTTP 302 para `accounts.google.com` |
| Download anônimo de imagem fictícia criada nesta rodada | HTTP 200: confirma o bloqueio de mídia privada |

O Dashboard não tinha sessão disponível no navegador desta conversa. Não foi possível repetir a consulta SQL administrativa de todas as policies, definições e do histórico remoto. O arquivo de preflight foi preparado para essa conferência. A correspondência anterior de 37 migrations e a aplicação manual dos dois `ALTER POLICY` são evidências do relatório anterior; não foram tratadas como uma nova leitura SQL nesta rodada.

## 3. Problemas confirmados e correções locais

1. **401 público de modificações:** a policy de leitura pública não substitui um GRANT. Conceder SELECT da tabela inteira permitiria ler notas e custos. A solução usa uma RPC pública de projeção fixa e mantém a tabela completa restrita ao proprietário.
2. **Mistura de descrição e anotação:** `note` foi mantida privada. Foi acrescentada `public_description`, inicialmente vazia. Nenhuma nota antiga é copiada para um campo público.
3. **Custo sem consentimento individual:** `show_paid_amount` nasce `false`; a RPC só retorna `paid_amount` quando esse campo é explicitamente verdadeiro. Editar o custo mantém a escolha de visibilidade.
4. **Outros caminhos de gasto:** eventos tinham `amount_spent` na leitura pública; gastos tinham `note` na mesma linha do valor compartilhado. Foram preparadas projeções públicas também para esses caminhos. O valor de eventos fica restrito ao proprietário; um gasto pode ser divulgado pelos controles próprios de gastos, com a nota sempre privada.
5. **Padrões públicos de gastos:** novos projetos e novos gastos passam a ter custos privados. A RPC transacional também foi corrigida para a omissão de flags resultar em privacidade. Escolhas existentes não são reescritas.
6. **Cidade antiga após salvar:** a página principal usa um cabeçalho obtido de cache público. `revalidateTag(..., "max")` permitia servir o valor antigo no primeiro acesso após editar. Criação/edição agora expiram os dados imediatamente; exclusão usa `updateTag`. As chaves de cache dos detalhes públicos foram versionadas para não reutilizar respostas anteriores com campos privados.
7. **Redirecionamento local em produção:** o Proxy mandava requisições internas não autenticadas ao domínio canônico, causando CORS no teste Mobile. O redirecionamento de acesso agora usa a origem da própria requisição. Canonical SEO e configuração do Google não foram substituídos por localhost.
8. **Temporários antigos:** a limpeza automática por visita, baseada somente em 24 horas, foi retirada. Ela não identificava editores ativos em outra aba. O substituto preparado usa leases e um executor independente do retorno do usuário.
9. **Suíte autenticada:** o helper passou a tratar o banner de cookies; a busca da cidade foi limitada ao cabeçalho do projeto; o planejador é reaberto após recarga; a referência de inspiração é criada pela própria suíte, sem depender de projetos reais preexistentes.

## 4. SQL e histórico de migrations

**Nenhum SQL remoto foi executado nesta rodada.** Nenhuma versão foi marcada artificialmente como aplicada.

| Migration | Estado e finalidade |
| --- | --- |
| `20261013010000_restrict_modification_photo_ownership.sql` | Já existia localmente. Representa a correção manual anterior. O teste HTTP atual confirmou a rejeição de pasta alheia, mas o registro no histórico remoto ainda precisa ser reconciliado após preflight. |
| `20261013020000_private_modifications_public_projection.sql` | Nova. Campos de privacidade, defaults privados, leitura direta por proprietário e três RPCs públicas de projeção fixa. |
| `20261013025000_private_expense_defaults_atomic.sql` | Nova. Substituição incremental da RPC transacional; somente dois defaults de visibilidade mudam. Um hash do corpo anterior impede substituir silenciosamente uma função remota divergente. |
| `20261013030000_pending_modification_photo_leases.sql` | Nova. Leases, inspeção limitada, reivindicação exclusiva do temporário e poda de metadados expirados. |

Os novos SQLs foram aplicados e reaplicados no banco isolado, sem reset entre as reaplicações. Também foi testada a contenção restritiva de regressões.

Antes de aplicar remotamente, executar e guardar os resultados de [`sql/preflight-backend-2026-10-13.sql`](sql/preflight-backend-2026-10-13.sql). Conferir o ref no Dashboard, os efeitos da migration 100 e o corpo atual da RPC transacional. Não reexecutar o conjunto histórico nem usar `migration repair` como substituto dessa verificação.

As migrations novas mudam o contrato de leitura e concedem EXECUTE a funções privilegiadas de escopo limitado. **Exigem aprovação específica e aplicação coordenada com o código compatível.** Aplicá-las isoladamente deixaria a versão publicada sem algumas leituras públicas. Essa operação foi retida conforme as seções 6 e 13 da solicitação.

Foi preparado [`sql/contencao-backend-2026-10-13.sql`](sql/contencao-backend-2026-10-13.sql): revoga as novas leituras públicas e a execução da limpeza, mantendo dados, colunas, defaults privados e acesso do proprietário. Não restaura a exposição antiga de notas e custos. Parar o executor antes de usar a contenção.

## 5. Permissões propostas e modelo de segurança

| Recurso | Anônimo / usuário não proprietário | Proprietário |
| --- | --- | --- |
| `project_modifications` diretamente | Sem SELECT anônimo; RLS impede leitura de linhas alheias por autenticados | SELECT e escritas existentes sujeitos a ownership/RLS |
| `list_public_project_modifications(uuid)` | Somente projeto público; descrição pública; custo apenas optativo; sem nota ou caminho interno de Storage | Pode usar a projeção; edição usa a tabela com sua sessão |
| `car_build_updates` diretamente | Sem SELECT anônimo; leitura autenticada restrita ao dono | Mantém acesso a `amount_spent` |
| `list_public_car_build_updates(uuid[])` | Somente projetos públicos; `amount_spent = NULL` | Dados completos pela consulta própria |
| `car_expenses` diretamente | Sem SELECT anônimo; leitura autenticada restrita ao dono | Mantém valores e notas |
| `list_public_car_expenses(uuid[])` | Exige projeto público, consentimento do projeto e do gasto; nota e identificador interno da peça são nulos | Dados completos pela consulta própria |
| Tabela de leases | Sem acesso direto de usuários comuns | Renovação apenas de caminho próprio existente via RPC |
| Inspeção/reivindicação/poda de temporários | EXECUTE somente para `service_role` | Não são funções acessíveis ao navegador |

As policies de leitura incluem guardas **restritivas**, para que uma policy permissiva legada `FOR ALL` não reabra as colunas privadas. As RPCs públicas são `SECURITY DEFINER`, com `search_path` vazio, referências totalmente qualificadas, saída fixa e predicado explícito de projeto público. EXECUTE de `PUBLIC` é revogado. Não foi criada view privilegiada nova e não foi concedido SELECT administrativo geral.

A `public_profiles` existente foi revisada no SQL versionado: é uma projeção por definidor com `security_barrier`, exclui email e nome completo e depende da seleção fixa de campos públicos. Transformá-la cegamente em `security_invoker=true` tornaria a projeção sujeita à policy de perfil próprio e quebraria a leitura pública. Sua definição/owner/ACL remotos ainda devem ser confirmados no preflight; ela não foi alterada.

O código de modificações escolhe o caminho proprietário no servidor e envia uma lista explícita de campos aos visitantes. Erros de leitura não viram mais uma lista vazia silenciosa. Não há cache compartilhado de dados completos do proprietário; consultas públicas de detalhes têm novas chaves. As respostas JSON de criação/edição continuam retornando identificação/destino, sem incluir notas ou valores completos.

As agregações de gastos e eventos continuam em lotes de IDs, com consultas separadas para dados próprios e projeções públicas; não foi introduzida uma consulta por projeto. Os limites existentes de catálogo e comentários foram preservados. O índice novo de leases corresponde à consulta real por expiração; não houve reestruturação geral nem otimização especulativa.

## 6. Limpeza de temporários preparada

A solução é um script Node sem serviço pago, preparado para execução por um agendador já disponível. **Nenhum agendamento ou exclusão periódica foi ativado.**

- O upload de modificação cria um lease após gravar o objeto. Se não conseguir registrar o lease, tenta compensar o upload e retorna erro.
- O editor renova a cada 2 minutos e ao recuperar foco/visibilidade. O prazo é de 30 minutos. O salvamento renova novamente antes de mover a foto; falha no banco ou lease já reivindicado impede mover/gravar.
- Só se consideram temporários de `pending-modifications`, com pelo menos 7 dias, lease expirado e sem referência persistida. Arquivos antigos sem lease são preservados automaticamente.
- A inspeção consulta no máximo 100 candidatos por padrão, até 500. Usa índice de expiração e o índice existente de caminho do Storage, sem listar o bucket inteiro a cada execução normal.
- Um lock transacional por caminho serializa renovação e reivindicação. Depois de uma reivindicação, o editor não pode ressuscitar esse caminho. A reivindicação precisa ser repetida após uma hora se uma tentativa de remoção falhar.
- A função privilegiada revalida propriedade, idade, lease e referências imediatamente antes de permitir a remoção. Erro do banco interrompe o processo sem novas exclusões.
- A exclusão usa a API do Storage, por caminho, e registra resultado/erro. Metadados de leases sem objeto são podados em lotes de até 500, após expiração conservadora.
- Troca, cancelamento e falha de gravação mantêm a compensação imediata já existente. Não há exclusão automática de objetos definitivos: se uma compensação falhar durante indisponibilidade do banco, o eventual órfão definitivo requer inspeção específica.

Comandos, com a chave secreta já disponível no ambiente do executor:

```bash
# Antes da migration: apenas inventário legado, nunca exclui.
SUPABASE_URL=https://hxqhudfzdwfxnjzmphya.supabase.co node scripts/inspect-pending-modification-photos.mjs --legacy-inventory

# Depois da migration: inspeção de leases e referências; sem mutação.
SUPABASE_URL=https://hxqhudfzdwfxnjzmphya.supabase.co node scripts/inspect-pending-modification-photos.mjs --limit=100

# Somente após inspeção real aprovada, com o código correspondente publicado.
SUPABASE_URL=https://hxqhudfzdwfxnjzmphya.supabase.co node scripts/inspect-pending-modification-photos.mjs --apply --confirm-ref=hxqhudfzdwfxnjzmphya --limit=100
```

A inspeção legada real encontrou zero temporários e não excluiu nada. A inspeção completa com leases, a remoção periódica e concorrência com múltiplas conexões Supabase ainda precisam de validação remota após a aplicação aprovada. No PostgreSQL isolado foram verificadas as duas ordens renovação/reivindicação, referências, objetos não rastreados, repetição, permissões e contenção. Isso não equivale a um teste de infraestrutura concorrente real.

Também foi executada a inspeção normal contra o remoto ainda sem a migration: ela encerrou com erro de função ausente, antes de qualquer exclusão. Isso confirma o bloqueio seguro nessa condição, e não uma aprovação do executor periódico remoto.

## 7. Testes e evidências

Evidências sem credenciais em [`evidencias-finalizacao-backend-2026-10-13/`](evidencias-finalizacao-backend-2026-10-13/). O script `validate-backend-real.mjs` cria somente suas próprias contas, usa sessões comuns para testar RLS e limpa seus dados num bloco `finally`. O inventário anterior e posterior é comparado; arquivos preexistentes não são selecionados para exclusão.

A rodada real final, incluindo o build local e a suíte autenticada, está registrada em [`real-85a4daaf-92d9-4cbf-8806-73cbf75f8793.json`](evidencias-finalizacao-backend-2026-10-13/real-85a4daaf-92d9-4cbf-8806-73cbf75f8793.json). Os arquivos de rodadas anteriores permanecem como histórico, incluindo a falha corrigida de automação.

| Área | Classificação | Resultado |
| --- | --- | --- |
| Login/logout, renovação, perfil próprio e isolamento A/B | **Aprovado em teste real** | Auth e REST com sessões de usuários comuns |
| Projeto privado, leitura/edição alheia, modificação privada e pasta de foto alheia | **Aprovado em teste real** | Zero linhas para terceiros; caminho alheio rejeitado com `42501` |
| Storage: B tentando remover imagem de A | **Aprovado em teste real** | Zero objetos removidos; download posterior confirmou existência |
| Suíte autenticada Desktop e cidade Desktop/Mobile | **Aprovado em teste real** | 7 testes aprovados na rodada estabilizada; inclui upload, criação, edição, interações, notificações e exclusão |
| Novas projeções públicas, custos optativos, notas privadas e leases | **Aprovado apenas em ambiente controlado** | PostgreSQL/PGlite executa os SQLs reais, com Auth e Storage representados por fixtures; não é validação HTTP no Supabase |
| Compensação de fotos, lease negado, falhas de move/gravação e validação de caminho | **Aprovado apenas em teste simulado** | 10 testes unitários |
| Google OAuth completo | **Não testado** | Início real retorna Google; autenticação interativa/callback ainda pendentes |
| Leitura pública de modificações no Supabase atual | **Reprovado / pendente de migration** | Continua HTTP 401; nenhuma permissão foi ampliada para mascarar o problema |
| Confidencialidade de fotos de projetos privados | **Reprovado** | Bucket público; imagem fictícia respondeu HTTP 200 sem sessão |
| Executor periódico aplicado no Supabase | **Não testado / não ativado** | Preparado localmente, sem agendador ativo |

As primeiras execuções de UI revelaram recargas do `next dev`, banner interceptando clique, seleção de cidade ambígua e planejador fechado após reload. Foram corrigidas as causas do teste e repetido o fluxo no build local de produção. Os monitores dos testes autenticados não registraram erros de console, hidratação ou respostas 5xx na rodada aprovada. O stderr do Next exibiu `The destination stream closed early` em navegações rápidas; a causa interna não foi isolada. Essa observação de servidor foi mantida separada do resultado do monitor do navegador.

## 8. Gates locais

- Testes unitários: **10/10**.
- SQL isolado: **39 verificações**, incluindo reaplicação das migrations e contenção.
- ESLint completo, typecheck independente, build local de produção e `git diff --check`: **aprovados**; evidências na pasta indicada.
- Playwright público e de fotos: **14/14**, em Desktop e Mobile. São 6 casos de rotas públicas e 8 de fotos com interceptação; os casos de fotos são classificados como simulação.
- O build com integração Supabase foi local; nenhuma API de build/deploy da Netlify foi chamada.

Não foi repetido Lighthouse. As mudanças anteriores de template, fronteira Server/Client do login, prefetch seletivo e catálogo sem demonstrações foram preservadas. Não se afirma um novo ganho quantitativo de LCP/TBT/INP.

Reprodução dos testes controlados: instalar `@electric-sql/pglite@0.5.10` num diretório temporário e executar `scripts/test-backend-migrations.mjs` com `PGLITE_MODULE_PATH` apontando para seu `dist/index.js`. Nenhuma dependência foi adicionada ao projeto. A rodada real é reproduzida por `node scripts/validate-backend-real.mjs --confirm-ref=hxqhudfzdwfxnjzmphya --build --playwright`; ela cria e remove suas próprias contas e usa somente build local.

## 9. Integridade, limitações e riscos restantes

Cada ciclo real finalizou com **10 contas Auth originais e 2 objetos originais**, com igualdade do inventário de Storage e preservação dos IDs Auth anteriores. Os projetos e objetos das contas criadas foram removidos antes de excluir essas contas. A conta criada no início da conversa também foi recuperada e removida individualmente; não deixou projeto ou objeto. Manifestos temporários com credenciais são removidos após limpeza confirmada.

Persistem quatro condições concretas antes de lançamento:

1. **Aplicar e testar as migrations em coordenação com código compatível.** Falta sessão SQL administrativa para conferir o snapshot atual e aprovação específica das novas RPCs/ACLs. A autorização desta rodada exclui mudanças incompatíveis com a versão publicada.
2. **Proteger mídia privada.** Um caminho aleatório não torna uma imagem privada. Não é seguro tornar o bucket compartilhado inteiro privado agora: isso quebraria URLs do site e os objetos preexistentes. A próxima mudança precisa de armazenamento privado, entrega autorizada ou URLs assinadas e migração compatível das referências. Não há uma correção apenas de RLS que proteja o endpoint público desse bucket.
3. **Validar a limpeza com leases no Supabase real antes de ativar exclusões.** Fazer inspeção, arquivos descartáveis e corrida entre salvamento/renovação/executor; manter os objetos legados sem lease fora da exclusão automática.
4. **Concluir Google OAuth interativamente.** No domínio oficial, abrir Login → Continuar com Google, autenticar com a conta do proprietário e verificar retorno a `/auth/callback`, destino interno, sessão após recarga e logout. Nenhuma credencial deve ser enviada nesta conversa.

Os GRANTs administrativos ausentes continuam sem necessidade comprovada no aplicativo. Não foram tratados como motivo para conceder acesso amplo a perfis, notas e valores. O relatório anterior não confirmou backup; esta rodada não confirmou um novo ponto de restauração.

## 10. Arquivos alterados nesta rodada

Além deste relatório e das evidências:

- Privacidade/contratos: `src/lib/types.ts`, `src/lib/modifications/server.ts`, `src/lib/supabase/queries.ts`, página e actions de modificações, `project-modifications.tsx`, `car-form.tsx` e o test harness de fotos.
- Fotos/leases: `src/app/api/uploads/image/route.ts`, `src/lib/modifications/photo-storage.ts`, `photo-path.ts`, `scripts/inspect-pending-modification-photos.mjs`, `scripts/pending-photo-cleanup-policy.mjs` e migration 300.
- Cache e redirecionamentos: `src/lib/garage/create-car-project.ts`, `src/app/carros/actions.ts`, `src/proxy.ts`.
- Validação: `playwright.config.ts`, helpers e suíte autenticada, novo `authenticated-city.spec.ts`, mocks de fotos, testes unitários, `scripts/test-backend-migrations.mjs`, `scripts/validate-backend-real.mjs`.
- SQL novo: migrations 200, 250 e 300; preflight e contenção em `docs/sql/`.

Arquivos de login, consentimento, termos, navbar, footer, descoberta e outras correções já estavam alterados antes desta rodada. Não foram descartados nem apresentados como implementações novas desta entrega.

## 11. Respostas de prontidão

1. **O backend está funcional?** Sim nos fluxos reais testados; a finalização completa depende dos bloqueios descritos.
2. **Os dados privados estão realmente protegidos?** O isolamento por proprietário passou; as novas regras de coluna passaram no banco isolado. Não se pode afirmar proteção integral no remoto enquanto migrations e mídia privada estiverem pendentes.
3. **As modificações públicas funcionam?** No SQL isolado, sim. No Supabase atual, não: a consulta antiga permanece 401 e o novo contrato ainda não foi aplicado.
4. **Fotos e armazenamento funcionam?** Upload e isolamento de escrita passaram. Confidencialidade de fotos privadas ainda não é atendida pelo bucket público.
5. **Os testes autenticados passaram?** Sim: 7/7 na rodada estabilizada, incluindo cidade em Desktop e Mobile.
6. **Há falha de segurança relevante?** Sim: acesso público por URL de Storage; o modelo remoto anterior também não oferece a nova separação de notas e custos.
7. **O que impede a integração final?** Conferência/aplicação coordenada das migrations, proteção da mídia privada e validação real do novo contrato e da limpeza.
8. **A branch está pronta para integrar às demais?** Está revisável e com correções locais testadas; **não está pronta para integração final com alegação de prontidão para lançamento**.
9. **O que validar antes do lançamento?** Matriz de privacidade via REST anônimo/A/B com as novas migrations, fotos privadas por links diretos, limpeza real concorrente e Google OAuth completo; repetir os fluxos afetados após a integração.
