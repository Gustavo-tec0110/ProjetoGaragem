# Detalhes de componentes e ofertas — operação local

A interface está integrada ao seletor do formulário de modificações e aos cartões de modificações de cada projeto, inclusive para visitantes. A imagem e o botão de detalhes abrem um dialog Radix. O nome da peça continua selecionando o item no formulário; editar, excluir e salvar continuam usando as ações existentes.

O dialog apresenta a imagem, o nome, a categoria, a descrição existente e observações de compatibilidade, quando cadastradas. Não transforma a classificação genérica “universal” em uma promessa de aplicação. Não deduz preço das estimativas do catálogo.

## Avaliação local

```bash
CATALOG_OFFERS_DEMO=1 MODIFICATION_PHOTOS_TEST_HARNESS=1 npm run dev -- --hostname 127.0.0.1 --port 3101
```

Abrir http://127.0.0.1:3101/test-harness/catalog-details . O formulário completo também está em /test-harness/catalog.

- Aerofólio, turbocompressor e volante esportivo: três opções demonstrativas.
- Coilover: uma opção demonstrativa.
- Radiador de arrefecimento e demais peças: nenhuma opção demonstrativa.
- /test-harness/catalog-details/stress: fixtures de textos extensos, imagens horizontais/verticais e imagem ausente. Usa imagens históricas existentes, explicitamente como teste de layout.

O modo demonstrativo exige **NODE_ENV=development e CATALOG_OFFERS_DEMO=1**, variável exclusiva do servidor. Um build de produção ignora essa flag. A página de avaliação e as fixtures retornam 404 em produção. As ofertas demonstrativas não têm URL, preço nem código afiliado: cada botão apenas apresenta um aviso dentro do dialog. Nenhuma oferta demonstrativa é gravada em banco.

## Dados e ativação futura

`supabase/migrations/20261027210000_modification_offers.sql` cria somente a tabela de ofertas, índice, trigger, restrições e RLS. Foi incluída na sequência do bootstrap. **Não foi aplicada em nenhum Supabase remoto.**

Cada oferta referencia `modification_catalog.id` por `catalog_id`; o vínculo usa o UUID persistido, sem depender de nomes, slugs ou posições. Campos: `id`, `catalog_id`, `store`, `destination_url`, `is_active`, `is_affiliate`, `price`, `price_checked_at`, `created_at`, `updated_at`. Uma peça pode ter zero ou várias ofertas. Não há alteração nos registros de componentes ou associações dos projetos.

Para ativar links verdadeiros em outra etapa:

1. Revisar e autorizar a aplicação da migração no ambiente desejado.
2. Desligar a flag de demonstração (ou executar em produção, onde é sempre desligada).
3. Identificar o UUID real com `select id, name from public.modification_catalog where slug = 'aerofolio';`.
4. Pelo SQL Editor ou ferramenta administrativa confiável, cadastrar uma linha com esse `catalog_id`, a loja e a URL afiliada verdadeira obtida da conta do parceiro. Não criar códigos ou URLs fictícios. Não usar ferramentas de navegador de visitantes para manutenção.
5. Para atualizar: alterar `destination_url` pelo `id` da oferta. Para desativar: `is_active=false`. Para remover: excluir a linha da oferta. Esses procedimentos não alteram o componente.
6. Preço é opcional. Se for informado, preencher também `price_checked_at` com a data da conferência na origem. A interface exibe somente valor positivo, finito, conferido nas últimas 24 horas, sem aceitar datas futuras. Valores antigos desaparecem, preservando o link. Não existe sincronização automática de preços.

Nenhum painel administrativo foi criado. Não há endpoint público de escrita. Anônimos e usuários autenticados têm apenas SELECT, sujeito a RLS: oferta, componente e categoria devem estar ativos. Não há políticas ou grants de escrita para visitantes. A manutenção usa o ambiente administrativo confiável; o frontend e a rota de leitura não usam chave privilegiada.

A rota GET `/api/catalog/{uuid}/offers` busca somente ao abrir os detalhes, filtra pelo componente e limita a leitura a 20 registros ativos. Requisições simultâneas do mesmo componente são compartilhadas, sem cache persistente de preços. A resposta tem `Cache-Control: no-store`. Não haver tabela/migração disponível ou ocorrer falha de consulta mostra um estado recuperável; a seleção do componente continua funcionando. Erros de rede permitem tentar novamente.

URLs são verificadas no banco, no servidor e no cliente. Aceitam somente HTTPS sem credenciais/porta, em domínios das lojas cadastradas e seus subdomínios. Lojas aceitas:

| Loja | Domínios |
|---|---|
| Mercado Livre | mercadolivre.com.br, mercadolivre.com, meli.la |
| Shopee | shopee.com.br, shope.ee |
| Amazon | amazon.com.br, amzn.to |

Novas lojas exigem uma pequena alteração no registro tipado e na restrição SQL. Não se aceita uma URL arbitrária como loja nova. Os destinos não são buscados pelo servidor: o sistema não inspeciona redirecionamentos posteriores em links encurtados dos parceiros. O operador deve conferir o destino final antes do cadastro.

Links reais abrem nova aba com `noopener noreferrer`; os afiliados também recebem `sponsored` e divulgação de comissão. Links demonstrativos são botões sem href.

## Imagens aprovadas e preservação

A investigação encontrou as 263 imagens aprovadas ainda fora do frontend. O manifesto `artifacts/catalog-ai-2026-10-27/planning/manifest.json` é a fonte de seleção, incluindo instrumentação elétrica v3 e aprovação final do usuário. Os 263 WebP foram copiados **sem reconversão** para `public/modifications/approved/`. Hashes e origem estão em `approved-images.json`.

`src/lib/modifications/approved-catalog-images.json` associa slug, categoria e caminho. O resolver novo usa essas imagens para os defaults conhecidos; preserva fotos independentes cadastradas no banco. Nenhum arquivo original de imagem, revisão, manifesto ou catálogo foi substituído. As imagens são representações ilustrativas geradas por IA; a interface não as apresenta como fotos reais do projeto.

Nenhum ID, slug, categoria ou cadastro foi criado/renomeado pela integração das imagens. Os 184 registros novos continuam dependendo da migração de expansão já preparada anteriormente, caso ela ainda não tenha sido aplicada em um ambiente. Não foi aplicada aqui.

## Repetir testes

Com o servidor acima ativo:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 npx playwright test tests/e2e/catalog-details.spec.ts --project=desktop-chromium --workers=1
node --test tests/unit/catalog-offers.test.mjs tests/unit/approved-catalog-images.test.mjs
node scripts/test-catalog-offers-migration.mjs
```

Sem servidor externo, o Playwright habilita a simulação no servidor local que gerencia. O desenvolvimento usa o Turbopack padrão desta versão do Next. Os testes aguardam um marcador de hidratação nas páginas de fixtures antes de interagir. Em CI com `npm start`, a suíte demonstrativa é ignorada intencionalmente: a simulação não pode ser habilitada em produção. O bloqueio de produção também tem teste unitário dedicado.
