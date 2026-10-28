# Peças instaladas — refinamento pela referência aprovada

Referência visual: imagem local “Dashboard automotivo em tema escuro.png”, fornecida pelo usuário. Ajuste restrito à apresentação compacta de “Modificações atuais”, no componente real `ProjectPartsShowcase` de `ProjectDetail`, consumido pelas páginas públicas via `ProjectPageContent`.

## Resultado

- Removido o grid de duas categorias lado a lado da rodada anterior. As categorias e os cards ocupam uma única coluna.
- A partir de 640 px, cada card usa foto à esquerda, informações centrais e botão à direita. No celular, foto, informações e botão se empilham.
- Fotos inteiras de 100 px no desktop e 96 px nas demais larguras, sem troca de assets, com fundo claro e moldura discreta.
- Fundo preto/grafite, uma borda fina por card e detalhe vermelho de 2 px à esquerda. Sem decoração adicional, brilho ou sombra vermelha.
- Indicador verde, nome, descrição opcional e data preservados. Título de 14–16 px, espaçamento entre categorias de 18 px e padding de 14–16 px. Não se aplica escala uniforme à interface.
- “Ver componente” mantém o mesmo catálogo associado, com fundo grafite, borda vermelha fina, ícone de link e seta. Altura de 44 px para toque, feedback de pressionar, hover discreto, foco e movimento reduzido preservados.
- Planos futuros, histórico, área social, permissões e ofertas mantêm sua implementação. Não foram alterados textos ou dados das peças.

## Arquivos

- `src/components/projects/project-detail.tsx`
- `src/app/globals.css`
- `tests/e2e/installed-part-cards.spec.ts`
- Este relatório e novas capturas em `artifacts/installed-part-cards-reference/` (as capturas da rodada anterior foram preservadas).

## Validação

- `npm run typecheck`: aprovado.
- ESLint direcionado ao componente e ao teste atualizado: aprovado.
- `git diff --check`: aprovado.
- Dois testes de integridade das 263 imagens aprovados; imagens e créditos não editados.
- `npm run build`: aprovado.
- Sete cenários de navegador aprovados na execução final, com CSS atualizado.
- Testes de navegador atualizados para a nova composição: cinco larguras (1440, 1024, 768, 390 e 320 px), disposição horizontal/vertical, imagem inteira e dimensões, estado e data, contadores, ausência de overflow, abertura do mesmo componente por foto e botão, teclado, retorno de foco, hover, movimento reduzido e toque.
- A primeira execução encontrou CSS antigo na prévia local. O servidor foi reiniciado com as mesmas flags de harness e demonstração; a validação final usa a nova instância.
- Os 39 erros gerais de lint em scripts antigos de `artifacts/catalog-images-2026-10-26` já estavam documentados na rodada anterior; esses scripts não foram editados nesta tarefa.
- Nenhum teste com gravação em contas reais ou produção foi executado.

## Prévia local

- http://127.0.0.1:3101/test-harness/project-overview
- http://127.0.0.1:3101/test-harness/project-overview?owner=1

Nenhum git add, commit, push, pull request, deploy ou alteração em produção foi realizado. Todas as alterações anteriores e atuais permanecem exclusivamente locais.
