# Segurança das imagens e plano de integração

14/10/2026, America/Bahia. Implementação e validação exclusivamente locais.

## 1. Resultado, ambiente e alcance da exposição

**A solução foi implementada na worktree solicitada. A produção permanece com o bloqueio de confidencialidade descrito no relatório anterior; nada foi aplicado remotamente.** A branch é revisável, mas o lançamento depende do corte coordenado, da retirada dos caminhos/cache antigos e da validação na infraestrutura real.

- Worktree: `/home/gustavo/Área de trabalho/ProjetoGaragem-performance-etapa-1`.
- Branch: `codex/performance-etapa-1`.
- Alterações anteriores, inclusive arquivos não rastreados, preservadas. O diff acumulado contém trabalho de outras etapas; não representa somente esta entrega.
- Lido integralmente `finalizacao-backend-supabase-2026-10-13.md`; consultados SQLs, scripts, testes e evidências pertinentes. O Next 16.3.3 foi consultado em `node_modules/next/dist/docs/` para Route Handlers, Image e Proxy.
- Não houve commit, push, merge, deploy, build remoto, aplicação remota de SQL, alteração de bucket/policy de produção, exclusão remota, contratação ou teste contra o Supabase compartilhado.
- Builds e servidor Next usaram variáveis Supabase explicitamente vazias, impedindo chamadas ao projeto real. Nenhum segredo consta nas novas evidências.

A causa é `project-images` público: o endpoint `/storage/v1/object/public/project-images/...` serve bytes sem consultar a privacidade de `cars`. RLS da tabela de projetos não protege esse endpoint. O relatório anterior documentou HTTP 200 anônimo para uma imagem descartável; esse teste remoto **não foi repetido nesta tarefa**. A abrangência é qualquer objeto do bucket, incluindo principal, galeria, eventos, peças, modificações e temporários. O upload anterior ainda gravava TTL de navegador de um ano.

Essa interpretação segue o [modelo de buckets do Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals): buckets públicos dispensam o controle de acesso na entrega dos arquivos.

## 2. Solução implementada

O bucket existente passa a **privado na migration de ativação**, mantendo os objetos no mesmo local. Todas as fotos gerenciadas pelo aplicativo usam `/api/media/project/<caminho>`. A rota:

1. Valida a chave do objeto; não aceita uma URL arbitrária para download.
2. Consulta `can_read_project_image` com o cliente da sessão. O banco deriva `auth.uid()` do JWT verificado pelo Supabase; o navegador não informa um ID de usuário autorizado.
3. Só então usa a service role, exclusivamente no servidor, para obter os bytes.
4. Gera a variante responsiva, quando solicitada, usando Sharp local.
5. Reconsulta a autorização após download/processamento e antes de enviar o corpo. Mudança de privacidade ou falha do banco nessa etapa descarta os bytes.
6. Responde com `private, no-store`, `CDN-Cache-Control: no-store`, `Netlify-CDN-Cache-Control: no-store`, `Surrogate-Control: no-store` e `Vary: Cookie, Authorization`. Não produz redirect, ETag, 304 nem URL assinada. GET e HEAD seguem a mesma regra.

`can_read_project_image` autoriza o dono da pasta e, para visitantes, somente objetos referenciados por projetos públicos ou por perfis públicos. Objeto sem referência não é público. **Qualquer referência a projeto privado tem precedência**, inclusive se o mesmo arquivo também aparecer num projeto público ou numa capa de perfil. Uma referência legada a pasta de outra conta impede entrega pública. Não foi criado um conceito novo de colaborador: a autorização privada acompanha o modelo atual de proprietário.

`project_image_references` registra principal/galeria de `cars`, `car_photos`, `car_parts`, `car_build_updates`, `project_modifications` e avatar/capa de `profiles`. Triggers mantêm esse registro na mesma transação das escritas, inclusive da RPC `save_car_project_atomic`. O backfill é protegido por locks de escrita e reexecutável. Índices em caminho e projeto evitam varrer todas as tabelas a cada imagem. Um trigger rejeita referência nova a imagem de outra conta, objeto ausente, caminho de temporário de modificação ou imagem cuja remoção já foi reivindicada.

A ativação acrescenta uma policy **restritiva** para bloquear SELECT e escritas diretas de `anon`/`authenticated` em `project-images`, mesmo com uma policy permissiva legada `FOR ALL`. Acesso direto e emissão de novas URLs assinadas ficam bloqueados para esses papéis. A service role continua operacional após autorização no aplicativo.

### Cache e desempenho

O `ProjectImage` mantém o componente, dimensões, layout e `srcset`. Um loader próprio envia as variantes à rota protegida, preservando miniaturas responsivas com larguras limitadas e qualidade 75/85. Sharp gera WebP sem ampliar a imagem. O caminho de fotos gerenciadas sai do cache do otimizador `/_next/image`; imagens estáticas entregues com o código continuam com otimização normal. `localPatterns` permite somente os diretórios estáticos conhecidos e imports estáticos; redirects do otimizador remoto foram desativados.

O Proxy bloqueia fontes de `project-images` e da rota protegida antes do cache local do otimizador. Há também uma Edge Function preparada em `netlify.toml` para `/.netlify/images` e `/_next/image`: aceita somente fontes estáticas conhecidas e os hosts públicos já permitidos; rejeita mídia dinâmica, OG, Storage, aliases codificados e encadeamento de otimizadores. Ela usa o modo padrão sem cache, sem `cache = "manual"`.

Isso é necessário porque o [Image CDN da Netlify](https://docs.netlify.com/build/image-cdn/overview/) mantém transformações em cache e pode ser solicitado diretamente. A [ordem de processamento da Netlify](https://docs.netlify.com/resources/troubleshooting/request-chain/) coloca Edge Functions sem cache antes dos caches e do Image CDN. A lógica da proteção foi testada localmente; seu comportamento no adaptador real **ainda precisa ser confirmado**. Não se afirma que `next start` reproduza a Netlify.

As consultas pesadas de catálogo/detalhes continuam em cache, com chaves versionadas para excluir respostas antigas. Antes de entregar um resultado público em cache, o código reconsulta a visibilidade atual; no catálogo isso é feito em lote. Consultas completas do proprietário continuam fora do cache público. As fronteiras Server/Client, template, prefetch seletivo, limites e otimizações das etapas anteriores foram mantidas. Não houve nova medição de Lighthouse ou alegação de ganho de LCP/INP/TBT.

## 3. Arquivos desta entrega

| Grupo | Arquivos criados ou ajustados nesta tarefa |
| --- | --- |
| Entrega e variantes | `src/app/api/media/project/[...path]/route.ts`; `src/lib/images/project-image-url.ts`, `delivery.ts`, `resize.ts` |
| UI, upload e modificações | `src/components/projects/project-image.tsx`; `src/components/site/site-navbar.tsx`; `src/app/api/uploads/image/route.ts`; `src/app/projeto/[slug]/modificacoes/actions.ts`; `src/lib/modifications/server.ts`, `photo-storage.ts` |
| Leitura, SEO e cache | `src/lib/supabase/queries.ts`, `server.ts`; `src/lib/types.ts`; `src/lib/seo.ts`; `src/app/api/og/[slug]/route.tsx`; `src/proxy.ts`; `next.config.ts` |
| Proteção no provedor | `netlify.toml`; `netlify/edge-functions/protect-project-images.ts` |
| SQL | Três migrations `20261014010000`, `20261014015000`, `20261014020000`; `docs/sql/preflight-imagens-2026-10-14.sql`; `docs/sql/contencao-imagens-2026-10-14.sql` |
| Validação e planejamento | `scripts/test-backend-migrations.mjs`, `test-image-security.mjs`, `plan-project-image-cutover.mjs`; `tests/unit/image-delivery.test.mjs`, `image-upload.test.mjs`, `image-cutover-plan.test.mjs`, `netlify-image-guard.test.mjs`; ajuste de mock em `modification-actions.test.mjs`; `tests/e2e/image-security.spec.ts` |
| Documentação | Este relatório e `docs/evidencias-seguranca-imagens-2026-10-14/` |

Arquivos como `photo-storage.ts`, `test-backend-migrations.mjs` e testes unitários já existiam sem commit e foram estendidos. As migrations de 13/10 e os documentos anteriores não foram descartados. O estado inicial está em `evidencias-seguranca-imagens-2026-10-14/status-inicial.txt`.

## 4. Fotos antigas, caminhos e retirada da exposição

O backfill reconhece URLs públicas legadas, URLs relativas novas e campos `storage_path`. As consultas e o componente convertem a URL legada para a rota protegida **sem reescrever ou excluir as fotos antigas**. A ativação não cria um bucket vazio, não copia, não move e não apaga objetos. O inventário de objetos das fixtures permaneceu idêntico imediatamente antes/depois das migrations.

**Essa ativação não é prova suficiente de retirada de todas as exposições históricas.** Caches de navegador/CDN e URLs assinadas anteriormente emitidas precisam ser tratados durante o corte. A aplicação nova não assina URLs, mas as policies antigas poderiam permitir que outro cliente as emitisse. A [documentação de entrega do Supabase](https://supabase.com/docs/guides/storage/serving/downloads) informa que URLs assinadas usam chave própria, persistem até expiração e não são invalidadas pela rotação de chaves Auth. A [documentação de Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn) também separa expiração do token e cache e alerta para propagação e cache de navegador. Não se pressupõe Smart CDN pago nem purge disponível no plano atual.

O corte deve verificar os endpoints públicos originais, transformações do Storage, endpoints de assinatura, `/_next/image`, `/.netlify/images` e OG. Testar apenas uma URL com nonce não comprova que a URL antiga, já em cache, deixou de funcionar. A confirmação deve usar as URLs exatas, clientes frios e pelo menos duas origens/regiões disponíveis.

Se não for possível provar ausência/revogação de tokens antigos ou retirada do cache, **rotacionar os caminhos dos objetos existentes com autorização**, mantendo o bucket privado. Foi preparado `scripts/plan-project-image-cutover.mjs`, que recebe um inventário privado exportado e gera somente um mapa offline de caminhos antigos/novos. Não acessa rede, não aplica SQL nem executa Storage. Valida propriedade, objetos ausentes, nomes não canônicos e colisões; preserva a pasta do dono e o formato de modificações. Temporários exigem revisão explícita de leases.

Formato de entrada: `{ "bucket": "project-images", "objects": [{ "name": "<chave>" }], "references": [{ "path": "<chave>", "owner_id": "<UUID>", "source_table": "<tabela>", "source_id": "<UUID>" }] }`. Exportar as referências usando o preflight e, após preparação, conferir o registro. O indicador de consistência do plano não substitui os gates de backup, autorização, manutenção e inspeção de Auth/leases.

```bash
# Apenas planejamento offline; os arquivos contêm caminhos privados.
node scripts/plan-project-image-cutover.mjs /diretorio-privado/inventario.json /diretorio-privado/plano.json
```

Sequência de rotação futura, sempre dentro da manutenção:

1. Guardar backup privado dos bytes, hashes SHA-256, metadados e de todas as linhas/referências. Confirmar leitura do backup. Não basta backup SQL: ele não contém os bytes do Storage.
2. Copiar cada objeto para a nova chave **no bucket já privado**, sem sobrescrever. Conferir tamanho, hash e leitura. O campo `moves` do plano é um mapa de destino, não uma ordem para mover sem backup.
3. Atualizar as referências em transação, com condição de valor anterior, incluindo arrays, campos de caminho, perfil, metadados Auth relevantes e leases. Manter journal por objeto e conferir que o backfill/triggers representam o resultado. Não restaurar caminhos de tokens antigos.
4. Somente após cópia e referências verificadas, e autorização específica, remover o original pela API de Storage. Nunca apagar linhas de `storage.objects` via SQL. Revalidar ausência de referências e de editor ativo imediatamente antes. **Nenhuma dessas remoções foi executada nesta tarefa.**
5. Confirmar invalidação/purge aplicável e negar as URLs antigas exatas, inclusive assinadas. Se uma URL continuar entregando bytes, manter manutenção e tratar com o provedor; a mudança de URL na interface não encerra a exposição antiga.

Uma falha antes da atualização mantém os bytes e referências originais privados; depois da atualização mantém também a cópia confirmada. Uma falha de remoção deixa uma exposição histórica pendente e impede declarar prontidão. Depois da remoção, recuperar sempre para uma chave nova privada, nunca para a chave antiga acessível por token. A alternativa `move` do Storage retira o original, conforme [documentação de cópia/movimentação](https://supabase.com/docs/guides/storage/management/copy-move-objects), mas não elimina a necessidade de backup, consistência do banco e verificação de cache.

## 5. Segurança e compatibilidade das novas imagens

Todos os tipos de upload continuam usando validação de formato/dimensões, normalização WebP, quota/reserva e nome aleatório. O upload agora grava `cacheControl: "0"` e responde somente com URL relativa protegida, caminho e dimensões, sem URL pública ou token. Temporários de modificação seguem os leases de 30 minutos e a finalização para a pasta `modifications`.

Troca/exclusão de modificação só remove Storage depois da atualização confirmada do banco e da reivindicação de caminho sem referência global. Locks por caminho e `project_image_deletion_claims` impedem que um salvamento posterior anexe o objeto durante a exclusão. Falha no banco impede remoção; falha no Storage deixa a reivindicação bloqueada para inspeção e recuperação. A compensação de upload/lease atua somente no objeto recém-criado.

Remover uma foto da galeria ou excluir um projeto retira as referências e o acesso anônimo; não introduz limpeza indiscriminada de originais/órfãos. O dono ainda pode acessar objetos próprios não reivindicados. A política conservadora de temporários antigos sem lease permanece. A migration de compatibilidade da limpeza amplia a verificação para todas as referências e impede renovar um caminho já reivindicado. Nenhum executor/agendamento foi ativado.

Capas de perfil e avatares normalmente permanecem públicos. Se uma foto privada for reutilizada nesses campos, a precedência privada bloqueia sua leitura pública. Fotos de principal, galeria, peças, eventos e modificações acompanham a mesma regra. OG consulta somente projeto público, usa a rota protegida ou fallback quando a foto também tiver referência privada, revalida o projeto depois de renderizar e responde sem cache. Canonical e compartilhamento públicos foram preservados.

URLs externas adicionadas manualmente apontam para arquivos fora do Storage administrado. O aplicativo não pode tornar privado um arquivo já hospedado por terceiro. O preflight deve identificar esses casos; para confidencialidade de bytes originais, importar a foto para o bucket privado com autorização e substituir a referência. Não se afirma proteção de arquivos de terceiros nem de cópias que alguém já baixou legitimamente.

## 6. Testes e evidências

Evidências em [`evidencias-seguranca-imagens-2026-10-14/`](evidencias-seguranca-imagens-2026-10-14/).

| Verificação | Resultado / natureza |
| --- | --- |
| A acessando foto privada; B e anônimo negados; público acessível | SQL real em PostgreSQL/PGlite isolado e HTTP local com o Route Handler real; Auth/Storage são fixtures, não Supabase real |
| Público → privado; privado → público; caminho compartilhado por privado/público | SQL real; revogação/restauração imediatas no predicado |
| Principal, galeria, peça, evento, modificação, avatar e capa | Registro/guards em SQL; variantes e upload em testes locais; UI pertinente em Playwright |
| URL pública antiga e leitura direta/assinatura pelo proprietário | Bucket privado representado pela fixture HTTP; policy restritiva SELECT real testada contra policy legada `FOR ALL`; não comprova CDN/Supabase remoto |
| Upload de todos os tipos, quota, imagem inválida e falha de lease | Route Handler com adaptadores simulados, Sharp e arquivos reais; compensação e liberação da reserva verificadas |
| Troca/exclusão e falhas de move/gravação | Testes de actions com Storage/banco simulados; preservação da foto anterior e compensação da nova |
| Visibilidade alterada durante download/processamento | HTTP local com SQL real na alteração; também teste de transformação; nenhum byte entregue após segunda autorização negativa |
| Anexar imagem após reivindicação, objeto ausente, referência de outra conta | SQL real: rejeição e rollback; foto válida anterior preservada |
| Lease/reivindicação e referências globais | SQL real: ambas as ordens relevantes, sem ressurreição; concorrência encenada/serializada, não múltiplas conexões Supabase |
| Reaplicação das migrations e contenção | SQL real, sem recriar o banco entre reaplicações; dados preservados e bucket continua privado |
| `/_next/image`, fontes antigas, aliases, OG e assets estáticos | Requisições reais contra `next start` local no build de produção |
| `/.netlify/images` antes de um cache antigo | Teste da Edge Function com `context.next()` simulado; fontes dinâmicas nunca chegam ao cache; execução Netlify pendente |
| Navegação pública, editor de perfil e fotos de modificação | Playwright local Desktop/Mobile; requisições de upload das suítes de fotos/editor são interceptadas |

Resultados finais dos gates constam nos logs `unit.log`, `sql-http.log`, `playwright.log`, `typecheck.log`, `lint.log`, `build.log` e `diff-check.log`:

- **25/25 testes unitários**, incluindo Sharp real, compensações, transformação, guards da Netlify e plano offline.
- **107 verificações SQL/HTTP isoladas**: 39 do backend anterior e 68 de imagens. Inclui reaplicação, falha segura da ativação com RLS desabilitada, capas e contenção sem reabrir o bucket.
- **26 testes Playwright aprovados**, com 3 pulos previstos: mouse/roda/teclado somente Desktop e dois gestos multitoque somente Mobile. Foram 29 casos selecionados, sem falhas, no build final local.
- **Typecheck independente, ESLint completo, build local de produção e `git diff --check` aprovados.** Os 62 caminhos modificados/não rastreados presentes no início continuam presentes.
- **Nenhum teste real de Supabase/Netlify nesta rodada.** Auth, Storage remoto, assinatura antiga e cache do provedor continuam sujeitos aos gates descritos; os testes simulados não foram classificados como validação remota.

Reprodução local:

```bash
node --test tests/unit/*.test.mjs
PGLITE_MODULE_PATH=/tmp/pg-backend-validation/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-backend-migrations.mjs
npm run typecheck
npm run lint
NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' SUPABASE_SERVICE_ROLE_KEY='' PROFILE_IMAGE_EDITOR_TEST_HARNESS=1 MODIFICATION_PHOTOS_TEST_HARNESS=1 npm run build
```

PGlite 0.5.10 já estava disponível no diretório temporário da validação anterior; não foi acrescentada dependência ao projeto. Os harnesses são opt-in e só foram ativados para validação local. Para Playwright, iniciar `next start` local com as mesmas variáveis vazias e executar `public.spec.ts`, `modification-photos.spec.ts`, `profile-image-editor.spec.ts` e `image-security.spec.ts` com `PLAYWRIGHT_BASE_URL` local.

## 7. Riscos restantes e limites da garantia

- Bucket/policies/remoto ainda não alterados: esta entrega não protege a produção já publicada.
- Cache histórico e URLs assinadas anteriores continuam gates reais. Não há garantia universal de revogação de bytes previamente baixados. Requisição já autorizada e concluída antes de uma mudança de visibilidade também não pode ser desfeita.
- As duas consultas da rota delimitam a autorização antes/depois do processamento. Não existe transação distribuída que inclua enviar bytes na rede e alterar o banco. Uma mudança após a segunda consulta pode coincidir com uma resposta já em andamento; requisições seguintes reconsultam o estado.
- Netlify Edge/adaptador/cache, Supabase Storage HTTP, login A/B real e corridas com múltiplas conexões ainda precisam de ambiente isolado confirmado e autorização para validação remota. Não foram simulados como se fossem teste real de infraestrutura.
- A nova política depende de todos os escritores passarem pelos triggers; a service role/admin tem privilégios elevados. Confirmar owners, ACLs e policies no ambiente real e não entregar a chave ao navegador.
- Mídia dinâmica evita cache compartilhado e usa CPU/egress existentes de Next/Netlify/Supabase. Não requer serviço pago adicional, mas consome quotas do plano; medir volume/latência no corte. Larguras/qualidades são limitadas. A tabela de reivindicações é conservadora e pode demandar inspeção de órfãos; não há rotina destrutiva nova para ela.
- Paths não canônicos, referências cruzadas legadas, objetos ausentes, domínios antigos/customizados e URLs externas precisam de tratamento individual no preflight. A correção falha fechada e pode produzir fallback até essa reconciliação.
- Restam também os gates anteriores: novas projeções públicas reais, limpeza concorrente validada antes de ativação e Google OAuth completo.

## 8. Migrations e contratos

| Migration | Dependência e efeito | Compatibilidade teórica com versão publicada |
| --- | --- | --- |
| `20261013010000_restrict_modification_photo_ownership.sql` | Reconciliar efeito manual/histórico conforme relatório anterior | Confirmar preflight; não marcar versão artificialmente |
| `20261013020000_private_modifications_public_projection.sql` | Contrato público fixo e leitura privada | Exige código novo; não aplicar isoladamente |
| `20261013025000_private_expense_defaults_atomic.sql` | Defaults privados na RPC, guarda por hash | Aplicar após 200 e confirmação do corpo remoto |
| `20261013030000_pending_modification_photo_leases.sql` | RPCs/tabela de leases | Aditiva para leitores antigos; necessária para uploads novos; executor permanece parado |
| `20261014010000_project_image_access_registry.sql` | Registro, backfill, triggers e RPCs de leitura/claim; depende de tabelas e leases anteriores | Mantém bucket e URLs públicas antigos; escritas normais próprias continuam, referências indevidas passam a ser negadas; conferir legado antes |
| `20261014015000_project_image_cleanup_guards.sql` | Leases consultam referência global/reivindicações | Depende de 130300 e 140100; não muda duração/retenção nem liga executor |
| `20261014020000_activate_private_project_images.sql` | Bucket privado e Storage acessível só pelo servidor | **Incompatível com fotos do site antigo; exige corte coordenado/manutenção e código novo** |

RPCs privilegiadas novas usam `search_path` vazio, objetos qualificados, retorno booleano e ACL de execução explícita; helpers e tabelas internas não têm acesso direto por usuários comuns. Não foram ampliados GRANTs administrativos gerais. A ativação exige bucket existente, preparação anterior e RLS de Storage já habilitada, falhando em vez de criar um substituto vazio ou prosseguir sem isolamento.

## 9. Sequência segura para o único deploy futuro

1. **Antes de autorizar qualquer aplicação:** finalizar/revisar todas as branches, consolidar o diff em ambiente aprovado, repetir testes locais e confirmar que as outras branches preservam rota/loader, guards, privacidade, cache e SQL. Revisar também configuração do Dashboard e quaisquer rewrites que alterem os diretórios estáticos permitidos. Nenhum merge ocorreu nesta tarefa.
2. Confirmar explicitamente ref/ambiente de destino. O ref `hxqhudfzdwfxnjzmphya` é referência do relatório anterior, não nova confirmação de sessão. Executar os dois preflights read-only (`preflight-backend-2026-10-13.sql` e `preflight-imagens-2026-10-14.sql`) somente no ambiente confirmado e guardar resultados privados. Conferir histórico, ACLs, policies, hash da RPC, inventário e referências/URLs externas.
3. Preparar backup verificável de banco **e bytes**, mapa de rotação se necessário, journal e plano de purge do provedor. Reproduzir matriz em Supabase isolado real aprovado. Não criar staging que use os dados/credenciais de produção por omissão.
4. Abrir manutenção aprovada, interromper escritores, uploads e executor. Uma manutenção só na interface não fecha os endpoints públicos Supabase já expostos: a ativação do bucket privado é a contenção do origin. Não introduzir mais objetos privados no bucket ainda público durante a transição.
5. Aplicar na ordem da seção 8, reconciliando 130100 com o preflight. Aplicar preparação/backfill e guards; em seguida a ativação privada. Manter site em manutenção: nesse intervalo o site antigo perde fotos, o que é preferível a reabrir exposição. Não prometer corte sem indisponibilidade com a arquitetura atual.
6. Executar a rotação/retirada dos caminhos antigos e purge quando exigidos pelos gates da seção 4, com autorizações específicas e bytes preservados. Conferir novamente inventário/hashes e referências. Não reexecutar migrations históricas que tornem o bucket público.
7. Fazer **um único deploy consolidado na Netlify**, incluindo código compatível e a Edge Function, sem os flags de harness. Garantir segredo server-side já aprovado e bundling de Sharp. Não tratar deploy preview adicional como autorizado; qualquer validação no provedor deve ter escopo aprovado.
8. Ainda em manutenção, confirmar a matriz A/B/anônimo por URLs diretas de original/variantes, URLs públicas e assinadas antigas, OG e ambos os otimizadores. Primeiro aquecer uma foto pública, depois torná-la privada e repetir a URL exata com outra sessão e sem sessão. Conferir `Age`, cache status e cabeçalhos, chamadas realmente passando pelos guards, novas fotos de todos os tipos, substituição/exclusão, projeções REST, custos/notas e perfis.
9. Verificar público → privado → público, preservação de originais, SEO/canonical/OG públicos, ausência de erros de UI e Google OAuth. Validar corrida Storage/banco com conexões reais. Somente após todos os gates reabrir; habilitar limpeza periódica apenas após a validação específica anterior.

Se qualquer etapa falhar, manter manutenção, bucket privado e executor parado. `contencao-imagens-2026-10-14.sql` revoga leitura/claims e mantém bytes, registro e privacidade; pode ser combinado com a contenção anterior. Reparar adiante e retestar. **Não fazer rollback para bucket público, SELECT permissivo ou versão antiga que publique URLs diretamente.**

## 10. Operações que exigem autorização futura

Aplicação de migrations e ACLs remotas; mudança do bucket; manutenção/reabertura; deploy consolidado; backup/exportação de dados privados; testes remotos com ambiente confirmado; cópia/rotação/remoção individual de originais; purge/revogação de tokens via provedor; mudanças em credenciais/configuração Netlify e ativação do executor. Nada dessa lista foi executado nem solicitado para aprovação nesta rodada, cujo escopo termina em implementação, testes e documentação locais.

## 11. Prontidão da branch

**Implementação local concluída e revisável. Não pronta para alegar confidencialidade da produção ou autorizar lançamento.** É necessário confirmar/aplicar o contrato SQL, retirar exposições históricas e validar no provedor real em coordenação com as demais branches. A arquitetura evita cópia pública de novas fotos e fecha mudanças de visibilidade a cada nova requisição; não mascara as condições pendentes da migração.
