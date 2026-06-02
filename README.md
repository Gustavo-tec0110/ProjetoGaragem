# Projeto Garagem MVP

Projeto Garagem agora roda como um MVP funcional de verdade:

- `/explorar` nunca depende de banco para ficar populada.
- Cards abrem uma pagina individual de projeto em `/projeto/[slug]`.
- O cadastro funciona com Supabase quando configurado.
- Sem Supabase, o projeto entra em modo demo/local e continua utilizavel.

## Stack

- Next.js 16 + App Router
- React 19 + TypeScript
- Tailwind CSS v4
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`)

## Como rodar

```bash
npm install
npm run dev
```

Windows:

```bash
npm.cmd install
npm.cmd run dev
```

Build de producao:

```bash
npm.cmd run build
```

## Scripts

- `npm run dev`: sobe o ambiente local
- `npm run build`: gera a build de producao
- `npm run lint`: roda o ESLint

## Variaveis de ambiente

Crie um arquivo `.env.local` com:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SEU_ANON_KEY
```

O frontend usa apenas a chave publica/anon. Nao use `service_role` no browser.

Se essas variaveis nao existirem:

- `/explorar` usa projetos demo
- `/carros/novo` entra em modo local
- `/garagem` mostra a garagem local do navegador

## `.env.example`

Existe um exemplo minimo em `.env.example`.

## Como o MVP decide os dados

1. Se existir Supabase configurado e houver projetos reais na tabela `cars`, o site mostra os dados reais.
2. Se o Supabase falhar ou estiver vazio, o site usa `src/lib/projects/demo-projects.ts`.
3. Se o usuario cadastrar em modo local, o projeto fica salvo em `localStorage` e abre normalmente na rota `/projeto/[slug]`.

## Schema atual usado pelo app

O MVP atual usa o schema existente do repositrio:

- `supabase/schema.sql`
- `supabase/seed.sql`

Esse schema trabalha com:

- `profiles`
- `cars`
- `car_photos`
- `car_parts`
- `car_likes`
- `car_saves`
- `car_comments`

Para subir o schema atual no Supabase SQL Editor:

1. Abra o projeto no painel do Supabase.
2. Cole o conteudo de `supabase/schema.sql`.
3. Rode o seed opcional de `supabase/seed.sql`.

## SQL sugerido para uma tabela `projects`

Se voce quiser evoluir o backend para uma tabela unica `projects`, este e um ponto de partida compativel com o briefing do MVP:

```sql
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null references auth.users(id) on delete set null,
  title text not null,
  owner_name text not null,
  car_model text not null,
  year integer not null,
  engine text not null,
  style text not null,
  description text not null,
  main_image text,
  gallery text[] not null default '{}'::text[],
  installed_parts jsonb not null default '[]'::jsonb,
  planned_parts jsonb not null default '[]'::jsonb,
  estimated_cost numeric,
  status text not null default 'Projeto ativo',
  likes integer not null default 0,
  saves integer not null default 0,
  views integer not null default 0,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_created_at on public.projects (created_at desc);
create index if not exists idx_projects_style on public.projects (style);
create index if not exists idx_projects_year on public.projects (year);
```

Observacao:

- O MVP entregue nesta pasta continua funcionando sobre `cars` porque esse schema ja existia no projeto.
- A tabela `projects` acima e uma sugestao de evolucao, nao uma dependencia obrigatoria para o build atual.

## Configurando o Supabase

1. Crie um projeto no Supabase.
2. Copie `Project URL` para `NEXT_PUBLIC_SUPABASE_URL`.
3. Copie a chave publica para `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Rode `supabase/schema.sql` no SQL Editor.
5. Se quiser dados basicos de compatibilidade, rode `supabase/seed.sql`.
6. Inicie a aplicacao com `npm.cmd run dev`.

## Rotas principais do MVP

- `/`: home com vitrine de projetos
- `/explorar`: listagem com busca, filtros e fallback demo
- `/projeto/[slug]`: pagina individual de projeto
- `/carros/novo`: cadastro com modo Supabase ou local
- `/garagem`: area do usuario ou garagem local

## Estrutura adicionada para o MVP

- `src/lib/projects/`: tipos, dados demo, mapeadores, fallback/localStorage
- `src/components/projects/`: card, grid, filtros, detalhe, formulario e estados
- `src/app/projeto/[slug]/`: rota publica nova para pagina de projeto

## Proximas features sugeridas

- mover views para RPC ou trigger dedicado no Supabase
- sincronizar likes/saves anonimos apos login
- editar projetos locais ja criados no navegador
- pagina de comentarios tambem na rota `/projeto/[slug]`
- pagina de perfil com fallback local
