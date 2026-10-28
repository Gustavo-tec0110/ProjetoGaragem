# Processo de conclusão da cobertura fotográfica

Meta de aceite: 263 registros com fotografia real correta, sem imagens quebradas, fontes e condições de uso documentadas e saídas WebP 512 × 512. A pesquisa só termina com aprovação ou impedimento individual documentado para cada pendência; nenhum lote parcial implica conclusão do catálogo.

As 62 aprovações de entrada estão congeladas em `preserved-62.json`. A meta inclui registros legados que compartilham a mesma fotografia; a contagem de arquivos distintos será informada separadamente.

1. Inventariar todos os 201 pendentes, com nome, categoria, tradução e sinônimos técnicos.
2. Pesquisar cada item em português e inglês, com termos de produto isolado. Consultar fontes licenciadas, bancos de fotos e catálogos de fabricantes.
3. Registrar consultas, sucessos, falhas e candidatos, sem considerar resultados de busca como prova de licença ou aprovação visual.
4. Conferir a fonte primária de cada candidato selecionado: autoria, termos por arquivo, compatibilidade comercial e possibilidade de adaptação. Sem autorização, não incorporar ao catálogo. Não comprar licenças ou contactar terceiros nesta execução.
5. Inspecionar visualmente o original: peça correta, íntegra, sem veículo inteiro, ilustração, render ou print. Preferir fotos de produto em fundo claro ou neutro. Pontuações automáticas de fundo apenas priorizam a revisão humana.
6. Baixar o original autorizado, verificar formato real, decodificação, dimensões e SHA-256. Corrigir orientação, preservar proporções, limitar conteúdo a 480 px e compor WebP 512 × 512 com margem clara usando o gerador existente.
7. Registrar decisões, créditos, fontes e licenças; conferir que as 62 aprovações anteriores não mudaram.
8. Continuar pelos demais lotes. Para cada item sem aprovação, indicar candidato/fonte consultada, razão concreta e alternativa necessária (autorização escrita, licença paga apropriada ou fotografia própria).
9. Reexecutar verificações de arquivos e testes funcionais/visuais. Relatar cobertura real e impedimentos sem declarar 100% se houver qualquer pendência.

O usuário informou não possuir autorizações prévias ou assinatura de banco de imagens. Nenhuma licença é presumida por acesso público. Não há push, deploy, publicação ou escrita em produção.

Automação retomável: `python3 scripts/catalog/research-photos.py plan`, `search` e `sheets Flickr`/`sheets PxHere`. Os resultados brutos ficam em `artifacts/catalog-photo-completion-2026-10-27`; as decisões revisáveis ficam nesta pasta.
