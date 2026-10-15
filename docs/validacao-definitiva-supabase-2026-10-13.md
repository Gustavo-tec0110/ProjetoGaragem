# Projeto Garagem — validação Supabase (13/10/2026)

## Resumo e limite da conclusão

**A validação real confirmou A1 e A3 e revelou uma falha adicional de isolamento, corrigida no RLS.** Inicialmente, a limpeza de fotos consultava `project_modifications` com a chave secreta local, recebia HTTP 403/`42501` e deixava objetos órfãos. O código passou a consultar referências com a sessão autenticada do proprietário e manteve a chave secreta para a operação de Storage. Troca, remoção, exclusão e cancelamento foram repetidos no Supabase real e limparam os objetos corretos. **Nenhum GRANT foi executado.** As leituras administrativas diretas com a chave secreta ainda recebem 403 nas cinco tabelas; nenhuma delas é necessária ao fluxo atual de limpeza. A leitura anônima de modificações públicas também permanece sem grant por expor todas as colunas das linhas públicas, inclusive valores pagos e notas.

Trabalho na worktree `/home/gustavo/Área de trabalho/ProjetoGaragem-performance-etapa-1`, branch `codex/performance-etapa-1`. Alterações anteriores foram preservadas. Não houve commit, push, merge, deploy, build remoto da Netlify, alteração de Auth/OAuth, bucket ou contratação de recurso.

## Ambiente e proteção anterior às escritas

| Item | Resultado |
| --- | --- |
| Projeto e organização | `ProjetoGaragem`, `Gustavo-tec0110's Org` (`qxshxrwburrsbwxrroxx`) |
| Project Ref e URL | `hxqhudfzdwfxnjzmphya`, `https://hxqhudfzdwfxnjzmphya.supabase.co` |
| Site publicado | `https://projetogaragem.com.br`; o bundle publicado verificado no diagnóstico anterior usa o mesmo ref |
| Estado | Dashboard mostrou **Healthy**, branch `main` de produção |
| Chave local | `sb_secret_` da `.env.local` corresponde à chave secreta `default` exibida no Dashboard por prefixo; a chave foi aceita neste projeto por Auth e Storage. A [documentação oficial](https://supabase.com/docs/guides/getting-started/api-keys) mapeia uma secret key sem JWT de usuário ao papel PostgreSQL `service_role`. O cliente privilegiado local não compartilha sessão de usuário. A chave do deploy não foi inspecionada. Nenhum valor secreto foi registrado. |
| Backup | Dashboard: **No backups**. As alterações SQL feitas aqui têm reversão pontual; não há ponto de restauração do banco confirmado. |
| Inventário antes dos testes | 10 usuários Auth, 10 perfis, 0 projetos, 0 modificações, 0 reservas de upload e 2 objetos preexistentes no bucket `project-images` (uma pasta de usuário; nenhum temporário). |
| Bucket | `project-images` público, limite de 5 MiB, MIME `image/jpeg`, `image/png`, `image/webp`. Nenhuma configuração foi alterada. |

Antes de escrever, foram lidas as ACLs das cinco tabelas, as políticas RLS, a lista de migrations e os dados/objetos relevantes. O histórico remoto continha as mesmas **37 versões** então presentes em `supabase/migrations/`, com última migration `20260929120000_add_modification_catalog`. A correspondência das versões não prova igualdade integral dos SQLs nem exclui mudanças manuais.

## Diagnóstico de permissões e HTTP 403

Consulta SQL repetida no Dashboard: as cinco tabelas têm RLS ativo, com os seguintes privilégios `SELECT` antes **e depois** desta validação (nenhum `GRANT` ou `REVOKE` foi executado):

| Tabela | `anon` | `authenticated` | `service_role` |
| --- | --- | --- | --- |
| `cars` | sim | sim | **não** |
| `project_modifications` | **não** | sim | **não** |
| `profiles` | **não** | sim | **não** |
| `modification_catalog` | sim | sim | **não** |
| `modification_categories` | sim | sim | **não** |

Com a chave secreta local e sem JWT de usuário, `GET ?select=id&limit=0` retornou **HTTP 403 / PostgreSQL 42501 nas cinco tabelas**. O teste HTTP reproduz a falha; o papel efetivo é estabelecido pelo tipo de chave confirmado no Dashboard e seu mapeamento oficial. O `service_role` tem `BYPASSRLS`, mas isso não substitui `SELECT` de tabela. A chave da implantação publicada não foi verificada; não atribuímos seus eventos históricos a ela.

Após as correções, a mesma checagem com chave secreta ainda retornou **403/42501 em cada uma das cinco tabelas**, coerente com as ACLs inalteradas. A checagem anônima de `project_modifications` ainda retornou **401/42501**.

No início desta etapa, o código usava o cliente privilegiado para **Storage** e para consultar `project_modifications` em `removeUnreferencedModificationPhoto`. O teste real comprovou o efeito do 403: a linha da modificação era removida, mas a foto final ficava no bucket. A correção local em [`photo-storage.ts`](../src/lib/modifications/photo-storage.ts) exige que a sessão autenticada pertença ao usuário da pasta e usa essa sessão para a consulta de referências, sujeita a SELECT e RLS já existentes. O cliente secreto permanece restrito à operação de Storage. O reteste real mostrou os objetos removidos após troca, desvinculação e exclusão, sem alterar privilégios. Conceder `SELECT` a `service_role` agora ampliaria acesso sem necessidade demonstrada no aplicativo.

`profiles` sem SELECT anônimo é intencional: a política protege dados próprios e a projeção pública usa `public_profiles`. A política `project_modifications_read_public_or_owner` inclui `anon`, mas falta o grant SQL correspondente. A página pública pode receber `42501` e tratar o resultado como lista vazia. Conceder leitura anônima à tabela inteira exporia, nos projetos públicos, `paid_amount` e `note`; essa mudança também ficou pendente de decisão explícita. A view `public_profiles` continua marcada como **Security Definer View** pelo Advisor, assunto separado desta correção.

## Alteração remota realizada: caminho de foto no RLS

Um teste negativo real mostrou que o proprietário de um projeto conseguia inserir diretamente em `project_modifications` um caminho `project_photo_storage_path` iniciado pelo ID do outro usuário. A linha de prova foi excluída imediatamente. A restrição anterior verificava a forma do caminho e a propriedade do projeto, mas não a propriedade da pasta de Storage.

No SQL Editor, foram executados **somente dois `ALTER POLICY ... WITH CHECK`**, detalhados na migration local [`20261013010000_restrict_modification_photo_ownership.sql`](../supabase/migrations/20261013010000_restrict_modification_photo_ownership.sql). Foram preservados o limite de taxa e a exigência de que o projeto pertença a `auth.uid()`; acrescentou-se `project_photo_storage_path IS NULL OR split_part(project_photo_storage_path, '/', 1) = auth.uid()::text` às políticas de INSERT e UPDATE. As políticas SELECT, DELETE e a opção de RLS não mudaram.

Após a mudança, a leitura de `pg_policies` mostrou a nova expressão nas duas políticas, e a mesma tentativa de inserir um caminho do segundo usuário foi **rejeitada com 42501, zero linhas**. Caminhos próprios e `NULL` foram aceitos nos fluxos reais posteriores. A execução manual não registrou a nova versão no histórico remoto: o remoto segue com 37 migrations e o arquivo local novo é a próxima migration pendente. Ela é idempotente quanto ao resultado da política, mas deverá ser reconciliada no processo de migrations antes da integração.

Reversão pontual, se necessária, com as expressões anteriores preservadas:

```sql
ALTER POLICY "project_modifications_insert_owner" ON public.project_modifications
WITH CHECK (
  public.enforce_action_rate_limit('project_update')
  AND EXISTS (SELECT 1 FROM public.cars c
              WHERE c.id = project_modifications.car_id AND c.owner_id = auth.uid())
);
ALTER POLICY "project_modifications_update_owner" ON public.project_modifications
WITH CHECK (
  public.enforce_action_rate_limit('project_update')
  AND EXISTS (SELECT 1 FROM public.cars c
              WHERE c.id = project_modifications.car_id AND c.owner_id = auth.uid())
);
```

Essa reversão restauraria a falha de isolamento e só deve ser usada se houver regressão demonstrada. O novo CHECK pode rejeitar clientes externos que gravavam caminhos de outro usuário; isso é a proteção pretendida. Linhas antigas não são reescritas pela alteração.

## Testes reais e simulados

| Área | Classificação | Evidência |
| --- | --- | --- |
| Autenticação A2 | **Aprovada em teste real para email/senha** | Duas contas descartáveis entraram com sessões próprias; cada uma leu seu perfil e recebeu zero linhas para o perfil alheio. `refreshSession`, logout, persistência após reload e navegação local com `next` externo bloqueado passaram. Navegação local pelo login até `/garagem` passou sem `pageerror`. Google OAuth não foi testado nem reconfigurado. |
| Projeto | **Aprovada em teste real para banco; interface parcial** | Um projeto descartável foi criado e editado; a leitura autenticada confirmou `city = Curitiba`. A suíte completa de interface não encontrou esse texto na página no prazo; houve também recargas do `next dev` e, no build local de produção, um redirecionamento para o domínio publicado por causa da URL canônica fixa. O projeto foi excluído com uma linha afetada. |
| A1 — foto de modificação | **Aprovada em teste real** | Pela interface local, upload temporário, criação, substituição, remoção e exclusão de modificação funcionaram. Em cada gravação, o banco apontou para caminho definitivo existente no Storage; a pasta temporária ficou vazia. Um fluxo adicional direto com sessões reais confirmou `move`, troca de referência e remoção da linha. |
| RLS de usuários | **Aprovada em teste real** | Perfil alheio e projeto privado do outro usuário: zero linhas. UPDATE/DELETE do carro alheio: zero linhas. UPDATE da modificação alheia: zero linhas. INSERT com caminho de foto alheio: aceito antes da correção e rejeitado depois com 42501. |
| Storage entre usuários | **Aprovada em teste real** | A tentativa do segundo usuário de remover um objeto do primeiro retornou sucesso vazio (zero objetos removidos); download administrativo posterior confirmou que o objeto continuava presente. |
| A3 — limpeza na troca, remoção, exclusão e cancelamento | **Aprovada em teste real após correção** | Antes da mudança, a interface atualizou/excluiu a linha, mas os objetos antigos persistiram nas três situações; foram removidos manualmente. Depois da mudança, o objeto anterior desapareceu na troca, a foto desvinculada desapareceu, e linha e arquivo desapareceram na exclusão. Cancelamento reduziu os temporários de 1 para 0. A consulta usa a sessão do proprietário e falha fechada em caso de erro. |
| Compensação de falhas | **Aprovada em simulação** | 9 testes unitários incluem falha no `move`, gravação que falha ou afeta zero linhas, substituição, exclusão, caminho alheio e ausência de sessão. Testes de interface com interceptação cobrem cancelamento e upload recusado. Não foram provocadas falhas de infraestrutura no Supabase compartilhado. |
| Temporários abandonados de contas inativas | **Não testada como solução periódica / pendente** | A reconciliação atual depende do retorno da conta, limita a listagem a 20 arquivos e pode alcançar um editor ativo em outra aba após 24 h. Não há executor periódico nem lease de editor validada; nenhum cron ou serviço pago foi configurado. |

No fluxo de projeto da suíte E2E, duas tentativas geraram objetos de foto não referenciados por `car_photos`; ambos estavam na pasta da conta descartável e foram removidos. Isso merece investigação própria se ocorrer fora do teste. Nenhum objeto preexistente foi tocado.

## Gates locais e arquivos alterados nesta etapa

- `node --test tests/unit/*.test.mjs`: **9/9**.
- `npm run typecheck`, `npm run lint`, `git diff --check`: **aprovados após os ajustes**.
- `NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= SUPABASE_SERVICE_ROLE_KEY= npm run build`: **aprovado localmente**; sem conexão ao Supabase durante o build.
- Playwright geral com Supabase vazio: **27 aprovados, 11 pulados, 1 falha** no teste mobile de imagem ilegível. Esse caso passou ao ser repetido isoladamente. A suíte autenticada completa falhou na checagem visual de cidade e no ambiente local de produção; os fluxos essenciais foram repetidos manualmente com sessões reais e consultas ao banco.
- Após a correção A3, Playwright focado em páginas públicas Desktop/Mobile e fotos simuladas Desktop: **10/10 aprovados**. O fluxo real de fotos e limpeza foi repetido pela interface com uma conta descartável e Storage/DB remotos, conforme a tabela acima.
- [`tests/e2e/helpers.ts`](../tests/e2e/helpers.ts): o helper de login agora escolhe o primeiro `<main>`, pois a página renderiza dois; antes, o modo estrito impedia o teste de prosseguir.
- [`src/components/projects/project-modifications.tsx`](../src/components/projects/project-modifications.tsx): espaçamento superior pontual impede que o cabeçalho fixo intercepte o botão “Adicionar modificação”; clique real confirmado.
- [`src/lib/modifications/photo-storage.ts`](../src/lib/modifications/photo-storage.ts): consulta referências com a sessão autenticada do dono validado; o cliente secreto continua responsável apenas pela remoção no Storage. Isso resolve A3 sem ampliar grants e mantém falha fechada quando a consulta não responde.
- [`supabase/migrations/20261013010000_restrict_modification_photo_ownership.sql`](../supabase/migrations/20261013010000_restrict_modification_photo_ownership.sql): versão local da alteração RLS remota comprovada.

As otimizações de performance anteriores não foram removidas. Não foi feita nova medição quantitativa de LCP/TBT/INP nesta validação.

## Limpeza e integridade final

Foram criados **3 usuários, 2 projetos, modificações e fotos exclusivamente descartáveis**, em dois ciclos de teste. As modificações ficaram em zero linhas antes da exclusão de cada projeto; os projetos e usuários foram removidos individualmente. Os objetos de modificação e os dois objetos órfãos de foto de projeto, todos sob pastas das contas criadas nesta execução, foram excluídos por caminho. Os arquivos temporários locais que continham as credenciais das contas foram apagados.

Verificação independente após o segundo ciclo: a API administrativa voltou a **10 usuários**, a leitura pública retornou **0 carros e 10 perfis públicos**, e a listagem recursiva de Storage retornou os **2 objetos preexistentes**. As pastas das contas de teste estavam vazias antes de excluir essas contas. O navegador do Dashboard desconectou antes da repetição da contagem SQL administrativa final; a contagem direta de `profiles` e `project_modifications` não pôde ser repetida nesse momento. A leitura autenticada havia confirmado zero modificações de cada projeto antes de excluir as contas. O esquema usa FK obrigatória de modificação para carro com `ON DELETE CASCADE`, e não há carros restantes. Os objetos preexistentes não foram selecionados para remoção.

## Pendências, risco e prontidão

1. **HTTP 403 administrativo ainda presente:** `service_role` continua sem SELECT nas cinco tabelas. O aplicativo atual não precisa dessas leituras após a correção A3; por isso, o grant anteriormente submetido à confirmação não foi aplicado e não é necessário para a limpeza. Se houver uma rotina administrativa concreta que precise ler alguma dessas tabelas, revisar seu escopo e confirmar cada grant estritamente necessário. `GRANT SELECT ON public.project_modifications TO service_role` permitiria leitura de todas as notas e valores da tabela, pois esse papel ignora RLS; a reversão seria `REVOKE SELECT ON public.project_modifications FROM service_role`. O Dashboard não oferece backup confirmado.
2. **Leitura pública de modificações:** decidir se todas as colunas de modificações ligadas a projetos públicos podem ser anônimas. `GRANT SELECT ... TO anon` não foi aplicado. Se notas e preços devem ficar privados, desenhar projeção pública restrita e ajustar a consulta da página antes de ampliar acesso.
3. **Limpeza de contas que nunca retornam:** exige lease por editor e executor periódico disponível, com lotes pequenos, vencimento conservador, releitura de referências imediatamente antes da exclusão, idempotência e teste de concorrência em ambiente isolado. Não foi improvisado job de produção.
4. **Migrations e suite E2E:** reconciliar o novo arquivo RLS com o histórico remoto e estabilizar a suíte autenticada, incluindo a checagem visual após edição e o comportamento da URL canônica em build local. Investigar o alerta `public_profiles` separadamente.

**A branch ainda não está pronta para integração local final nem para lançamento.** A1, A3 e isolamento RLS foram demonstrados em testes reais. A página pública de modificações ainda precisa de uma decisão sobre exposição de dados; a suíte autenticada completa e a solução periódica para contas inativas permanecem pendentes. As leituras administrativas diretas com chave secreta continuam a retornar 403, sem bloquear o fluxo atual do aplicativo. Não houve publicação na Netlify.
