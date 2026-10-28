# Catálogo — detalhes de componentes e ofertas

Implementação exclusivamente local, em 27/10/2026. Nenhum commit, push, deploy, publicação no Netlify ou aplicação de SQL remoto foi realizado.

## Implementação

Dialog Radix integrado às imagens e aos botões de detalhes no seletor de peças e nos cartões de modificações dos projetos. A seleção pelo nome, o formulário, busca, filtros, categorias, paginação, edição e ações de associação existentes foram preservados. Visitantes também podem consultar os detalhes das peças nos cartões públicos de modificações.

A composição usa duas colunas no desktop e fluxo vertical em tablet/celular. O cabeçalho permanece acessível enquanto o conteúdo rola. A imagem usa `object-contain`, variantes do otimizador existente e arquivos de 512 px; o conteúdo inclui categoria, nome, descrição cadastrada e notas de aplicação quando disponíveis. Os detalhes não exibem campos vazios nem apresentam compatibilidade genérica como garantia.

“Onde comprar” tem estados de carregamento, erro recuperável, nenhuma oferta e várias ofertas. As consultas acontecem somente ao abrir os detalhes, e leituras concorrentes do mesmo componente são compartilhadas.

A simulação usa Mercado Livre, Shopee e Amazon, com identificação DEMONSTRAÇÃO em cada opção. Aerofólio, turbocompressor e volante esportivo têm três opções; coilover tem uma; radiador tem zero. Os botões apenas mostram um aviso: não têm destino externo, preço ou código de afiliado. A simulação exige uma flag do servidor **e modo development**; produção bloqueia a demonstração mesmo se a flag continuar ligada.

As ofertas reais usam `modification_offers.catalog_id → modification_catalog.id`, sem modificar componentes ou associações. A migração acrescenta RLS, índice, validação de URL, preço opcional, data de conferência, status ativo e indicação de vínculo afiliado. Visitantes têm somente leitura de ofertas/componentes/categorias ativos; a manutenção é administrativa. Links reais usam HTTPS validado, domínio correspondente à loja e `noopener noreferrer`, mais `sponsored` quando afiliados. Preços sem conferência nas últimas 24 horas são omitidos.

**Ativação futura:** revisar/autorizar a migração, desligar a simulação e cadastrar as URLs afiliadas verdadeiras pelo UUID existente do componente. Atualizar ou desativar uma oferta não modifica a peça. O passo a passo e os campos estão em [OPERACAO.md](OPERACAO.md).

## Imagens aprovadas

A investigação identificou que as 263 imagens aprovadas ainda estavam somente nos artefatos. Foram conectadas ao frontend usando cópias idênticas em `public/modifications/approved/`, sem gerar, reconverter, substituir ou apagar originais. A seleção respeita a aprovação final e usa instrumentação elétrica v3.

Todos os 263 pares origem/destino tiveram SHA-256, decodificação, formato WebP e dimensões 512 × 512 verificados. Fotos independentes cadastradas no banco continuam prevalecendo sobre defaults conhecidos. Nenhum slug, UUID, nome, categoria ou associação de catálogo foi alterado. [Origem e hashes das cópias](approved-images.json).

## Qualidade e evidências

| Verificação | Resultado |
|---|---|
| Playwright / Chromium | **11 testes aprovados**, cobrindo 1440 × 900, 768 × 1024 e 390 × 844 |
| Console, hidratação, erros de página, requisições críticas e HTTP 5xx | Nenhum erro detectado na rodada final aprovada |
| Unidade | 42 testes da suíte aprovados; proteção adicional contra demonstração em produção aprovada separadamente |
| Nova migração de ofertas | Aprovada em PostgreSQL/WASM descartável: CRUD administrativo, visitantes sem escrita, leitura ativa, URLs e preços |
| Bootstrap completo | 46 migrações aprovadas em banco descartável, incluindo ofertas |
| Migração anterior de expansão | Aprovada: 79 → 263 componentes, IDs/FKs originais e dados privados preservados, associação pelo proprietário e bloqueio de outro usuário |
| Backend e imagens existentes | 107 verificações SQL e 68 verificações locais de HTTP/Storage aprovadas |
| TypeScript | Aprovado; build final também verifica os tipos |
| Lint dos arquivos alterados/criados de código | Aprovado |
| Lint global | 39 erros em scripts históricos de `artifacts/catalog-images-2026-10-26/`, anteriores a esta implementação; arquivos preservados |
| Build de produção local | Aprovado: compilação, TypeScript e geração de páginas concluídos |
| Bloqueio demonstrativo em servidor de produção | Aprovado com flag = 1: páginas demonstrativas 404, API sem ofertas fictícias, imagem aprovada acessível |

A suíte de navegador cobre abertura por imagem, correspondência de imagem/descrição, botão de fechar, Escape, clique no overlay, restauração e confinamento de foco, navegação por Tab/Enter, todas as lojas simuladas, ausência de navegação externa, zero/uma/três ofertas, descrições extensas, nomes extensos, imagens horizontais/verticais/ausentes, retentativa, proteção dos links reais por fixtures, preço vencido e URL inválida. A regressão confere busca sem acento/sinônimos, combinação de filtros, limpar filtros, paginação, seleção sem perda ao fechar detalhes e edição de registro legado.

Os testes que verificam atributos de links reais usam respostas interceptadas pelo Playwright. Esses links de fixture não foram seguidos e não são cadastrados no servidor ou banco.

Problemas encontrados e corrigidos:

- Imagens aprovadas ainda desconectadas do catálogo: associação aditiva, sem modificar originais.
- Requisição repetida pelo Strict Mode: compartilhamento das consultas em andamento.
- Conflito entre nomes de constraints SQL: corrigido e revalidado no banco descartável.
- Contraste entre o fundo da imagem e a borda do arquivo branco: fundo harmonizado.
- Inconsistências em fixtures renderizadas no servidor e interações antes da hidratação: controles das fixtures passaram para componente cliente e os testes aguardam hidratação.
- Instabilidade de chunks/manifestos no desenvolvimento com Webpack: cache gerado preservado em `/tmp/pg-catalog-next-dev-webpack-20261027`, servidor reiniciado com Turbopack padrão e suíte final aprovada. A configuração automática do Playwright agora usa esse padrão.
- O bootstrap precisava incluir a nova migração na sequência: adicionado sem remover a expansão anterior e validado integralmente.

## Inspeção visual

As capturas finais foram abertas e inspecionadas. No desktop, imagem e conteúdo têm proporções equilibradas; as três opções cabem na janela. No tablet, os blocos se reorganizam verticalmente com botões legíveis. No celular, a janela ocupa a parte inferior da tela, conserva o cabeçalho e permite rolar até todas as ofertas. O botão de fechar e o foco continuam acessíveis após a rolagem. Uma conferência adicional no celular confirmou alvo de toque de 44 × 44 px, com o ícone visível mesmo com título extenso (`stress-mobile-check.png`). Não foi observado transbordamento horizontal no dialog ou na página.

Os textos extensos e imagens com outras proporções foram avaliados em fixtures de layout, separadas dos dados reais. A imagem permanece inteira dentro de sua área; uma imagem que saiu da área visível ao rolar não indica corte do arquivo. Os estados com nenhuma e uma oferta mantêm conteúdo e espaçamento coerentes.

Apenas o indicador de desenvolvimento do Next é ocultado durante a captura. Os elementos reais da interface e o comportamento testado são preservados.

| Formato | Captura inicial | Ofertas após rolagem/interação |
|---|---|---|
| Desktop — 1440 × 900 | [desktop.png](desktop.png) | [desktop-offers.png](desktop-offers.png) |
| Tablet — 768 × 1024 | [tablet.png](tablet.png) | [tablet-offers.png](tablet-offers.png) |
| Celular — 390 × 844 | [mobile.png](mobile.png) | [mobile-offers.png](mobile-offers.png) |

As capturas adicionais de zero/uma/três ofertas e de stress estão na mesma pasta, com prefixos `desktop-`, `tablet-`, `mobile-` e `stress-`.

## Limites e estado do projeto

Não foi aplicada migração, nem cadastrado link real. A operação remota depende de autorização futura. Os 184 novos componentes continuam dependendo da migração de expansão preparada anteriormente se ainda não tiver sido aplicada no ambiente correspondente. A avaliação local inclui os 263 componentes.

Não houve transação real de compra nem autenticação de uma conta real para gravar associações. A gravação e as permissões foram verificadas com fixtures de ações e PostgreSQL local. Não foi executada toda a suíte social/autenticada da plataforma. Os links encurtados dos parceiros não são seguidos ou auditados automaticamente; devem ser conferidos pelo operador antes do cadastro. O preço é manual e não há integração de estoque.

Nenhuma dependência foi acrescentada. Nenhum comando de descarte de trabalho, commit, push, deploy, Netlify ou migração remota foi executado. A prévia final usa credenciais Supabase vazias no processo, mantendo a avaliação isolada.

A situação inicial do Git e os hashes de todos os arquivos preexistentes estão em [before.json](before.json). A comparação final e a lista completa de arquivos estão em [files.json](files.json). A comparação por SHA-256 confirmou **2.825 arquivos preexistentes idênticos**, sete arquivos com as adições descritas abaixo e nenhum arquivo preexistente excluído. As imagens originais e os artefatos anteriores permanecem intactos. As alterações anteriores nos arquivos compartilhados foram preservadas e receberam somente as adições desta funcionalidade.

Arquivos preexistentes alterados nesta implementação:

- `playwright.config.ts`: flag da simulação no servidor gerenciado e Turbopack padrão; flags e correspondências anteriores mantidas.
- `src/app/test-harness/catalog/page.tsx`: mapa de imagens aprovadas e marcador de hidratação para testes.
- `src/components/projects/catalog-picker.tsx`: detalhes separados da seleção existente.
- `src/components/projects/project-modifications.tsx`: abertura por imagem e botão dos cartões.
- `src/lib/modifications/server.ts`: resolver das imagens aprovadas, mantendo as adições anteriores de aliases e busca.
- `src/lib/types.ts`: tipagem da tabela de ofertas.
- `supabase/bootstrap.sql`: inclusão da migração de ofertas, preservando a expansão anterior.

Arquivos criados:

- `src/components/projects/catalog-details.tsx`.
- `src/lib/modifications/offers.ts`, `demo-offers.ts`, `approved-catalog-images.ts` e `approved-catalog-images.json`.
- `src/app/api/catalog/[id]/offers/route.ts`.
- `src/app/test-harness/catalog/harness-ready.tsx`.
- `src/app/test-harness/catalog-details/page.tsx`, `stress/page.tsx` e `stress/stress-cases.tsx`.
- `supabase/migrations/20261027210000_modification_offers.sql`.
- `scripts/test-catalog-offers-migration.mjs`.
- `tests/e2e/catalog-details.spec.ts`, `tests/unit/catalog-offers.test.mjs` e `tests/unit/approved-catalog-images.test.mjs`.
- 263 cópias de imagens em `public/modifications/approved/`, enumeradas em `approved-images.json`.
- Relatório, instruções, logs, manifestos e screenshots em `docs/catalog-details-2026-10-27/`.

Permanecem do trabalho anterior, sem alteração nesta implementação: `package.json`, créditos de fotos, `project-detail.tsx`, `project-gallery.tsx`, `catalog-assets.ts/json`, `catalog-definitions.json`, `modifications/types.ts`, migração de expansão, scripts e testes anteriores, arquivos originais de imagem e demais artefatos. A situação anterior de todos eles pode ser consultada no snapshot inicial.
