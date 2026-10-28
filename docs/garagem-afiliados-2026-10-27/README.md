# Minha Garagem e afiliados — revisão exclusivamente local

Trabalho iniciado em 27/10 e continuado em 28/10/2026. Nenhum commit, staging, push, PR, deploy, pipeline ou migração remota foi executado. O build é local. A publicação continua dependendo de autorização separada.

## Minha Garagem

- Peças e modificações instaladas aparecem logo após a navegação, antes dos indicadores sociais e do aviso de completar a ficha.
- A ficha principal agora inclui `project_modifications` vinculadas ao catálogo, além das peças legadas de `car_parts`. A leitura anterior da ficha principal incluía apenas `car_parts`.
- Cada registro vinculado usa o componente real do catálogo, a foto do projeto quando houver e a imagem aprovada como alternativa. A foto abre o mesmo modal de detalhes já usado no catálogo, incluindo Onde comprar.
- Dados técnicos agrupados em Identificação, Mecânica, Desempenho e Projeto. Campos não informados ficam recolhidos; planos e wishlist aparecem mais abaixo, e peças removidas ficam em histórico recolhível.
- Consultas de ofertas continuam sob demanda, com reaproveitamento de leituras simultâneas. A visão geral consulta apenas os IDs do catálogo vinculados ao projeto, e projetos sem modificações não consultam o catálogo completo. Alertas da build são consultados quando o bloco é aberto.
- Edição e exclusão continuam no gerenciador existente; o proprietário tem o atalho Gerenciar modificações. Visitantes têm Ver todas as modificações. A autenticação e as permissões atuais não foram alteradas.
- Visitantes usam a RPC pública existente; anotações privadas e caminhos de Storage não são copiados para a ficha. Valores pagos respeitam a projeção pública existente, e os valores visíveis ao proprietário não se transformam em preços de loja.
- Falha de leitura do catálogo mostra aviso e preserva a ficha e as peças legadas. Não há associação automática por semelhança de nome. Registros legados independentes são preservados, mesmo quando o proprietário cadastrou nomes parecidos nos dois sistemas.

## Afiliados

Reutiliza a tabela e a rota de leitura locais existentes. Suporta várias ofertas por componente, Mercado Livre, Shopee, Amazon e Magazine Luiza. AliExpress fica para uma futura integração.

Gestão local por `npm run offers`: busca de componentes, modelo de JSON, cadastro, atualização, revisão, ativação, desativação, validação e exportação de SQL. Não existe endpoint público de administração. Nenhuma chave privilegiada é necessária para preparar os dados.

Oferta ativa exige revisão manual do anúncio e aplicação, além de URL HTTPS da loja correta. O link é fornecido pelo operador a partir do programa oficial: o sistema não inventa produtos, tags de afiliado ou credenciais. Alterações desativam a oferta e exigem nova revisão. O nome exato do produto e a aplicação são mostrados para ajudar o visitante a avaliar a oferta. Links de afiliado recebem identificação, aviso de comissão e `rel="sponsored noopener noreferrer"`.

Preço opcional em BRL, acompanhado da data de consulta e exibido somente durante 24 horas. Estimativas do catálogo não alimentam ofertas. Sem dados confiáveis, exibe apenas a loja e o link; sem ofertas, mostra estado vazio. Falhas de consulta têm tentativa novamente.

O cadastro inicial está vazio: faltam links reais gerados nas contas do usuário e revisão de aplicação. Não foi publicado ou inserido anúncio comercial fictício. A demonstração preexistente ficou restrita a prévias explicitamente solicitadas em desenvolvimento. As flags de demonstração e arquivo local não habilitam esses modos em produção.

A migração nova adiciona campos e suporte ao Magalu, mantendo registros existentes e RLS. Não há atualização de produção. A interface `OfficialOfferProvider` e os campos de origem preparam futuras conexões oficiais; nenhum adapter ou sincronização foi implementado sem acesso às plataformas.

[Guia de operação e configuração](./ofertas-operacao.md)

## Prévias

Servidor de desenvolvimento existente: `http://127.0.0.1:3101`.

- `/test-harness/project-overview?owner=1`: ficha com visão de proprietário, dados de demonstração local.
- `/test-harness/project-overview`: visão de visitante.
- `/test-harness/project-overview?empty=1`: estado vazio.
- `/test-harness/project-overview?empty=1&unavailable=1`: indisponibilidade do catálogo.
- `/test-harness/catalog`: catálogo completo e gerenciador existente.
- `/test-harness/catalog-details`: demonstração isolada das opções de compra.

Essas prévias não são projetos gravados no Supabase. A nova prévia da ficha exige desenvolvimento e flag de teste. Para rever um projeto real existente, use `/projeto/SLUG` e `/projeto/SLUG/modificacoes` no mesmo servidor local, com as permissões de sua conta.

## Arquivos desta tarefa

Arquivos anteriores estendidos, preservando o trabalho local existente:

- `package.json`
- `supabase/bootstrap.sql`
- `src/components/projects/project-detail.tsx`
- `src/components/projects/project-page-content.tsx`
- `src/components/projects/catalog-details.tsx`
- `src/lib/projects/types.ts`
- `src/lib/modifications/server.ts`
- `src/lib/modifications/offers.ts`
- `src/app/api/catalog/[id]/offers/route.ts`
- `scripts/test-catalog-offers-migration.mjs`
- `tests/unit/catalog-offers.test.mjs`
- `tests/e2e/catalog-details.spec.ts`
- `tests/e2e/catalog-expansion.spec.ts`

Arquivos novos:

- `data/catalog-offers.local.json`
- `scripts/manage-catalog-offers.mjs`
- `src/lib/modifications/local-offers.ts`
- `src/lib/modifications/project-overview.ts`
- `src/app/test-harness/project-overview/page.tsx`
- `supabase/migrations/20261028010000_reviewed_catalog_offers.sql`
- `tests/unit/managed-catalog-offers.test.mjs`
- `tests/unit/project-modification-overview.test.mjs`
- `tests/unit/catalog-offers-api.test.mjs`
- `tests/e2e/garage-overview.spec.ts`
- Evidências e documentação nesta pasta.

## Limitações e pendências

1. Fornecer links reais, comprovar conta/programa de afiliação, conferir aplicações e ativar ofertas individualmente. A revisão manual não é verificação automática de estoque ou compatibilidade.
2. A migração e eventuais ofertas exportadas precisam de aprovação manual antes de aplicação em qualquer banco remoto.
3. APIs oficiais dependem de acesso autorizado, credenciais e validação das regras de cada plataforma. Nenhuma conexão foi simulada como se estivesse ativa.
4. Os fluxos autenticados completos com escrita no Supabase remoto não foram executados, respeitando a restrição de produção. Cadastro/edição/exclusão foram cobertos pelas suites locais existentes com doubles e pelo banco PostgreSQL descartável; as interfaces foram exercitadas nas prévias.
5. O lint global encontra 39 erros preexistentes de globais Node não declaradas nos scripts de `artifacts/catalog-images-2026-10-26/` (`activate-catalog-images.mjs`, `rollback-catalog-images.mjs`, `stage-approved.mjs`, `version-static-assets.mjs`). Esses scripts anteriores não foram alterados. O lint do código da aplicação e dos testes é validado separadamente.

## Resultados finais de validação

| Validação | Resultado |
|---|---|
| Testes unitários | 51 passaram, zero falhas (`unit-verified.log`) |
| Navegador Chromium | 23 passaram, zero falhas; 1440, 768, 390 e 360 px (`e2e-verified.log`) |
| TypeScript | Passou (`typecheck-final.log`) |
| Build otimizado final | Passou, com Supabase desconfigurado para impedir contato remoto (`build-final.log`) |
| Execução local do build de produção | Passou: flags de demonstração/local ignoradas, prévias 404, escrita pública 405 (`production-smoke.json`) |
| SQL | Passou: regras do backend, replay de 47 migrações, expansão do catálogo e CRUD de ofertas; somente PostgreSQL/WASM descartável (`sql-final.log`) |
| Lint de aplicação, scripts atuais e testes | Zero erros e avisos (`lint-code-final.log`) |
| Lint de arquivos históricos | 39 erros anteriores, documentados sem alterar os scripts (`lint-preexisting-artifacts.log`) |
| Imagens aprovadas via HTTP local | 263 originais e 263 variantes otimizadas válidas (`approved-delivery.json`) |
| Integridade dos arquivos de imagem/créditos | 465 SHA-256 idênticos; nenhum arquivo ausente ou alterado (`integrity.json`) |
| Trabalho local anterior fora dos arquivos editados | Sete arquivos com diff exatamente igual ao ponto de partida (`preexisting-changes-preserved.json`) |
| Publicação | HEAD igual ao inicial, nada staged; nenhuma ação de publicação ou escrita remota |

As rodadas intermediárias estão preservadas nos logs. Foram corrigidos seletores/mocks que não acompanhavam os detalhes do catálogo; uma rodada de screenshots foi interrompida após limite de tempo sob carga. A rodada final passou completa com um worker e limite de 120 segundos por teste. Os screenshots em `desktop.png`, `tablet.png`, `mobile.png` e `compact.png` foram inspecionados visualmente; as capturas de detalhes da rodada final estão em `catalog-details/`.

O servidor temporário de produção em 3108 foi encerrado após a validação. O servidor de desenvolvimento já existente em 3101 foi preservado para revisão.

## Evidências de preservação

`git-status-before.txt`, `local-changes-before.patch` e `git-head-before.txt` registram o ponto de partida. `images-before.json` registra SHA-256 de 465 arquivos existentes de `public/modifications`, incluindo as imagens aprovadas e os créditos. O teste de imagens aprovadas compara os 263 arquivos com as seleções finais, incluindo a versão v3 de instrumentação elétrica.

A confirmação final de integridade e os resultados consolidados ficam em `validation.json`.
