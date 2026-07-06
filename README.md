# Projeto Garagem

MVP em Next.js para publicar, explorar e acompanhar projetos automotivos. O app usa Supabase quando configurado e mantem fallback demo/local para navegacao publica e desenvolvimento sem banco.

## Stack

- Next.js 16 + App Router
- React 19 + TypeScript
- Tailwind CSS v4
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- Playwright para E2E

## Como Rodar

```bash
npm install
npm run dev
```

No Windows, os mesmos comandos podem ser executados como `npm.cmd install` e `npm.cmd run dev`.

Build de producao:

```bash
npm run build
npm run start:prod
```

## Comandos Principais

- `npm run dev`: sobe o Next localmente.
- `npm run lint`: roda ESLint.
- `npm run typecheck`: roda TypeScript sem emitir arquivos.
- `npm run build`: gera build de producao.
- `npm run test:e2e`: roda os testes Playwright.

## Testes E2E

Os testes ficam em `tests/e2e`.

```bash
npm run test:e2e
```

Playwright sobe o servidor automaticamente, a menos que `PLAYWRIGHT_BASE_URL` esteja definido. Para rodar contra um servidor ja aberto:

```bash
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
npm run test:e2e
```

Fluxos autenticados reais exigem um usuario de teste no Supabase:

```bash
set E2E_USER_EMAIL=usuario-de-teste@example.com
set E2E_USER_PASSWORD=senha
npm run test:e2e
```

Essas variaveis tambem podem ficar no `.env.local`; o Playwright carrega esse arquivo antes de iniciar os testes. Use uma conta dedicada de QA, com email confirmado e permissao para criar/editar projetos no ambiente Supabase configurado.

Para validar seguir um projeto de outro usuario, informe tambem:

```bash
set E2E_TARGET_PROJECT_SLUG=slug-de-projeto-de-terceiro
```

Sem `E2E_USER_EMAIL` e `E2E_USER_PASSWORD`, os testes autenticados sao ignorados de forma explicita; os testes publicos continuam rodando. Sem `E2E_TARGET_PROJECT_SLUG`, apenas o caso de seguir projeto de terceiro e ignorado. O fluxo autenticado principal cobre login, criacao, edicao, curtir, salvar, comentar e abertura de notificacoes; notificacoes geradas por outro usuario exigem uma segunda conta e devem ser validadas manualmente ate a suite ter fixture propria.

## Variaveis de Ambiente

Crie `.env.local` a partir de `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SEU_ANON_KEY
```

Use apenas a chave anon/publica no frontend. Nunca exponha `service_role` no browser.

Sem Supabase configurado:

- `/explorar` usa projetos demo.
- `/criar-projeto` pode operar em modo local.
- `/garagem` mostra dados locais do navegador.

## Arquitetura Rapida

- `src/app`: rotas App Router, route handlers e paginas.
- `src/components`: UI de garagem, projetos, notificacoes, auth e layout.
- `src/lib/supabase`: clientes, queries, auth server-side e helpers de banco.
- `src/lib/garage`: regras de criacao/edicao de projeto e constantes automotivas.
- `src/lib/projects`: tipos, mapeadores, fallback demo/localStorage e agregacao de projetos.
- `supabase/migrations`: historico de schema/RLS. Evite alterar migrations antigas de producao.

Criacao e edicao de projetos passam por `src/lib/garage/create-car-project.ts`, usado pelos route handlers em `src/app/api/projects/*` e `src/app/api/projetos/criar`. Acoes sociais, comentarios, perfil e notificacoes ficam em `src/app/carros/actions.ts`.

## Busca Inteligente

Ponto de partida para a Sprint Produto 1:

- `/buscar` redireciona para `/explorar`, preservando query string.
- `/explorar` monta filtros com `normalizeProjectFilters` e renderiza `ProjectDiscoveryPage`.
- `src/components/projects/project-filters.tsx` e `project-search-box.tsx` controlam a UI de busca e sugestoes.
- `src/app/api/projects/search-suggestions/route.ts` fornece sugestoes com fallback demo.
- `src/lib/supabase/queries.ts` concentra `qExploreCars` e `qProjectSearchSuggestions`; a RPC `search_car_projects` ja e o ponto natural para melhorar ranking sem mexer na UI primeiro.

Para a proxima etapa, prefira evoluir ranking, sinonimos e pesos nesses pontos antes de criar uma nova arquitetura de busca.

## Auditoria npm

Depois de `npm audit fix` sem `--force`, permanece a vulnerabilidade moderada `postcss <8.5.10` trazida por `next`. O npm sugere apenas `npm audit fix --force`, que tentaria trocar para `next@9.3.3` e e uma mudanca quebradora. Nao aplicar sem decisao explicita.

## Supabase e RLS

Route handlers e Server Actions sao endpoints acessiveis por POST; cada mutacao precisa validar usuario no servidor. Use `requireSupabaseUser` e `ensureUserProfile` de `src/lib/supabase/auth-server.ts` para manter o padrao de autenticacao/perfil.

RLS deve continuar sendo a ultima barreira de seguranca no banco. Antes de mexer em migrations, prefira confirmar se o problema e de chamada, payload, permissao ou policy. Mudancas de schema em producao devem ser pequenas, documentadas e acompanhadas de validacao manual.
