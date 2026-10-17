# Diagnóstico de permissões Supabase — 13/10/2026

## Escopo e identidade

Investigação somente de leitura no Supabase Dashboard, no site publicado e nos arquivos locais. Nenhum dado, política, grant, migration, configuração ou usuário foi alterado; não houve build, deploy nem operação Git.

| Item | Verificação |
| --- | --- |
| Projeto | **ProjetoGaragem** |
| Project Reference ID | `hxqhudfzdwfxnjzmphya` |
| URL do projeto | `https://hxqhudfzdwfxnjzmphya.supabase.co` |
| Organização | `Gustavo-tec0110's Org` (`qxshxrwburrsbwxrroxx`) |
| Estado no Dashboard | A primeira leitura mostrou **Unhealthy**; uma nova leitura no mesmo dia mostrou **Healthy**. O banco respondeu às consultas em ambos os momentos. O estado variou durante a investigação. |
| Site publicado | `https://projetogaragem.com.br/`; o JavaScript efetivamente servido contém somente o ref Supabase `hxqhudfzdwfxnjzmphya` entre os refs encontrados. Não há divergência de projeto. |

O Dashboard também exibia um aviso geral de investigação de problema técnico no serviço. Isso não explica por si só o código PostgreSQL `42501`.

## Permissões SQL efetivas

A primeira consulta executada foi exatamente o `SELECT` solicitado, com `has_table_privilege` para `anon`, `authenticated` e `service_role`. Os valores abaixo foram confirmados também pela ACL (`pg_class.relacl`). Todas as cinco tabelas têm RLS ativo.

| Tabela | RLS | `anon` SELECT | `authenticated` SELECT | `service_role` SELECT |
| --- | --- | --- | --- | --- |
| `cars` | sim | sim | sim | **não** |
| `project_modifications` | sim | **não** | sim | **não** |
| `profiles` | sim | **não** | sim | **não** |
| `modification_catalog` | sim | sim | sim | **não** |
| `modification_categories` | sim | sim | sim | **não** |

ACLs explícitas observadas (letra `r` = SELECT; grantor `postgres`):

| Tabela | `anon` | `authenticated` | `service_role` |
| --- | --- | --- | --- |
| `cars` | `rDxtm` | `arwdDxtm` | `Dxtm` |
| `project_modifications` | `Dxtm` | `arwdDxtm` | `Dxtm` |
| `profiles` | `Dxtm` | `arwDxtm` | `Dxtm` |
| `modification_catalog` | `rDxtm` | `rDxtm` | `Dxtm` |
| `modification_categories` | `rDxtm` | `rDxtm` | `Dxtm` |

`service_role` existe e tem `rolbypassrls = true`, mas `rolsuper = false` e `rolcanlogin = false`. **Bypass de RLS não concede privilégio SQL de tabela**: sem `SELECT`, uma consulta executada efetivamente nesse papel falha antes de a política RLS poder liberá-la. O SQL Editor roda em contexto administrativo; seu sucesso não demonstra que a API com uma chave secreta use esse mesmo papel.

O valor local de `SUPABASE_SERVICE_ROLE_KEY` tem formato de chave opaca `sb_secret_`, não de JWT legível. Seu papel efetivo **não foi inferido nem testado**. Também não foram inspecionados os valores das credenciais da implantação. Logo, a associação entre essa chave específica, a requisição 403 observada anteriormente e `service_role` ainda requer verificação direta e autorizada.

## Políticas RLS vigentes

As políticas SELECT remotas são:

| Tabela | Política / papéis | Condição |
| --- | --- | --- |
| `cars` | `cars_read_public_or_owner` / `anon`, `authenticated` | `is_public = true OR owner_id = auth.uid()` |
| `project_modifications` | `project_modifications_read_public_or_owner` / `anon`, `authenticated` | existe carro associado público ou de `auth.uid()` |
| `profiles` | `profiles_read_own` / `authenticated` | `id = auth.uid()` |
| `modification_catalog` | `modification_catalog_read_active` / `anon`, `authenticated` | `is_active = true` |
| `modification_categories` | `modification_categories_read_active` / `anon`, `authenticated` | `is_active = true` |

As demais políticas observadas são `cars_insert_own`, `cars_update_own`, `cars_delete_own`; `project_modifications_insert_owner`, `project_modifications_update_owner`, `project_modifications_delete_owner`; e `profiles_insert_own`, `profiles_update_own`, todas direcionadas a `authenticated` para suas respectivas operações. A existência de uma política SELECT para `anon` em `project_modifications` **não substitui** o grant SQL que falta. A ausência de leitura anônima em `profiles` está alinhada à política de leitura do próprio perfil e à view pública `public_profiles` documentada no esquema local.

O Dashboard marca `public.public_profiles` com o alerta **Security Definer View**. A view pertence a `postgres`, tem `security_barrier=true`, não apresenta `security_invoker=true` em `reloptions` e concede SELECT a `anon` e `authenticated`. Sua definição remota seleciona campos públicos de `profiles` e omite `email` e `full_name`; ela permite essa projeção pública mesmo sem SELECT anônimo na tabela base. O alerta deve ser avaliado separadamente antes de qualquer mudança na view. Ele não explica os `42501` das leituras diretas nas cinco tabelas.

## Migrations e comparação com o código local

O Dashboard lista **37 migrations**, e `supabase/migrations/` contém as mesmas 37 versões e nomes, desde `003_create_parts_tables` até `20260929120000_add_modification_catalog`. A última migration registrada remotamente é `add_modification_catalog`. As entradas `003` e `20260610126000` aparecem com data de inserção “Unknown” no Dashboard; isso é uma limitação dos metadados exibidos, não evidência de migration ausente. A correspondência de versões **não prova igualdade byte a byte dos SQLs** nem exclui mudanças manuais posteriores.

A migration local [`20260929120000_add_modification_catalog.sql`](../supabase/migrations/20260929120000_add_modification_catalog.sql) cria as três tabelas de modificações, ativa RLS e concede SELECT a `anon` e `authenticated` nas tabelas de catálogo, mas concede SELECT de `project_modifications` **somente a `authenticated`**. Isso coincide com as ACLs remotas. Nenhuma migration local encontrada concede SELECT dessas cinco tabelas a `service_role`. A migration [`20260606100000_project_creation_grants.sql`](../supabase/migrations/20260606100000_project_creation_grants.sql) concede SELECT de `cars` e `profiles` a `anon` e `authenticated`; o [`schema.sql`](../supabase/schema.sql) revoga depois o SELECT anônimo de `profiles` e o mantém para `authenticated`, como no remoto.

As colunas remotas de `modification_categories` (8), `modification_catalog` (13) e `project_modifications` (11) coincidem, pelos nomes observados, com a migration local de criação. `cars` e `profiles` também existem e têm as colunas usadas pelos caminhos de código inspecionados; não foi feita comparação exaustiva de tipos, defaults, índices e constraints. A divergência funcional comprovada está nas **permissões esperadas pelo consumo público**, não na ausência das tabelas.

Em [`src/lib/modifications/server.ts`](../src/lib/modifications/server.ts), a página consulta `project_modifications` pelo cliente de sessão de [`src/lib/supabase/server.ts`](../src/lib/supabase/server.ts). Sem sessão, ele usa a chave pública e o papel `anon`; a consulta encontra uma política de leitura pública, mas não encontra o grant SQL `SELECT`. O código converte o erro em lista vazia ao usar `data ?? []`, o que pode esconder a falha na interface. O cliente privilegiado de [`src/lib/supabase/service-role.ts`](../src/lib/supabase/service-role.ts) usa uma chave configurada separadamente; seu papel efetivo em requisições de produção não foi verificado.

## Causa dos HTTP 403 / `42501`

**Confirmado no banco:** há falta de privilégio SQL `SELECT` para `anon` em `project_modifications` e `profiles`, e para `service_role` nas cinco tabelas. Isso é suficiente para produzir `42501 permission denied` quando a requisição usa esses pares papel/tabela. RLS não corrige essa falta. O caminho anônimo de modificações no código fornece uma correspondência concreta entre uma consulta pública e um grant ausente.

**Checagem HTTP anônima de leitura:** com a chave pública servida pelo site, `GET /rest/v1/<tabela>?select=id&limit=0` retornou `200` em `cars`, `modification_catalog` e `modification_categories`; retornou `401` com código PostgreSQL `42501` em `profiles` e `project_modifications`. Nenhum registro foi retornado ou modificado. A diferença entre `401` nessa checagem e os `403` anteriores reflete contextos de requisição distintos; não se deve rotular todos os `42501` como HTTP 403.

**Logs históricos no Dashboard (13/10/2026, aproximadamente 18:47–18:52 UTC):** há requisições REST `HEAD`/`GET` com HTTP `403` nas cinco tabelas e eventos PostgreSQL correlatos `42501 permission denied for table ...`. O padrão das cinco falhas coincide com a ausência de SELECT de `service_role`, enquanto `anon` e `authenticated` têm SELECT em três dessas tabelas. Isso torna `service_role` uma **hipótese forte** para essas requisições, mas não prova que a chave usada por elas assumiu esse papel. O detalhe do log PostgreSQL mostra o usuário de conexão `authenticator`, que é o usuário do PostgREST antes da troca de papel por requisição; o painel não expôs o papel efetivo ou o identificador da chave. Um evento de gateway inspecionado mostrava `auth_user = null`, insuficiente para identificar `service_role`.

**Ainda não demonstrado para cada 403 específico:** o papel efetivo da chave opaca local ou da configuração da implantação. A mudança do estado do projeto entre “Unhealthy” e “Healthy” não explica os `42501`; tampouco há evidência de que Auth ou Storage seja a causa das falhas dessas cinco tabelas. Uma requisição como `authenticated` tem SELECT nas cinco, mas continua sujeita às condições RLS; resultados vazios por RLS não equivalem automaticamente a `permission denied`.

## Correção mínima recomendada — não aplicada

1. Para leitura **pública** de modificações, conceder `SELECT` em `public.project_modifications` a `anon`, preservando a política existente que limita linhas a carros públicos ou ao proprietário. Antes de aplicar, confirmar que a exposição pública dessas colunas, incluindo valores pagos e notas, é desejada; se não for, projetar uma view pública restrita.
2. Se chamadas de servidor realmente operarem como `service_role` e precisarem ler essas tabelas, conceder `SELECT` **apenas nas tabelas necessárias** a esse papel. Verificar primeiro o papel efetivo da chave usada na requisição. `rolbypassrls` já está ativo, portanto esse grant amplia acesso a todas as linhas das tabelas concedidas.
3. Não conceder SELECT anônimo em `profiles` para contornar 403. Para dados públicos de perfil, usar `public_profiles`; para dados privados, manter sessão autenticada e a política `profiles_read_own`.

Riscos: um grant em `project_modifications` expõe todas as colunas das linhas admitidas pela RLS a clientes anônimos; um grant a `service_role` permite leitura irrestrita das linhas, incluindo `profiles` com dados privados. Um ajuste de grant sem conferir a identidade efetiva da requisição pode não eliminar o 403. Qualquer alteração exige revisão dos fluxos e testes de acesso por papel.

## Autorização necessária para a próxima etapa

O proprietário esclareceu que **não deseja testes autenticados nesta etapa**. Para uma etapa futura de testes autenticados somente de leitura, será necessária autorização expressa para entrar no projeto `hxqhudfzdwfxnjzmphya` com uma conta de teste indicada por ele (ou login feito por ele no navegador) e executar SELECTs autenticados nas tabelas e rotas afetadas, sem expor credenciais. Para testes que criem usuários, projetos, modificações ou arquivos, ou que usem a chave secreta, será necessária autorização separada e específica. A identidade efetiva da chave secreta deve ser validada sem revelar seu valor antes de atribuir a ela qualquer resultado.
