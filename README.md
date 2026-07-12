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

Fluxos autenticados reais exigem duas contas de QA no Supabase, ambas com email confirmado:

```bash
set E2E_USER_EMAIL=usuario-de-teste@example.com
set E2E_USER_PASSWORD=senha
set E2E_SECOND_USER_EMAIL=segundo-usuario-de-teste@example.com
set E2E_SECOND_USER_PASSWORD=senha
npm run test:e2e
```

Essas variaveis tambem podem ficar no `.env.local`; o Playwright carrega esse arquivo antes de iniciar os testes. Use apenas contas dedicadas de QA, nunca usuarios reais.

Sem as quatro variaveis `E2E_*`, a suite autenticada e ignorada com mensagem explicita no reporter; os testes publicos continuam rodando. Com as duas contas, a suite cobre login, logout, garagem, criacao/edicao do proprio projeto, bloqueio de edicao de outro usuario, upload de imagem, curtir/descurtir, salvar/remover, comentar, seguir/deixar de seguir usuario, seguir/deixar de seguir projeto, notificacoes entre contas, ausencia de notificacao de acao propria, contadores sociais e visualizacao publica. Os dados criados usam prefixo `E2E QA` e sao removidos pela propria conta de QA no final do fluxo quando a UI permite.

## Variaveis de Ambiente

Crie `.env.local` a partir de `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SEU_ANON_KEY
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

Use apenas a URL real do projeto e a chave anon/publica no frontend. Nunca exponha `service_role` no browser. Valores vazios ou placeholders do `.env.example` deixam o Supabase explicitamente desconfigurado e ativam apenas os fallbacks demo/local.

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

A busca publica vive em `/explorar`; `/buscar` apenas redireciona preservando a query string.

- `src/components/projects/project-search-box.tsx` controla o input com debounce e sugestoes.
- `src/app/api/projects/search-suggestions/route.ts` retorna sugestoes de projetos/termos com fallback demo.
- `src/components/projects/project-filters.tsx` expoe filtros por marca, modelo, ano, combustivel, aspirado/turbo, tracao, categoria, motor, tag e ordenacao.
- `src/lib/projects/utils.ts` normaliza filtros e aplica ranking simples: correspondencia exata, inicio de palavra, parcial e popularidade.
- `src/lib/supabase/queries.ts` concentra `qExploreCars` e `qProjectSearchSuggestions`, reaproveitando a RPC existente quando ha busca no Supabase.

Para adicionar um filtro novo, inclua o campo em `ProjectFilters`, normalize em `normalizeProjectFilters`, aplique no `filterProjects`/`qExploreCars` e exponha o controle em `project-filters.tsx`. Evite novas migrations enquanto o filtro puder ser derivado dos campos de `cars`.

## Auditoria npm

Depois de `npm audit fix` sem `--force`, permanece a vulnerabilidade moderada `postcss <8.5.10` trazida por `next`. O npm sugere apenas `npm audit fix --force`, que tentaria trocar para `next@9.3.3` e e uma mudanca quebradora. Nao aplicar sem decisao explicita.

## Supabase e RLS

Route handlers e Server Actions sao endpoints acessiveis por POST; cada mutacao precisa validar usuario no servidor. Use `requireSupabaseUser` e `ensureUserProfile` de `src/lib/supabase/auth-server.ts` para manter o padrao de autenticacao/perfil.

RLS deve continuar sendo a ultima barreira de seguranca no banco. Antes de mexer em migrations, prefira confirmar se o problema e de chamada, payload, permissao ou policy. Mudancas de schema em producao devem ser pequenas, documentadas e acompanhadas de validacao manual.
