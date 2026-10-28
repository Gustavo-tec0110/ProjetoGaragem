# Cards de peças instaladas — revisão local de 28/10/2026

## Implementação

A apresentação compacta foi habilitada somente em “Modificações atuais” no `ProjectPartsShowcase`, componente real de `ProjectDetail` consumido pelas páginas públicas através de `ProjectPageContent`. O harness continua sendo uma prévia dos mesmos componentes.

- Duas colunas a partir de 1024 px, mantendo uma coluna em tablet e celular. Categorias têm títulos e contadores próprios, sem molduras extras. Quando só existe uma categoria, suas peças aproveitam as duas colunas.
- Removida a superfície externa da seção. Cada peça mantém uma única superfície grafite com borda fina. Cards sem navegação integral mantêm cursor normal e não recebem animação de card inteiro.
- Imagens de 88 px no celular e 112 px a partir de 640 px, moldura clara e `object-fit: contain`, preservando a imagem inteira. O alvo clicável da foto mantém o hover de escala 1,02 já implementado.
- Nome em destaque, indicador verde discreto, descrição sem truncamento, data e botão. Cards com e sem descrição usam altura natural, sem preenchimento artificial para igualá-los.
- “Ver componente” reutiliza `Button` e `CatalogDetails`: fundo grafite, borda definida, profundidade suave, ícone de ferramenta e seta vermelha. Hover de fundo/borda/elevação, clique com sombra interna, área mínima de 44 px, foco acessível e suporte a toque.
- Contadores com concordância: “1 item” e “2 itens”. Essa correção também se aplica às outras instâncias do contador compartilhado.
- O teste de movimento reduzido encontrou uma elevação residual no botão compartilhado; a regra de elevação agora só é habilitada com `prefers-reduced-motion: no-preference`.

## Preservação

Planos futuros, histórico, área social, catálogo, ofertas, permissões e handlers foram preservados. Nenhuma imagem aprovada, crédito, configuração de publicação ou arquivo de banco foi editado. As alterações anteriores continuam locais.

## Arquivos desta tarefa

- `src/components/projects/project-detail.tsx`
- `src/app/globals.css`
- `tests/e2e/installed-part-cards.spec.ts`
- Este relatório e capturas em `artifacts/installed-part-cards/`.

## Validação e limitações

- TypeScript aprovado (`npm run typecheck`).
- Integridade das 263 imagens aprovada: dois testes em `approved-catalog-images.test.mjs`.
- Lint direcionado aos arquivos TSX/TS desta tarefa aprovado.
- Lint geral: mesmos 39 erros anteriores de `no-undef` em scripts de `artifacts/catalog-images-2026-10-26`; não corrigidos por estarem fora de escopo.
- Seis cenários anteriores de interações sociais aprovados, cobrindo contadores locais, permissões de edição, teclado, catálogo, cópia/compartilhamento simulados, imagem com hover e toque.
- Build final aprovado (`npm run build`). Sete cenários específicos dos cards aprovados após reiniciar a prévia e corrigir o hover sob movimento reduzido; somados às seis regressões sociais, são 13 cenários distintos aprovados.
- Navegador Chromium: 1440, 1024, 768, 390 e 320 px, imagens carregadas sem cortes, dimensões, botões de pelo menos 44 px, ausência de overflow, contadores, agrupamento por categoria, acesso correto por foto e botão, teclado, retorno de foco, hover, movimento reduzido e toque.
- A prévia local foi reiniciada mantendo as flags de harness/demonstração, pois a instância anterior estava servindo CSS antigo.
- Não foram testadas gravações remotas ou contas reais. Este ajuste é de apresentação.

## Revisão visual

- http://127.0.0.1:3101/test-harness/project-overview
- http://127.0.0.1:3101/test-harness/project-overview?owner=1
- Capturas: `artifacts/installed-part-cards/section-{largura}.png`.

Nenhum git add, commit, push, pull request, deploy ou alteração em produção foi realizado. Todas as alterações anteriores e atuais permanecem exclusivamente locais.
