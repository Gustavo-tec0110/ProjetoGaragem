# Operação local de ofertas

Este fluxo não usa credenciais, não carrega `.env`, não conecta ao Supabase e não executa SQL. O cadastro fica em `data/catalog-offers.local.json`, inicialmente vazio. Nenhum link comercial foi criado ou preenchido nesta entrega.

## Lojas e vínculo

Lojas disponíveis: `mercado_livre`, `shopee`, `amazon`, `magalu`. AliExpress continua pendente de configuração futura.

Cada oferta referencia um **slug exato** do catálogo aprovado. Uma peça pode ter várias ofertas, inclusive da mesma loja. Cada registro tem UUID estável. O exportador SQL resolve o slug para o `catalog_id` real; não reutiliza IDs fictícios das prévias. Um slug inexistente no banco causa falha na transação inteira.

```bash
npm run offers -- catalog turbo
npm run offers -- template turbo amazon > /tmp/oferta-pg.json
```

Edite `/tmp/oferta-pg.json` com dados reais obtidos no painel autorizado da sua conta:

- `product_name`: nome exato do anúncio, até 180 caracteres.
- `product_url`: endereço do anúncio conferido, dentro dos domínios permitidos da loja.
- `destination_url`: link de afiliado **já gerado pela plataforma**. O PG não gera tags, links ou credenciais.
- `compatibility_notes`: aplicação conferida, modelo/medidas e adaptações ou restrições relevantes, até 1.000 caracteres.
- `is_affiliate`: `true` para links de afiliado; `false` para links comerciais sem comissão.
- `price` e `price_checked_at`: ambos nulos se não houver preço confiável. Se preenchidos, use BRL como número com até duas casas decimais e data ISO com fuso horário. Preços consultados há mais de 24 horas são omitidos na leitura, sem substituir por estimativas do catálogo.
- `source_product_id`: opcional; identificador real do anúncio para futuras integrações oficiais.

Não preencha com páginas de busca ou links de produtos parecidos. Abra o anúncio e confira produto, variação e aplicação antes de revisar. A validação de domínio protege a URL, mas não comprova existência, estoque, titularidade da comissão ou compatibilidade mecânica. Essa conferência é manual nesta fase. Para encurtadores oficiais, confira também o destino final no navegador. Não há scraping nem resolução automática de links.

## Salvar, revisar, ativar e atualizar

```bash
npm run offers -- save /tmp/oferta-pg.json
npm run offers -- list
npm run offers -- review ID_DA_OFERTA --confirm-reviewed
npm run offers -- activate ID_DA_OFERTA
npm run offers -- validate
npm run offers -- deactivate ID_DA_OFERTA
```

O primeiro `save` cria um UUID e mantém a oferta inativa. A ativação exige revisão. Para atualizar, copie o UUID retornado para o campo `id` do JSON e execute `save` novamente. A atualização mantém a identidade, desativa a oferta e limpa a revisão: revise e ative novamente após conferir a mudança. Duplicatas da mesma URL/loja/componente são recusadas pelo gerenciador; use o ID existente.

A gravação local usa bloqueio de arquivo e substituição atômica. Erros de validação preservam o conteúdo anterior. `--file /caminho/local.json` permite usar outro arquivo em testes; a interface do site lê apenas o arquivo padrão. Nunca inclua segredos no JSON.

## Visualização local com ofertas reais

Ao iniciar um servidor de desenvolvimento local, use:

```bash
CATALOG_OFFERS_LOCAL=1 MODIFICATION_PHOTOS_TEST_HARNESS=1 npm run dev -- --hostname 127.0.0.1 --port 3101
```

Se já houver `next dev` neste checkout, reinicie esse servidor com as variáveis; dois servidores de desenvolvimento no mesmo checkout disputam o bloqueio do Next.js. Não altere `.env` para essa avaliação.

Abra `/test-harness/catalog`, selecione a peça e abra os detalhes. A API lê somente as ofertas locais daquele slug, respeitando ativação e revisão. Esse modo prevalece sobre a demonstração. Em `NODE_ENV=production`, a flag local é ignorada.

A demonstração antiga é isolada: requer desenvolvimento, `CATALOG_OFFERS_DEMO=1` e requisição explícita de demonstração. Apenas as prévias de `/test-harness/` fazem essa requisição automaticamente. As páginas normais de projeto não solicitam ofertas fictícias.

## Preparação para Supabase, sem aplicação

Migração nova: `supabase/migrations/20261028010000_reviewed_catalog_offers.sql`. Depende da migração local existente `20261027210000_modification_offers.sql`. Acrescenta dados de revisão, origem e suporte ao Magalu; preserva registros existentes e políticas RLS. Ofertas antigas sem revisão deixam de ser exibidas pela API até serem revisadas individualmente.

```bash
npm run offers -- export-sql > /tmp/ofertas-pg-para-revisao.sql
```

Esse comando só gera texto SQL para revisão. **Não execute o SQL ou as migrações em produção sem autorização separada.** Quando autorizado futuramente, um administrador poderá aplicar a migração e o arquivo revisado. O arquivo utiliza `upsert` por UUID para criar, atualizar e desativar sem apagar ofertas omitidas. A desativação deve constar explicitamente no arquivo exportado.

A aplicação pública tem apenas leitura. Nenhuma rota de escrita administrativa foi exposta ao navegador. As chaves privilegiadas existentes não são usadas por essa ferramenta.

## APIs oficiais futuras

`OfficialOfferProvider` define a entrada de rascunhos por loja; `source` e `source_product_id` identificam proveniência. Não há adapters, sincronização, webhooks ou agendamentos ativos. Credenciais, acesso aos programas e regras específicas de cada API precisam ser fornecidos e validados antes de implementar essas conexões. O processo de revisão/ativação permanece explícito.

Referências oficiais consultadas na revisão:

- [Programa do Mercado Livre](https://www.mercadolivre.com.br/l/afiliados-home)
- [Programa Magalu](https://www.magazinevoce.com.br/cadastro/)
- [Segurança da Data API do Supabase](https://supabase.com/docs/guides/api/securing-your-api)
