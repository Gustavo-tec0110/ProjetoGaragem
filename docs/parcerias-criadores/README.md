# Criadores Fundadores — Projeto Garagem

Landing publicada em `https://projetogaragem.com.br/parcerias/criadores`, após autorização do fundador para publicar no GitHub e na Netlify. Commit de produção: `735af931c552d72e3099df7ba90e87df485b8adb`. Evidências em `publicacao.json` e detalhes em `publicacao.md`.

## Implementação

- `src/app/parcerias/criadores/page.tsx`: conteúdo, selo com a logo oficial, contato por e-mail e metadados próprios.
- `src/app/parcerias/criadores/page.module.css`: composição editorial, responsividade, foco visível e redução de movimento, com estilos isolados.
- `src/app/parcerias/criadores/merch-showcase.tsx`: vitrine de produtos e merch com coleção, quatro estudos de camisetas e links para ampliar as imagens.
- `src/app/parcerias/criadores/profile-preview.tsx`: exemplo visual de perfil com banner, foto circular e badge Criador Fundador junto ao nome, dentro da seção de identidade.
- `public/partnerships/creators/`: cinco imagens fornecidas pelo fundador, otimizadas para WebP sem recortes ou alterações de composição; aproximadamente 90–92% menores que os anexos PNG.
- `src/app/parcerias/criadores/creators.ts`: dados e autorização para a futura seção de criadores parceiros.
- `src/components/site/site-chrome.tsx`: mantém o shell existente nas demais rotas e oferece apresentação independente somente na URL do convite.
- `src/app/layout.tsx`: utiliza o invólucro `SiteChrome`.
- `next.config.ts`: adiciona `X-Robots-Tag: noindex, nofollow, noarchive` exclusivamente à nova rota.
- `tests/e2e/creator-partnership-public.spec.ts`: verificações de acesso, conteúdo, indexação, responsividade, movimento reduzido e retorno à navegação normal.

Não foram adicionadas dependências, imagens genéricas, formulários ou serviços externos. O selo utiliza `src/app/icon.png`, sem redesenhar a logo. O contato é `parcerias@projetogaragem.com.br`; nenhum WhatsApp oficial configurado foi encontrado.

A página também apresenta ideias de colaboração, uma proposta de primeiros passos e quatro dúvidas frequentes com abertura nativa por clique e teclado. A vitrine é ilustrativa: não possui preços, carrinho ou fluxo de compra, nem apresenta os produtos como benefícios garantidos.

O aviso **Futuras parcerias**, antes das imagens da vitrine, reforça que os produtos são conceitos e que produção, disponibilidade e envio dependem da evolução do projeto e dos acordos com cada criador.

A prévia do perfil usa os placeholders “Seu nome” e “@seuperfil”, sem links, métricas ou parceria inventada. A foto é ilustrativa, gerada com a ferramenta built-in `image_gen`, e o banner reutiliza uma imagem existente do projeto. Caminho do asset e prompt registrados em `avatar-generation.md`.

## Acesso e indexação

A página é pública, sem autenticação. Não é uma página secreta ou protegida: qualquer pessoa com a URL pode acessá-la e compartilhá-la.

Há `noindex, nofollow` nos metadados de robots e Googlebot, além do cabeçalho HTTP. A canonical aponta para a própria página. Nenhum link foi adicionado à navegação ou a outras páginas, e a URL permanece fora do sitemap. `robots.txt` continua permitindo a leitura da página para que os mecanismos de busca possam encontrar o `noindex`.

## Ativar os criadores parceiros

Preencher `foundingCreators` em `src/app/parcerias/criadores/creators.ts` somente com criadores reais e confirmados. Cada entrada possui:

- `name`: nome autorizado para exibição.
- `handle`: identificação na rede social.
- `photo`: caminho de uma foto local autorizada, dentro de `public/`.
- `profileUrl`: URL validada do perfil do criador.
- `publicationAuthorized`: definir como `true` somente após a autorização de publicação.

A seção aparece automaticamente quando existem **três** entradas autorizadas. Com a lista vazia ou abaixo desse limite, não há seção, fotos, nomes, placeholders ou cartões de parceiros na interface.

## Evidências visuais

- `desktop.png`: página completa em 1440 px.
- `desktop-hero.png`: primeira tela em desktop.
- `mobile.png`: página completa em 390 px.
- `mobile-hero.png`: primeira tela em celular.
- `merch-desktop.png` e `merch-mobile.png`: área completa de produtos e merch.
- `merch-preview.png`: prévia da nova vitrine em desktop.
- `collaboration-desktop.png`: ideias de colaboração e primeiros passos.
- `faq-mobile.png`: dúvidas frequentes em celular.
- `perfil-exemplo-desktop.png` e `perfil-exemplo-mobile.png`: prévia de perfil com foto, banner e badge.
- `selo-e-perfil-desktop.png`: seção completa de identidade com a prévia integrada.

Os benefícios atuais e as possibilidades futuras são apresentados separadamente. Produtos, pagamentos e ações futuras dependem da evolução do projeto e de acordos específicos.

## Validações realizadas

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado com Next.js 16.3.3; a nova rota foi pré-renderizada como conteúdo estático.
- ESLint dos arquivos TS/TSX desta entrega: aprovado.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/creator-partnership-public.spec.ts --workers=1`: **15 aprovados, 1 ignorado**, contra o build de produção local. A verificação de quatro larguras é executada no projeto desktop e ignorada na repetição mobile; os demais fluxos rodam nos dois projetos. Inclui carregamento real das cinco imagens, links de ampliação e FAQ por mouse, Espaço e Enter.
- Inspeção visual de desktop e celular: concluída, com capturas do build de produção.
- Verificação adicional de `/login`, `/register` e `/explorar`: HTTP 200, shell esperado e nenhum link para a página de parcerias.
- Larguras 320, 390, 768 e 1440 px: nenhum overflow horizontal ou elemento visível fora da área da página. O FAQ também foi verificado com todas as respostas abertas em 320 px. O espaço inferior reservado à navegação global foi removido somente nesta landing. Evidência em `visual-check.json`.
- `git diff --check`: aprovado.

Após a inclusão da prévia de perfil, build com TypeScript e lint dos componentes alterados aprovados. Os testes existentes de acesso anônimo, responsividade e movimento reduzido foram repetidos: **5 aprovados e 1 repetição mobile ignorada**. A prévia também foi inspecionada em 320, 390, 768 e 1440 px, com carregamento confirmado das duas imagens e selo visível, sem overflow. Evidência em `profile-check.json`. Não houve alterações em perfis reais ou no banco de dados.

O `npm run lint` geral reportou **52 erros preexistentes**, fora dos arquivos desta entrega: scripts `.cjs` em `docs/evidencias-performance-2026-10-12/` e símbolos não utilizados em `project-discovery-page.tsx`, `project-modifications.tsx` e `project-rankings-board.tsx`. Esses arquivos foram preservados.

Não foram executados testes de login com credenciais reais ou operações no banco de dados, pois a página não utiliza autenticação nem persistência. O fluxo de retorno à home, os menus e o banner de cookies existentes foram verificados nos testes de navegação.
