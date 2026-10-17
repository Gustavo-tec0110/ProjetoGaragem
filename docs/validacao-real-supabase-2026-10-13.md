# Projeto Garagem — validação real do Supabase (13/10/2026)

## Escopo e identidade

- Worktree: `/home/gustavo/Área de trabalho/ProjetoGaragem-performance-etapa-1`; branch `codex/performance-etapa-1`; HEAD inicial e final `45da12b79891a244678abf54c66d7e2bd9205b0a`. As alterações pré-existentes foram preservadas. Nada foi commitado, enviado, integrado ou publicado.
- O HTML/JavaScript servido por `https://projetogaragem.com.br` em 13/10/2026 contém a URL Supabase com ref `hxqhudfzdwfxnjzmphya`. A chave secreta já presente na `.env.local` desta worktree foi aceita, nesse endpoint, pelas APIs administrativas de Auth e Storage. A `.env.local` não tem URL nem chave pública. Nenhuma chave foi copiada para variável pública ou registrada neste relatório.
- **Identidade ainda sem confirmação cruzada no Dashboard.** O Dashboard Supabase não carregou nesta sessão. Foi solicitada ao proprietário a conferência do ref nele. Conforme a regra de pré-escrita, não houve qualquer operação remota de escrita, nem conexão da aplicação local a essa instância para fluxos autenticados.
- Não foi possível confirmar a existência de backup/PITR ou ponto de restauração pelo Dashboard. Como nenhuma escrita ocorreu, não há estado a recuperar desta execução. Futuros testes deverão registrar IDs e usar remoção individual dos próprios dados, após inventário e confirmação do destino.

## Estrutura, permissões e inventário de leitura

| Verificação | Observação real | Limite |
|---|---|---|
| Auth administrativo | 10 usuários existentes; a chave local foi aceita | Nenhum usuário foi identificado como descartável desta execução; nenhum foi reutilizado |
| Storage | Bucket `project-images` público, limite de 5 MiB, MIME JPEG/PNG/WebP; listagem limitada encontrou 2 objetos em 2 subpastas de uma pasta pertencente a usuário Auth existente | Os objetos são preexistentes; nenhum foi modificado ou removido. A lista MIME difere do `schema.sql` local, que também prevê `image/jpg` e `image/pjpeg`; o upload atual normaliza para WebP |
| Catálogo público | `modification_categories`: 10 linhas; `modification_catalog`: 79 linhas, via chave pública extraída do bundle publicado | Confirma presença de parte do catálogo, não a versão exata de todas as migrations |
| Projetos | Consulta anônima a `cars` retornou 0 linhas públicas | Projetos privados não puderam ser inventariados |
| Tabelas com chave secreta local | `cars`, `project_modifications`, `modification_catalog`, `modification_categories` e `profiles` retornaram HTTP 403, `42501 permission denied for table` | Impede inventário completo e consulta privilegiada de referências pela aplicação local |
| `project_modifications` anônimo | HTTP 401, `42501 permission denied for table` | Diverge do `GRANT SELECT ... TO anon` da migration local; não comprova a policy RLS efetiva |

Foram lidas `supabase/schema.sql` e as migrations do catálogo, reserva de uploads, bucket e bloqueio de escrita direta. A migration `20260929120000_add_modification_catalog.sql` prevê RLS de leitura pública ou proprietário, escrita pelo proprietário e grants de leitura anônima. As chamadas remotas acima mostram divergência de grants ou configuração, mas a causa exata requer inspeção SQL no Dashboard. Não foi aplicada migration, alteração de grant, policy, bucket ou configuração compartilhada. As políticas RLS remotas **não foram verificadas diretamente**.

A rotina `removeUnreferencedModificationPhoto` usa a chave secreta para consultar `project_modifications` antes de excluir um objeto. Com a permissão observada, essa consulta retorna 403 e a rotina falha fechada, deixando o objeto no Storage. Isso é um bloqueio operacional comprovado para validar A3 com esta chave local; não se conclui que a chave do deploy seja a mesma. É necessário conferir no Dashboard o papel efetivo da chave, grants, policies e histórico de migrations antes de qualquer correção remota.

## Dados de teste e operações remotas

Nenhum usuário, projeto, modificação ou objeto foi criado nesta execução. Nenhum registro ou arquivo remoto foi editado ou excluído. Portanto, não há IDs desta execução para limpar e nenhum resíduo de teste novo. O inventário existente foi mantido intacto.

## Resultados A1–A4

| Área | Classificação | Evidência e limite |
|---|---|---|
| A1 — fotos de modificações | **Aprovada apenas em simulação** | 9 testes unitários no total cobrem geração do caminho, criação, edição, troca, remoção e compensação com banco/Storage simulados. Os 4 testes Playwright de fotos passaram com upload interceptado. Não houve upload, `move`, linha ou URL real; integridade remota permanece não testada. |
| A2 — autenticação e `next` | **Aprovada apenas em simulação** | Testes unitários rejeitaram destinos externos, barras invertidas, controles e separadores codificados, preservando caminhos internos. No servidor local sem Supabase, `/auth/callback?next=%2F%5Cevil.example%2Fpath` retornou 307 para `next=/garagem`, enquanto `next=/criar-projeto` preservou esse caminho; POST anônimo para `/api/uploads/image` retornou 401. Login, logout, persistência, sessão, callback OAuth e acesso cruzado não foram testados com usuário real. Google OAuth não foi reconfigurado. |
| A3 — uploads abandonados | **Reprovada para a configuração local conectada a este ref** | Cancelamento, substituição, erro e falha de gravação passaram em mocks. A consulta real de referências feita com a chave secreta local recebe 403; assim, a limpeza do código falha fechada e não remove objetos. A limpeza por idade depende do retorno do proprietário, lista até 20 objetos por visita e não protege editor ativo em outra aba após 24 h. Nenhum arquivo real foi excluído. |
| A4 — qualidade do código | **Aprovada em teste real local** | Unidade 9/9, TypeScript, ESLint completo, build de produção local e `git diff --check` passaram após correção pontual do script de pré-verificação. Playwright completo: 28 aprovados, 11 pulados por falta de contas/dados ou por serem cenários específicos de dispositivo. Rotas públicas passaram em Desktop e Mobile. |
| Permissões banco/Storage | **Não testadas com sessões reais** | Não foram criados dois usuários. Não houve requisições de A/B para escrita cruzada, leitura privada, exclusão de arquivo alheio ou RLS fora da interface. As respostas anônimas e de chave secreta acima são evidência de configuração, não substituem testes com JWTs reais de usuários. |

Os testes Playwright foram executados contra servidor local com URL, chave pública e chave secreta Supabase explicitamente vazias; o build local recebeu as mesmas variáveis vazias. Os testes não tocaram dados remotos. As rotas públicas e as otimizações de performance anteriores permaneceram funcionais nos smokes Desktop/Mobile; não foi feita nova medição de LCP/TBT ou INP.

## Correção local adicional

O primeiro `npm run lint` falhou em `scripts/check-isolated-supabase.mjs` por `console`, `fetch` e `AbortSignal` não declarados para o ESLint. O script passou a importar `node:console` e a acessar as APIs Web por `globalThis`. O comentário do ref bloqueado foi atualizado para refletir a observação no bundle público. O ESLint completo repetido passou. O próprio gate de lint é a regressão relevante para essa correção; não foi adicionada uma suíte que apenas reproduzisse a implementação.

## Estratégia para temporários antigos

A limpeza interativa atual só cobre o retorno da conta e pode alcançar um editor aberto há mais de 24 h. Uma rotina segura para contas ausentes requer inventário por dono, identificação de caminho temporário, checagem repetida de referências e de upload em andamento, além de uma lease renovável por editor ativo. A execução deve ser em lotes pequenos, idempotente, registrar IDs/resultados e falhar fechada quando consultas falharem. Um prazo conservador, como 48 h após a última atividade, reduz a colisão com editores longos, mas não substitui a lease. Antes de excluir, a rotina deve repetir as checagens para tolerar mudanças entre listagem e remoção. Não foi implantado job, cron, serviço pago ou exclusão periódica na infraestrutura pública.

## Pendências, risco e prontidão

1. Confirmar no Dashboard que o ref público é o projeto pretendido e consultar migrations aplicadas, grants, policies RLS, bucket, configuração Auth e capacidade de restauração.
2. Resolver a divergência de permissões **somente após apresentar impacto e obter autorização**. A aplicação local não consegue consultar referências com a chave secreta disponível; alterar SQL ou configuração compartilhada sem essa análise seria inseguro.
3. Fazer inventário completo de projetos privados e arquivos antes de qualquer escrita. Então criar dois usuários e projetos descartáveis identificados, testar A1/A2/A3 e RLS com sessões reais, conferir linha/URL/objeto em cada operação e limpar somente os IDs gerados.
4. Validar Google OAuth apenas se o provedor existente permitir o callback local sem mudança compartilhada; caso contrário, manter esse fluxo pendente.

**A branch não está pronta para integração local final.** Os gates locais passaram, mas o comportamento autenticado, banco e Storage reais continuam sem validação ponta a ponta; a divergência remota observada bloqueia a limpeza de fotos com a chave local. Não houve commit, push, merge, deploy, build remoto ou modificação de outras worktrees.
