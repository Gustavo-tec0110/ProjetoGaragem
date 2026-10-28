# Expansão do catálogo — 27/10/2026

Preparação **local, sem publicação e sem escrita em produção**. O catálogo remoto foi consultado apenas com a chave pública em duas operações SELECT para formar `baseline.json`. A migração preparada ainda exige uma liberação separada para chegar ao ambiente compartilhado.

## Arquitetura e compatibilidade

O catálogo utilizado pela página de modificações é `modification_catalog`, ligado a `modification_categories`. `project_modifications.catalog_id` referencia seu UUID com `ON DELETE RESTRICT`. A tabela antiga `parts_catalog` pertence a outro fluxo e não foi alterada. As fotos particulares dos projetos continuam usando o bucket privado `project-images` e seu controle de acesso; as imagens representativas do catálogo são arquivos públicos empacotados em `public/modifications`.

A expansão mantém as dez categorias e todos os UUIDs e slugs existentes. Não altera custos, compatibilidade, anotações, status, projetos, buckets, grants, policies ou funções de autorização. Os registros novos usam compatibilidade `adaptable` e explicam que a foto não confirma aplicação no veículo. A migração insere por slug com `ON CONFLICT DO NOTHING`, mantém conflitos preexistentes e não reativa peças desabilitadas. Correções editoriais só substituem os valores originais conhecidos; imagens e descrições curadas independentemente são preservadas. A migração é transacional e verifica previamente as dez categorias ativas.

A leitura do catálogo troca apenas imagens padrão conhecidas pelo mapa revisado. Quando uma imagem é recusada e ainda não há substituição aprovada, a peça continua selecionável e mostra “Foto em revisão”. Arquivos anteriores permanecem disponíveis para recuperação. Não há fallback para as antigas ilustrações ou fotografias reprovadas.

## Auditoria editorial

Foram confirmados 79 registros originais em 10 categorias. Havia duas sobreposições: `suspensao-rosca`/`coilover` e `instrumentacao-eletrica`/`instrumentacao-interior`. Ambos os pares conservam os registros originais para consulta e edição; apenas a nova seleção agrupa cada par quando o registro principal está disponível. A edição de uma modificação antiga continua oferecendo sua entrada exata. Se o principal não estiver disponível, a entrada legada volta a aparecer na seleção.

Nomes genéricos foram contextualizados: “Mangueiras” → “Flexíveis de freio”, “Braços” → “Braços de suspensão”, “Regulador de pressão” → “Regulador de pressão de combustível”, “Discos” → “Discos de freio”. “Camber / alinhamento” passa a “Kit de ajuste de cambagem”, e “Relações de marcha” passa a “Engrenagens de câmbio”, descrevendo componentes em vez de serviços ou parâmetros. Nenhum identificador foi renomeado.

O inventário preparado contém **263 registros: 79 originais e 184 novos**, equivalentes a **261 escolhas sem os dois aliases legados**. Não foram criados cadastros por fabricante, diâmetro, acabamento ou modelo de veículo. Componentes de um conjunto podem ter entradas próprias quando têm função reconhecível, como cilindro mestre de freio, bolsa pneumática, módulo controlador e compressor.

| Categoria | Antes | Depois | Novos |
| --- | ---: | ---: | ---: |
| Motor / Performance | 19 | 67 | 48 |
| Suspensão | 10 | 31 | 21 |
| Freios | 5 | 17 | 12 |
| Rodas e pneus | 4 | 14 | 10 |
| Transmissão | 6 | 21 | 15 |
| Interior | 10 | 24 | 14 |
| Exterior | 9 | 27 | 18 |
| Iluminação | 5 | 14 | 9 |
| Elétrica / Eletrônica | 7 | 33 | 26 |
| Som | 4 | 15 | 11 |
| **Total** | **79** | **263** | **184** |

Arrefecimento, alimentação e sobrealimentação permanecem em Motor / Performance; direção e sistemas pneumáticos ficam em Suspensão; instrumentos adicionais e assistência eletrônica ficam em Elétrica / Eletrônica. Segurança de cabine fica em Interior. Essa organização amplia a cobertura sem fragmentar a navegação.

## Pesquisa de componentes

As seguintes fontes primárias foram consultadas para identificar famílias reais e distinguir componentes. As descrições e a organização do inventário são uma síntese editorial própria; não são cópias dos catálogos. **Essas consultas não concedem licença para reutilizar fotografias dos fabricantes.** Nenhuma imagem foi copiada desses catálogos sem licença específica.

- [Holley — produtos](https://www.holley.com/products/): famílias de alimentação, ignição, preparação, arrefecimento, transmissão e acabamento.
- [Garrett — otimização do sistema turbo](https://www.garrettmotion.com/racing-and-performance/choosing-a-turbocharger/turbo-system-optimization/): funções de válvulas, pressurização e sistemas auxiliares.
- [Air Lift — componentes de suspensão e gerenciamento](https://checkout.airliftperformance.com/sitemap.php) e [Monroe — componentes da suspensão a ar](https://www.monroe.com/technical-resources/shocks-101/air-suspension-system-components-explained.html): conjunto pneumático, compressor, reservatório e controle.
- [Brembo — componentes hidráulicos](https://www.bremboparts.com/america/en/products/essential/hydraulic-components): distinção entre acionadores de freio e embreagem.
- [HELLA — catálogos](https://www.hella.com/us/Catalogs-4323/): famílias de sensores, módulos, iluminação e componentes elétricos.
- [Pioneer — produtos](https://usa.pioneer/products): fontes, amplificação e transdutores do som automotivo.
- [Mishimoto — mangueiras e acessórios](https://www.mishimoto.com/radiators/hoses-and-accessories.html?is_universal=1) e [Vibrant — reservatórios de respiro](https://vibrantperformance.com/gen3-catch-can-assembly/): componentes de suporte ao motor.
- [Sparco — catálogo oficial de acessórios](https://www.sparco-official.com/media/wysiwyg/SPARCO_MARTINI_Racing_Catalogo2026_A4_web_ENG_noprezzi_1.pdf): bancos, cintos, volantes e fixação.

## Fotografias e pendências

Resultado atual: **65 registros com foto aprovada e 198 pendentes**, com 64 fotografias distintas em WebP 512 × 512 (1.182.964 bytes). A reformulação continua **incompleta: cobertura de 24,71%**.

A rodada mais recente executou 1.809 tentativas de busca pelos 201 componentes então pendentes e mais 201 consultas de descoberta em fontes de fabricantes/fornecedores na web. Acrescentou três fotografias — crossover, manopla e polias de comando — com fontes individuais, autores e licenças documentados. Todas as 62 aprovações anteriores foram preservadas integralmente. Os números de busca incluem falhas e resultados irrelevantes; não significam fotos adequadas nem prova de inexistência mundial de alternativas.

O [relatório da pesquisa em escala](completion/README.md) contém o resultado, limites, recusas e as novas fotografias. A relação de [198 pendências](completion/blocked-items.csv) registra por componente o impedimento, consultas/falhas, pistas de fornecedor sem licença presumida, alternativa necessária e instrução de fotografia própria. O [painel local](completion/review.html) permite filtrar as 263 entradas.

Entre os 79 registros originais, 17 mantêm a fonte inicial, 18 usam outra fonte e 44 continuam sem foto aprovada. Entre os 184 novos tipos, 30 têm foto e 154 seguem pendentes. Essa comparação com a base original não significa alteração das 62 aprovações preservadas.

O [relatório da rodada anterior](followup/README.md) permanece como histórico: naquela etapa entraram 23 fotografias, cobrindo 24 registros devido ao alias de coilover, e foram preservadas as 38 aprovações iniciais. As pranchas históricas e seus números não são o estado atual. As três adições recentes estão em [completion/new-photos.jpg](completion/new-photos.jpg).

Todas as saídas são WebP 512 × 512 com orientação corrigida e escala proporcional, sem corte ou alongamento. Predominam fundos brancos/neutros; imagens anteriores em contexto de montagem foram preservadas conforme solicitado. Não se declara uniformidade estética integral. As novas fotos usam CC BY 2.0, CC BY-SA 4.0 e CC BY-ND 2.0; na última, somente alterações técnicas de dimensão/formato, preservando o quadro completo. Nenhuma foto gerada por IA foi incorporada.

A decisão de cada registro está em `audit.json` e `photo-review.json`; a evidência por fonte, em `license-evidence.json`. Os créditos de todas as fontes ficam em `public/modifications/photo-credits.html`, incluindo exigências ShareAlike e NoDerivatives. As 198 pendências mantêm “Foto em revisão”.

## Navegação e implementação

O seletor pesquisa nomes, descrições e sinônimos em português/inglês, sem exigir acentos, combinando o texto com a categoria escolhida. Mantém a identidade visual existente, usa miniaturas quadradas em fundo claro, quebra nomes longos, carrega imagens sob demanda e limita a renderização inicial a 40 opções, com botão para expandir. O mapa completo de licença e auditoria não é enviado ao navegador.

A janela de modificação usa o portal de diálogo Radix já disponível no projeto. Isso impede que a animação da página a coloque atrás da navegação ou que o formulário ultrapasse a tela do celular. Mantém foco no diálogo, permite fechar por Escape e bloqueia o scroll da página de fundo. Avisos de upload/gravação aparecem dentro da janela aberta.

## Validação e liberação

Resultados locais repetidos na rodada atual: 37 testes unitários aprovados; 16 testes de navegador (catálogo, fotos e leitura de projetos existentes) aprovados em computador e celular; replay de 45 migrações em banco descartável; verificação específica da expansão aprovada; TypeScript, build e lint dos arquivos alterados aprovados. A última execução verifica os 64 arquivos distintos, suas variantes otimizadas, a preservação integral das 62 aprovações anteriores e também SHA-256, decodificação e carregamento das variantes otimizadas. O teste de persistência vincula um componente novo ao projeto pelo UUID gerado no banco descartável e comprova a recusa de escrita por outro usuário. Os resultados por comando e as limitações ficam em `validation.json`.

As tentativas iniciais de pesquisa receberam limites HTTP 429. A pesquisa direcionada posterior tentou 204 consultas, com 190 respostas sem erro e 14 falhas registradas; isso não é apresentado como coleta bem-sucedida de todas as fontes. Os candidatos brutos, recusas e scripts exploratórios estão em `artifacts/catalog-expansion-2026-10-27`, separados dos arquivos publicados pelo aplicativo. A continuação ampliou as fontes; seus resultados e falhas estão em `followup/research.json` e `followup/summary.json`, com originais e logs em `artifacts/catalog-photo-followup-2026-10-27`.

Os comandos e resultados atuais estão em `validation.json` e `completion/validation.json`. O estado anterior foi preservado em `completion/prior-validation.json`. A página `/test-harness/catalog` usa exclusivamente dados locais e só fica disponível quando `MODIFICATION_PHOTOS_TEST_HARNESS=1`. Ela permite verificar as 263 entradas e editar uma referência legada sem criar projetos ou enviar modificações ao banco. As provas de gravação, restrições e integridade rodam em PostgreSQL/WASM descartável (PGlite), não no Supabase compartilhado.

Para revisão técnica: `npm run typecheck`, `npm run test:unit`, `npm run test:sql`, ESLint dos arquivos alterados e os testes Playwright de catálogo e fotos. O lint global apresenta **39 erros preexistentes** em quatro scripts de `artifacts/catalog-images-2026-10-26` (`activate-catalog-images.mjs`, `rollback-catalog-images.mjs`, `stage-approved.mjs` e `version-static-assets.mjs`). Esses arquivos foram preservados. O lint dos arquivos alterados neste trabalho passou sem erros ou avisos.

Para uma liberação futura, publicar juntos o código, os novos WebP e os créditos; verificar os arquivos no ambiente de destino antes de aplicar a migração `20261027120000_expand_modification_catalog.sql`. O mapeamento revisado dá suporte às imagens dos 79 registros antigos antes da aplicação da expansão. **Nenhum deploy, push, commit, alteração de permissão ou aplicação de migração de produção foi executado neste trabalho.**

A recuperação deve partir de um backup atualizado no momento da liberação, restaurando condicionalmente somente valores alterados por este lote. Não excluir novos registros que já possam ter sido referenciados por projetos, nem reexecutar migrações antigas como rollback. Como a migração preparada é transacional, falha na própria aplicação reverte todo o lote.

O gerador local `node scripts/catalog/build-catalog.mjs` revalida licenças documentadas e os hashes das saídas aprovadas antes de reutilizá-las. Os WebP finais já estão empacotados; os candidatos brutos ficam fora do código do aplicativo. Para refazer uma transformação, a fonte revisada precisa estar disponível no caminho registrado no inventário.
