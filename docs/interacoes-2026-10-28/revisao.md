# Refinamento de interações — revisão local, 28/10/2026

## Resultado

Os componentes reais de detalhes dos projetos, utilizados por `ProjectPageContent` na rota `/projeto/[slug]`, receberam os mesmos ajustes disponíveis na prévia local.

- Fotos clicáveis de componentes no catálogo, peças instaladas e modificações: escala 1,02, transição de 200 ms, contorno vermelho sutil e sombra. O efeito e o cursor ficam no alvo que efetivamente abre os detalhes; registros sem vínculo continuam sem aparência de botão.
- Peças vinculadas na ficha: ação explícita “Ver componente”, também acessível por teclado.
- Botão compartilhado: cursor, borda, sombra, toque e foco consistentes. Controles neutros continuam neutros; seleção social recebe fundo e borda vermelhos suaves, `aria-pressed` e preenchimento de curtir/salvar.
- Área social: uma única árvore responsiva, com Seguir/Curtir/Salvar/Compartilhar, divisor discreto, Copiar link/Comparar e Editar ficha/Evolução. Altura de 44 px e contadores separados visualmente. Colunas respondem à largura real disponível usando container query. As ações secundárias ficam visíveis também no celular.
- Handlers, atualização otimista, contadores, login e condição de permissão de edição foram preservados.
- Movimento reduzido desativa transformações e transições dos controles ajustados, preservando feedback por cor e contorno.

## Arquivos desta tarefa

- `src/app/globals.css`
- `src/components/ui/button.tsx`
- `src/components/projects/project-social-actions.tsx`
- `src/components/projects/project-detail.tsx`
- `src/components/projects/project-modifications.tsx`
- `src/components/projects/catalog-picker.tsx`
- `tests/e2e/project-interactions.spec.ts`
- Este relatório e capturas locais de validação.

## Validação

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado; somente compilação local.
- `npm run test:unit`: 51 aprovados, incluindo integridade das 263 imagens, projeção da ficha e ofertas.
- ESLint direcionado aos cinco arquivos TS/TSX alterados e ao novo teste: aprovado.
- `npm run lint`: 39 erros anteriores de `no-undef` em quatro scripts de `artifacts/catalog-images-2026-10-26` (activate-catalog-images, rollback-catalog-images, stage-approved, version-static-assets). Não corrigidos por estarem fora do escopo.
- Playwright: 13 cenários aprovados (5 de ficha, 6 de interações e 2 de regressão do seletor). O cenário de movimento/toque foi reexecutado após corrigir expectativas do teste para a matriz identidade do Chromium e a mudança do nome acessível de Curtir para Curtido. Cobertura local de 1440, 1024, 768, 390 e 320 px, alvos de 44 px, ausência de overflow, permissões, curtidas/salvos persistentes, cópia/compartilhamento com APIs simuladas, abertura de detalhes por teclado, retorno de foco, hover 1,02, reduced motion e contexto com toque. Regressões adicionais da ficha e do seletor do catálogo.
- Imagens de revisão: `artifacts/project-interactions/actions-{largura}.png`. A suíte anterior da ficha também gera capturas em `docs/garagem-afiliados-2026-10-27/`.

## Limitações anteriores preservadas

- Seguir no modo local não altera estado: o handler só realiza essa operação em modo Supabase autenticado. Não foi implementada uma simulação de seguir nesta tarefa.
- Não foram executados testes autenticados que gravam em contas ou projetos reais. A validação não certifica o fluxo remoto de seguir nem o compartilhamento pelo seletor nativo do sistema; as APIs de navegador foram simuladas para verificar os handlers locais sem enviar dados.
- O hook existente de copiar link confirma a ação mesmo se a Clipboard API estiver ausente. Sua lógica não foi alterada.
- Nenhum ajuste em banco, integrações de afiliados, imagens aprovadas ou configuração de publicação foi realizado nesta tarefa.

## Prévia

- Proprietário: http://127.0.0.1:3101/test-harness/project-overview?owner=1
- Visitante: http://127.0.0.1:3101/test-harness/project-overview
- Editor do catálogo: http://127.0.0.1:3101/test-harness/catalog-details

As prévias dependem do servidor de desenvolvimento com o harness habilitado. Não fazem parte de uma publicação.

Nenhum git add, commit, push, pull request, deploy ou alteração em produção foi realizado. Todas as alterações anteriores e atuais permanecem exclusivamente locais.
