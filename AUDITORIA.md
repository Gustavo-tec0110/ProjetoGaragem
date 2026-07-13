# Auditoria técnica — Projeto Garagem

Data: 13/07/2026

Escopo: aplicação Next.js, componentes, hooks, rotas, Server Actions, Supabase, tipos, queries, autenticação, imagens, cache, testes, dependências e organização do repositório.

## Resumo executivo

O projeto já partia de uma base funcional: lint, typecheck e build passavam antes da auditoria, o App Router segue as convenções do Next.js 16.2.6 e as mutações sensíveis validam usuário no servidor e contam com RLS no Supabase.

A maior dívida encontrada estava em código legado sem consumidores, APIs internas exportadas sem necessidade, duplicação nos fluxos sociais/auth/Supabase e consultas independentes executadas em série. A limpeza removeu mais de 2.000 linhas sem alterar páginas, layout, UI ou regras de negócio.

## O que foi analisado

- Todas as rotas, páginas, route handlers, Server Actions e arquivos especiais do App Router.
- Componentes de autenticação, garagem, projetos, notificações, site e UI.
- Hooks/efeitos, timers, listeners, localStorage/sessionStorage e cancelamento de operações assíncronas.
- Camadas `src/lib/garage`, `src/lib/projects`, `src/lib/supabase`, helpers, mapeadores e tipos.
- Configuração de imagens, metadata, cache/revalidação, proxy e autenticação Supabase SSR/browser.
- Schema, seed e histórico de migrations do Supabase, com atenção a RLS, `security definer` e `search_path`.
- Imports, exports, dependências npm, arquivos públicos, código morto e aliases de compatibilidade.
- README, scripts, configuração do Playwright, ESLint e TypeScript.
- Guias locais desta versão do Next.js em `node_modules/next/dist/docs`, especialmente App Router, Server/Client Components, data fetching, mutações, cache, imagens, route handlers, Proxy, autenticação, segurança e checklist de produção.

## Achados corrigidos

### Código morto e superfície pública

- Removidos 12 módulos sem consumidores: componentes antigos de ranking, social, ticker, peças e referências visuais; `Separator`; utilitário de preços; cliente/hook/tipos/parsers Supabase redundantes.
- Removidos helpers e aliases nunca chamados, incluindo `getRecommendationScore`, `qCarsLite`, `qRankingCars`, `getCarById`, `getPerfilUsuario`, `getCarrosDoUsuario`, `getLocalProjectBySlug` e `buildLegacyProjectHref`.
- Removido o componente `CarCard` não utilizado; `CarGrid` foi preservado.
- Funções e tipos usados apenas dentro do próprio módulo deixaram de ser exportados. Isso reduz acoplamento acidental e deixa explícita a API real de cada arquivo.
- Removidos 12 assets sem referência: arquivos padrão do template Next.js, imagem solta da raiz e imagens usadas somente pelos componentes de referência removidos.

### Dependências e scripts

- Removidas dependências sem imports: `@radix-ui/react-separator`, `@radix-ui/react-tabs`, `@supabase/auth-helpers-nextjs`, `framer-motion`, `uuid` e `zustand`.
- Declaradas diretamente as dependências realmente usadas `@next/env` e `server-only`, evitando depender de instalações transitivas.
- Padronizado `npm start` para executar `next start`; removido o script redundante `start:prod` e atualizado o README.
- Corrigido import React desnecessário em `profile-form.tsx`.

### Autenticação e Supabase

- Unificada em `src/lib/auth/redirect.ts` a proteção contra open redirect que existia em três lugares.
- Unificada em `src/lib/auth/user.ts` a leitura de nome e avatar do metadata do Supabase, antes repetida no provider, callback e preparação de perfil.
- Eliminado o segundo cliente Supabase de navegador. Recuperação de senha, reset, provider e uploads agora reutilizam `getSupabaseBrowserClient`.
- Simplificado o contexto de autenticação: removidos `session`, `isLoading` e `signIn`, que não tinham consumidores. O estado público preservado contém apenas o que a aplicação usa.
- Mantidos `getUser()` no servidor, validação de propriedade nas mutações e RLS como barreira final.

### Actions, queries e cache

- Curtir, salvar e seguir projeto compartilhavam quase o mesmo fluxo em centenas de linhas. Foram unificados em uma única rotina interna com autenticação, busca do projeto, mutação, verificação pós-mudança, notificação, contadores e revalidação.
- Consultas de carros salvos, curtidos e seguidos foram unificadas sem mudar a ordenação específica dos salvos.
- Revalidações repetidas de criação/edição foram centralizadas e slugs duplicados agora são deduplicados.
- A hidratação de cards fazia perfil, peças, despesas e atualizações em sequência. As consultas independentes agora rodam em paralelo, seguidas apenas pela consulta que depende do usuário atual.
- O detalhe de projeto agora busca hidratação, fotos, peças, comentários, atualizações e despesas em paralelo; apenas a hidratação de autores de comentários permanece como segunda etapa dependente.
- O cliente Supabase de queries passou a usar explicitamente `SupabaseClient<Database>` em vez do genérico sem schema.

### Hooks, efeitos e possíveis leaks

- Criado `useCopyCurrentUrl` para unificar feedback de cópia em dois componentes e cancelar o timer ao desmontar.
- A consulta de alertas e a atualização de visualizações ignoram respostas depois da desmontagem do detalhe do projeto.
- O sino de notificações cancela requests anteriores, aborta no cleanup e evita polling enquanto a aba está oculta.
- Listeners existentes de autenticação, storage, foco e visibilidade já possuíam cleanup adequado e foram preservados.

### Organização e documentação

- Removido comentário obsoleto ligado ao score de recomendação legado.
- README atualizado para refletir o script de produção e o resultado real do `npm audit`.
- Aliases de rotas antigas (`/builds`, `/carros`, `/dashboard`, `/profile`, `/buscar` etc.) foram deliberadamente preservados: são redirects pequenos e seguros que evitam quebrar links existentes.
- Migrations antigas não foram reescritas, pois formam histórico potencialmente aplicado em produção.

## Itens removidos

### Código

- `src/components/community/weekly-ranking-grid.tsx`
- `src/components/garage/car-social-actions.tsx`
- `src/components/motion/number-ticker.tsx`
- `src/components/projects/project-parts.tsx`
- `src/components/reference/ref-home-left.tsx`
- `src/components/reference/ref-home-right.tsx`
- `src/components/ui/separator.tsx`
- `src/lib/pricing.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/db-parse.ts`
- `src/lib/supabase/db-types.ts`
- `src/lib/supabase/use-user.ts`

### Assets

- `ProjetoGaragem_logo_menos_1MB.jpg`
- `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`
- `public/ref/car-black.jpg`, `public/ref/car-white.jpg`
- `public/ref/part-coilovers.jpg`, `public/ref/part-exhaust.jpg`, `public/ref/part-sub.jpg`, `public/ref/part-tip.jpg`

## Pontos que ainda merecem atenção

Estes itens não foram alterados porque exigem decisão de produto, mudança de schema, cobertura adicional ou têm risco de modificar comportamento/UI:

1. **Componentes grandes.** `car-form.tsx` (~1.980 linhas), `project-detail.tsx` (~1.060), `project-rankings-board.tsx` (~685) e `inspiration-planner.tsx` (~477) devem ser divididos por seção em uma etapa própria, acompanhada de testes visuais/componentes. Uma extração ampla durante esta auditoria poderia alterar layout e estados do formulário.
2. **Atualização não transacional.** Criação/edição salva `cars` e depois substitui fotos, peças, timeline e despesas com pares delete/insert. Uma falha intermediária pode deixar dados parcialmente atualizados. A correção robusta requer RPC/função transacional no Postgres e uma migration nova.
3. **Tipos Supabase manuais.** `src/lib/types.ts` contém ao mesmo tempo tipos de domínio e o schema `Database` escrito manualmente. Gerar tipos a partir do projeto Supabase e separar domínio de persistência reduziria risco de drift, mas depende de acesso/estado do banco remoto.
4. **Snapshot SQL acumulado.** `supabase/schema.sql` contém blocos de reconciliação posteriores e redefinições de funções/policies. O estado final é intencional, mas o snapshot deveria ser regenerado de um banco limpo/atual. As migrations históricas devem continuar imutáveis.
5. **Atomicidade de notificações em massa.** A notificação de seguidores usa `Promise.all`; em projetos com muitos seguidores será necessário batch/fila e rate limiting.
6. **Validação distribuída.** Formulários e actions usam validação manual consistente, porém espalhada. Um schema compartilhado só deve ser introduzido com testes que congelem as regras atuais para evitar mudança silenciosa de negócio.
7. **Privacidade por RLS.** A busca por slug não adiciona sempre `is_public = true` na query e depende da policy `cars_read_public_or_owner`. Isso é válido, mas merece teste de integração recorrente contra o Supabase real.
8. **Imagens remotas amplas.** `next.config.ts` aceita qualquer hostname HTTPS para suportar URLs externas e Storage. Restringir aos hosts realmente usados melhora segurança/controle, mas hoje quebraria o fallback livre por URL.
9. **Vulnerabilidade transitiva sem correção segura.** `npm audit` reporta duas entradas moderadas referentes ao `postcss <8.5.10` dentro do Next.js. O reparo sugerido pelo npm faz downgrade quebrador para Next 9.3.3 e não foi aplicado.
10. **E2E autenticado.** A suíte completa depende de duas contas QA via `E2E_*`. Sem essas credenciais, apenas a navegação pública pode ser validada localmente.

## Validações

- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado.
- TypeScript com `noUnusedLocals` e `noUnusedParameters`: aprovado.
- `knip`: aprovado, sem arquivos, dependências ou exports não utilizados.
- `npm run build`: aprovado.
- `npm run test:e2e`: 6 testes públicos aprovados; 5 testes autenticados ignorados por ausência das contas QA `E2E_*`. O web server automático expirou na primeira tentativa, então a suíte foi repetida com sucesso contra a build de produção iniciada separadamente.
