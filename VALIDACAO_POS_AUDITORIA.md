# Validação pós-auditoria — Projeto Garagem

Data: 13/07/2026

Commit validado: `98a6ea4 chore: concluir auditoria tecnica do projeto`

## Resultado executivo

A validação automática não encontrou regressão funcional causada pela auditoria nos fluxos públicos executáveis. A suíte final teve **20 testes aprovados, 0 falhos e 5 ignorados**. Os 10 contratos públicos passaram tanto no Chromium desktop quanto no viewport mobile Pixel 5.

Os cinco testes autenticados foram ampliados, mas não executados porque `.env.local` não contém `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_SECOND_USER_EMAIL` ou `E2E_SECOND_USER_PASSWORD`. Também não existe `storageState` autenticado no repositório. Nenhuma credencial foi criada, inferida, registrada ou exposta.

## Fluxos testados automaticamente

### Home

- Resposta HTTP 200, heading responsivo e conteúdo principal.
- Links para criação, exploração e catálogo.
- Navegação principal desktop e bottom navigation mobile.
- Grade de projetos, quantidade de colunas, layout dos cards e ausência de overflow horizontal.

### Explorar e busca

- Abertura da página e carregamento dos resultados.
- Sugestões da busca desktop e navegação para o projeto sugerido.
- Busca mobile pelo campo específico do viewport.
- Filtro por marca e ordenação combinados com o termo de busca.
- Persistência de `q`, `brand` e `sort` na URL e nos controles.
- Estado vazio determinístico para termo sem resultados.
- Filtros avançados mobile e formulário completo desktop.

### Projeto público

- Informações principais, ficha, ações sociais e descoberta.
- Imagem hero visível, completa e com largura natural maior que zero.
- Contador/seção de comentários e comentários reais em projeto do catálogo Supabase.
- Ação social de visitante no projeto demo, incluindo o estado local de curtida.
- Layout desktop e mobile, tabs, ações, ficha técnica, navegação completa e área livre acima da bottom navigation.
- Projeto inexistente com estado adequado e sem erro 500.

### Perfil público

- Descoberta do perfil a partir de um projeto público real.
- Nome, contadores sociais e destaques da garagem.
- Listagem e navegação do perfil para um projeto.

### Autenticação e proteção pública

- Orientação de visitante em criação de projeto.
- Redirecionamento de `/garagem` para `/login` preservando `next=/garagem`.
- Estado deslogado e link contextual em `/notificacoes`.

### Integridade geral

- Monitor automático em todos os testes para `console.error`, warnings de hydration, `pageerror`, requests críticas falhas e respostas HTTP 5xx.
- Ausência de overflow nos contratos responsivos.
- Navegação sem links quebrados nos fluxos percorridos.
- Resultado final: zero erro de console, zero hydration warning, zero `pageerror`, zero request crítica falha e zero resposta 5xx.

## Testes novos e testes melhorados

- Criado `tests/e2e/fixtures.ts`, fixture automática que monitora erros de runtime e anexa diagnóstico JSON quando encontra falha.
- Configurados dois projetos Playwright: `desktop-chromium` e `mobile-chromium`.
- A suíte pública passou de 6 cenários executados em um único projeto para 10 cenários executados nos dois viewports, totalizando 20 testes públicos.
- Os loops manuais de vários viewports foram substituídos pelos projetos reais do Playwright, reduzindo estado mutável dentro do teste e tornando o resultado por viewport explícito.
- Adicionados contratos para home, links importantes, perfil público, projeto inexistente, busca sem resultados, persistência completa de filtros e monitoramento de imagem.
- Os testes existentes foram ajustados para os nomes acessíveis e controles próprios de desktop/mobile, sem adicionar `data-testid` ao produto.

## Cobertura autenticada preparada

Os cinco cenários autenticados continuam seriais e agora cobrem, quando as duas contas QA forem configuradas:

- Login, reload com sessão persistente, logout e acesso à garagem.
- Validação nativa de campo obrigatório antes da criação.
- Criação, upload, edição, persistência e exclusão do projeto de QA.
- Bloqueio da edição pelo segundo usuário.
- Curtir/descurtir, salvar/remover e seguir/deixar de seguir com incremento e retorno exato dos contadores.
- Comentário e listagem do projeto salvo na garagem.
- Notificações únicas de curtida, salvamento, follow e comentário.
- Marcação de notificação como lida e ausência de auto-notificação.
- Inspiração selecionada somente por ação explícita, exclusão do projeto próprio das opções, exibição da similaridade dentro da garagem e descarte de referência inválida.

## Testes ignorados

Cinco testes autenticados foram ignorados, todos pelo mesmo motivo exato: ausência das quatro variáveis `E2E_*` para duas contas QA confirmadas. `.env.local` possui apenas a configuração pública do Supabase; `.env.example` documenta as chaves, mas não contém valores válidos. Login Google não foi automatizado e não havia sessão salva segura para reutilizar.

## Bugs e falhas encontrados

### Produto

- Nenhuma regressão funcional pública causada pelo commit `98a6ea4` foi encontrada.
- Nenhuma correção de produto foi aplicada.

### Infraestrutura local de validação

- `next start` em `127.0.0.1` usa `NODE_ENV=production`; o helper existente de URL força o domínio Netlify em produção. Com isso, o prefetch local de rotas protegidas redireciona para o domínio publicado e gera CORS. O mesmo código já existia antes do commit auditado, portanto não é regressão da auditoria e não foi alterado. A suíte final rodou no servidor de desenvolvimento definido pelo próprio `playwright.config.ts`. Como a compilação Turbopack ficou parada neste diretório sincronizado pelo OneDrive, o web server de testes foi fixado em `next dev --webpack`, que compilou e executou a matriz de forma determinística.
- O servidor de desenvolvimento emitiu avisos de LCP recomendando `loading="eager"` para imagens hero e registrou 404 do Unsplash para uma imagem secundária do projeto demo Fusca (`photo-1502877828070-33a9c7d1b4c2`). A imagem principal validada carregou corretamente. Esses dados e a estratégia de imagem já existiam antes da auditoria; como não são regressões do commit avaliado e a alteração poderia afetar UI/performance, foram apenas documentados.

### Testes

- As primeiras execuções da nova suíte expuseram seletores que presumiam a mesma estrutura em desktop e mobile: título compacto da home, campo de busca mobile, botão de compartilhamento duplicado e nome acessível da curtida local. Os contratos foram corrigidos para usar os controles reais de cada viewport.
- Um seletor de perfil alcançava a variante responsiva oculta do card. Foi restrito ao link visível.
- A asserção de filtro ativo esperava um chip mobile no desktop. O teste desktop agora usa o valor selecionado do controle, que é o sinal autoritativo dessa interface.
- Resultado final do Playwright: nenhuma falha.

## Resultado por ambiente

- Desktop Chromium: 10 públicos aprovados; 5 autenticados ignorados.
- Mobile Chromium / Pixel 5: 10 públicos aprovados.
- Console e hydration no resultado final: nenhum erro.
- Requests críticas e respostas 5xx no resultado final: nenhuma falha.

## Validações obrigatórias

- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado; 30 páginas estáticas geradas e rotas dinâmicas compiladas.
- `npm run test:e2e`: 20 aprovados, 0 falhos, 5 ignorados.
- `npx knip --no-progress`: aprovado sem arquivos, dependências ou exports não utilizados. Não existe script `npm run knip` no projeto.
- `npm audit`: 2 vulnerabilidades moderadas transitivas em `postcss <8.5.10`, dependência interna do Next.js 16.2.6. O reparo sugerido instala `next@9.3.3`, uma mudança quebradora; não foi aplicado.

## Arquivos alterados

- `playwright.config.ts`
- `tests/e2e/fixtures.ts`
- `tests/e2e/public.spec.ts`
- `tests/e2e/authenticated.spec.ts`
- `tests/e2e/helpers.ts`
- `README.md`
- `VALIDACAO_POS_AUDITORIA.md`
