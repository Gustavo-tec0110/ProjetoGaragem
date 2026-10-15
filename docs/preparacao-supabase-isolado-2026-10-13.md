# Preparação de Supabase isolado — 13/10/2026

## Decisão

Usar **um projeto Supabase novo, descartável e separado**, no plano Free **somente se o Dashboard confirmar que a criação não gera cobrança**. Não criar nem configurar o projeto automaticamente. A worktree `ProjetoGaragem-performance-etapa-1` tem 7,6 GiB de RAM total, cerca de 3,0 GiB disponíveis e 61 GiB de disco livres; Docker, Podman, PostgreSQL local e CLI Supabase não estão instalados. A pilha local oficial requer gerenciador de contêineres e a documentação recomenda pelo menos 7 GB de RAM para seus serviços. Rodá-la junto com Next/Playwright neste computador teria pouca margem e exigiria instalar infraestrutura. Um projeto Free separado evita esse consumo local, mas sua disponibilidade depende do limite da conta e do plano da organização. Em organização paga, um projeto extra pode gerar custo de compute; não o crie sem uma decisão explícita sobre cobrança.

Fontes: [desenvolvimento local](https://supabase.com/docs/guides/local-development), [requisito de RAM](https://supabase.com/docs/guides/local-development/cli-workflows), [limite e custos por plano](https://supabase.com/docs/guides/platform/billing-on-supabase).

## Inventário e bloqueios

- `supabase/schema.sql` contém a base canônica; há 37 migrations históricas e `supabase/seed.sql`. A primeira migration (`003_create_parts_tables.sql`) pressupõe tabelas da base. Portanto, **não executar `supabase db push` nem aplicar migrations às cegas**: é preciso estabelecer a base e verificar a sequência no projeto vazio antes de gravar. `supabase/config.toml` não existe.
- `.env.local` nesta worktree contém somente o nome `SUPABASE_SERVICE_ROLE_KEY`; não contém URL, chave pública nem usuários E2E. Seu valor não foi lido ou usado. Não há instância isolada comprovada. Nenhum teste remoto A1–A3/autenticação foi executado.
- `scripts/qa-supabase.mjs` e `scripts/run-e2e-official.mjs` contêm um ref fixo legado e fazem criação/exclusão de dados. Não os executar neste preparo. O segundo ainda invoca `cmd.exe`, incompatível com este Linux. O ref foi bloqueado no novo verificador por precaução; não foi classificado como produção sem prova externa.
- O bucket `project-images` é público; as migrations finais bloqueiam gravação direta e usam reserva de upload, service role no servidor e RLS. A migration do catálogo cria `project_modifications` e suas policies. A validade efetiva dessas regras ainda depende de aplicação e verificação no projeto novo.

## Configuração manual necessária

1. No [Dashboard Supabase](https://supabase.com/dashboard), escolha uma organização **Free** com vaga gratuita confirmada. Crie um projeto novo chamado, por exemplo, `projeto-garagem-qa-descartavel`, sem importação, restauração, cópia de dados ou vínculo com produção. Se o painel pedir upgrade ou indicar cobrança, pare e informe isso antes de criar.
2. No projeto novo, copie o **Project ref** exibido na URL/página de configurações, a **Project URL**, a **anon key** e a **service_role key** desse mesmo projeto. Guarde as chaves apenas em variáveis de ambiente locais ou gerenciador de segredos; não as envie no chat, documentação ou Git. O ref precisa ser diferente de `hxqhudfzdwfxnjzmphya`.
3. Configure, nesse projeto, Auth com URL local `http://127.0.0.1:3000` e o redirect `http://127.0.0.1:3000/auth/callback`. Para validar OAuth, crie/configure também um provedor **de teste** com credenciais próprias e callback indicado pelo Dashboard desse projeto. Não reutilize o provedor OAuth de produção. Se não houver provedor de teste, a validação de OAuth permanece pendente.
4. Informe **somente o ref, a URL e a confirmação de que o plano é gratuito e o projeto foi criado vazio e separado**. Não compartilhe chaves aqui. Após essa confirmação, a próxima etapa poderá preparar/aplicar o esquema no destino verificado, criar dois usuários de QA, conferir Storage/RLS e executar os fluxos reais. Nenhuma escrita remota foi autorizada ou realizada nesta etapa.

## Verificação reproduzível antes de futuras escritas

Depois da configuração manual, defina localmente `QA_EXPECTED_PROJECT_REF`, `QA_SUPABASE_URL`, `QA_SUPABASE_ANON_KEY` e `QA_SUPABASE_SERVICE_KEY` com valores **do projeto descartável** e execute `node scripts/check-isolated-supabase.mjs` nesta worktree. O script não lê `.env.local` e faz apenas uma consulta administrativa de leitura com limite de um usuário. Ele exige correspondência exata entre ref e URL, recusa o ref legado e não imprime chaves nem usuários. A aprovação do script **não substitui** a comparação humana com o ref exibido no Dashboard, nem prova que as migrations foram aplicadas. Não usar `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` da aplicação antes dessa comparação.

## Validação pendente e critérios de aceite

Após base e migrations confirmadas no projeto novo, catálogo e bucket verificados, dois usuários de teste e um projeto de QA poderão ser criados. Executar login/logout, sessão e callback com `next` interno e externo; testar proprietário contra segundo usuário e visitante; realizar upload normalizado real, `move` temporário→definitivo, criação, edição, troca de foto e exclusão; comparar linha `project_modifications`, caminho, URL e objetos do Storage a cada etapa. Testar cancelamento, upload recusado, caminho de outro usuário, falha do `move`, falha e zero linhas na escrita após `move`, além de concorrência e consultas de referência falhas. Todo teste destrutivo exige a verificação do ref imediatamente antes de executá-lo.

- **A1**: validado quando o caminho definitivo persistir, o temporário sumir, a foto existir no Storage e falhas/compensação não deixarem referência quebrada em cenários reais.
- **A2**: validado ponta a ponta quando login/callback real aceitar apenas destinos internos e rejeitar destinos externos, com sessão preservada; OAuth exige provedor isolado de teste.
- **A3**: validado para o fluxo interativo quando cancelamento, substituição, erro e retorno do proprietário limparem apenas temporários próprios e não referenciados, sem apagar foto válida. A cobertura de contas inativas e editores abertos por mais de 24 h exige decisão/implementação posterior de lease e rotina periódica segura; o ambiente sozinho não resolve essa lacuna.

Até lá, valem apenas os testes unitários e de interface simulada documentados em `validacao-correcoes-auditoria.md`. A branch não está pronta para integração final por esses critérios. Nenhum commit, push, merge, deploy, build remoto, escrita ou exclusão em Supabase foi feito neste preparo.
