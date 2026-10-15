# Projeto Garagem — resultado da integração final local

Contexto da retomada: 15/10/2026, America/Bahia. Escopo autorizado: integrar e validar localmente, sem backup, commit, push, merge na main, deploy ou mudanças remotas no Supabase.

## Situação

Integração efetivamente executada na branch `codex/integracao-final-projeto-garagem`, em `/home/gustavo/.codex/worktrees/integracao-final-projeto-garagem/ProjetoGaragem`.

Base: `8841a3acce71a1ce02aec99131423116d174e3d3`, confirmada por `git ls-remote origin refs/heads/main` antes da criação. A main original e as worktrees de origem não foram usadas como destino.

Os commits `9395207c50ca9232b8c6570afbeaff5d404601fb` e `45da12b79891a244678abf54c66d7e2bd9205b0a` foram incorporados como patches, nessa ordem, sem criar commits. O HEAD da integração permanece na base; a entrega está no working tree, incluindo arquivos novos.

O manifesto de proveniência está em `docs/integracao-final-manifesto.json`. Ele registra os dois patches, os 527 caminhos transportados de performance e os documentos/evidências incorporados do checkout principal. Evidências homônimas diferentes foram conservadas em `docs/origens/checkout-principal/`, sem substituir as versões da main.

## Preservação e disco

Os 717 arquivos esperados foram conferidos por SHA-256 antes da integração: 190 no checkout principal e 527 em performance, sem diferenças. A exclusão de `src/app/loading.tsx` já constava do inventário; não é perda desta execução. O plano original também foi preservado.

Por instrução explícita do usuário, **nenhum backup foi feito nesta retomada**. A decisão anterior de seguir sem backup externo foi respeitada. Nenhuma correção da referência interna corrompida do Codex foi realizada. Não foram usados reset, clean, stash pop, rebase ou comandos destrutivos nas fontes.

Os comandos de instalação, build e validação foram acompanhados por uma guarda local que interrompe os processos em caso de montagem somente leitura, aumento dos erros EXT4 ou mensagens de erro de armazenamento no kernel. A conferência final das fontes e do disco consta nas evidências. Isso não constitui certificação física do SSD.

## Entregas incorporadas

- Editor: crop, zoom ancorado, slider, botões, roda, teclado, arraste, pinça, troca/cancelamento e exportação WebP, com verificações de dimensões e pixels.
- Skeletons: preservadas as composições completas da main, os estados vazios, os loadings de rotas, os testes dinâmicos e as seis larguras de auditoria. A variante local que retirava exports não foi sobreposta à main. Mantida a altura de Comparar da main.
- Performance/interface: prefetch seletivo, casca Server do login e formulário Client, Navbar/Footer, template com crescimento de conteúdo e correção do deslocamento do rodapé, SEO e favicon final.
- Privacidade: preferências de cookies persistidas e revogáveis, links jurídicos, Termos/Privacidade revisados anteriormente e ausência de integração de analytics.
- Backend: projeções públicas limitadas, separação de descrição pública/anotação privada, custos de modificações privados por padrão, consentimentos de gastos, RLS, leases, claims, referências globais, compensação de uploads e scripts de inspeção/contenção.
- Imagens: entrega autenticada, bucket privado preparado por SQL, conversão de URLs legadas, variantes Sharp, headers no-store, bloqueios dos otimizadores, Proxy e Edge Function Netlify.
- SQL/CI: sete migrations novas preservadas, preflights e contenções, testes unitários/SQL reproduzíveis e cobertura Mobile dos testes de segurança de imagens.

## Conflitos e falhas corrigidos na integração

1. Marcadores `data-page-skeleton` foram conciliados com os skeletons completos. O CSS oculta o footer durante o fallback de página, sem afetar botões com `aria-busy`.
2. O teste de rodapé/histórico foi incorporado. A verificação do preview foi colocada na suíte visual opt-in; os previews não foram abertos para publicação.
3. O aviso de cookies fica no fluxo normal das páginas de autenticação. Login funciona antes da escolha opcional em Desktop/Mobile. Uma primeira execução revelou precedência das utilities `fixed/inset`; a correção foi repetida com sucesso.
4. Erros das consultas de fotos, peças, comentários, eventos e gastos em `hydrateCarDetails` retornam erro explícito. A camada de páginas propaga a falha dos detalhes para a boundary com tentativa novamente, em vez de ocultar o corpo do projeto.
5. Detalhes públicos com gastos não reutilizam cache compartilhado: revogar consentimento por REST também afeta a próxima leitura. A visibilidade é reconsultada antes/depois da hidratação pública. O catálogo mantém suas otimizações e gates de visibilidade.
6. O teste de troca de imagem da capa aguarda a prévia decodificada antes de comparar pixels. As verificações de geometria e correspondência da exportação foram mantidas.
7. O bootstrap passou a ser explícito e exclusivo de banco novo. Uma guarda recusa schema/usuários/objetos existentes. O replay acomoda assinaturas/views do snapshot posterior e a extensão unaccent, remove seu shim ao final e conserva todas as 44 migrations originais.
8. PGlite 0.5.10 foi fixado como dependência de desenvolvimento; Sharp 0.35.4 foi declarado diretamente, mantendo a versão já imposta pelo override. Next/React não foram atualizados.
9. CI executa unitários e SQL. O runner local gerenciado pode habilitar harnesses; servidores externos exigem flags explícitos. `npm start` e o build normal não os ativam. Scripts CJS arquivados da auditoria antiga foram separados do lint da aplicação/ferramentas atuais.

10. A verificação Lighthouse identificou dois problemas de acessibilidade. O Button usa agora `accent-2`, já presente na paleta, para contraste do texto branco; o logo usa seu texto visível como nome acessível. A repetição confirmou 100 em acessibilidade.

## Validação e evidências

Evidências desta integração: `docs/evidencias-integracao-final/`.

| Gate local | Resultado | Evidência |
| --- | --- | --- |
| Unitários | 30 aprovados; zero skips/falhas | `unit.log` |
| Backend/imagens SQL e HTTP isolados | 107 verificações aprovadas | `sql.log` |
| Bootstrap completo | 44 migrations reproduzidas; defaults/bucket privados e guarda de banco existente aprovados | `sql.log`, `bootstrap.log` |
| Playwright Desktop/Mobile | 125 aprovados, 13 skips explícitos, 0 falhas | `playwright.json`, `playwright.log` |
| Regressão final após acessibilidade | 37 aprovados, três skips de dispositivo; zero falhas | `playwright-final.json`, `playwright-final.log` |
| Skeletons | 79 cenários nas larguras 360/390/768/1024/1440/1920, dentro da suíte completa | `playwright.json` |
| ESLint completo da aplicação e ferramentas atuais | aprovado | `lint.log` |
| TypeScript independente | aprovado | `typecheck.log` |
| Build local de produção sem flags de teste | aprovado; build ID `zbhYHuFUE2nf7DjyfcvjK` | `build-release.log` |
| Release sem harnesses | três rotas 404, fontes protegidas negadas no optimizer, GET/HEAD inválidos sem bytes/no-store, canonical/favicon aprovados | `release-check.json` |
| Integridade das fontes | 717/717 hashes preservados; plano original igual à cópia integrada | `integrity.json` |
| Credenciais no cliente | 38 arquivos JS verificados; nenhum padrão secreto/JWT service_role encontrado; sem env/vínculo copiados | `integrity.json` |
| git diff --check | aprovado | `diff-check.log` |


Os testes de imagens/uploads/editor usam fixtures e interceptações onde indicado nas suítes. SQL executa PostgreSQL real em WASM com Auth/Storage representados por fixtures. Isso não é execução de Supabase/Netlify reais.

Os 13 skips da suíte completa são: sete casos de autenticação/cidade sem contas reais, um cadastro sem conta de QA, dois casos de catálogo preenchido sem projeto publicado e três gestos específicos do outro dispositivo. **Nenhum skip foi contado como aprovado.** Os gestos correspondentes foram exercitados no dispositivo aplicável.

O refinamento que propaga erros à boundary foi coberto pelo teste unitário da página e por novo build; os ajustes finais de contraste/logo foram seguidos por 37 testes de regressão dos fluxos afetados; não envolve dados remotos nem altera as composições visuais aprovadas. O build publicável usa os três flags de harness/preview desligados, sem `.env.local`, vínculo `supabase/.temp` ou credenciais remotas copiados.

## Performance e custo de imagens

| Rota | Dispositivo | Performance | LCP (ms) | TBT (ms) | CLS |
| --- | --- | ---: | ---: | ---: | ---: |
| / | mobile | 67 | 4119 | 740 | 0.00918 |
| /explorar | mobile | 68 | 3583 | 962 | 0.00000 |
| /login | mobile | 67 | 4400 | 590 | 0.00003 |
| / | desktop | 95 | 1093 | 155 | 0.00050 |
| /explorar | desktop | 98 | 893 | 88 | 0.00097 |
| /login | desktop | 98 | 972 | 97 | 0.01142 |

Acessibilidade e boas práticas: **100/100 nas seis medições**. SEO: **100 nas páginas públicas**; **66 no login**, cujo `noindex` é intencional. A primeira série encontrou contraste insuficiente dos CTAs e nome acessível do logo incompleto; foram corrigidos com o vermelho `accent-2` já existente e o nome derivado do texto visível. A série anterior foi preservada em `lighthouse-before-accessibility/`. O desempenho Mobile de laboratório ainda exige atenção na auditoria final; não se declara ótimo desempenho em aparelhos reais apenas por esses resultados.

| Variante WebP | Original (bytes) | Saída (bytes) | Mediana Sharp (ms) | p95 da amostra (ms) |
| --- | ---: | ---: | ---: | ---: |
| 384 px / q75 | 202298 | 12026 | 84 | 93 |
| 640 px / q75 | 202298 | 26630 | 133 | 137 |
| 1080 px / q75 | 202298 | 56586 | 243 | 257 |

Modelo condicional de 10.000 GETs para o original de 202.298 bytes: 20.000 RPCs de autorização e aproximadamente 2,02 GB de leitura do Storage, além de 0,12–0,57 GB de saída das variantes. Isso não é consumo observado de produção nem previsão de cobrança.

As medições Lighthouse são de laboratório local, catálogo vazio e primeira visita. Usam o mesmo viewport/throttling da etapa 3: Mobile 412×823@1, CPU ×4, RTT 150 ms/1.638,4 Kbps; Desktop 1366×768@1, CPU ×1, RTT 40 ms/10.240 Kbps. Uma execução por rota/dispositivo não determina ganho causal nem representa INP de usuários ou infraestrutura Netlify.

O benchmark de mídia usa o Sharp real e uma imagem pública do próprio repositório. Não inclui latência das duas RPCs de autorização, download do Supabase, cold starts ou billing Netlify. A rota mantém duas autorizações por GET e não usa cache compartilhado; HEAD atualmente percorre o mesmo processamento. Antes do lançamento, medir latência/egress/compute reais e revisar proteção contra abuso da mídia no provedor. Nenhum serviço pago foi contratado.

## Supabase, Storage e implantação futura

**Nenhuma migration foi aplicada remotamente e nenhum bucket foi alterado.** O ref esperado pelos relatórios é `hxqhudfzdwfxnjzmphya`; o destino e o histórico remoto precisam ser reconfirmados na etapa autorizada. As contagens históricas de contas/objetos não são inventário atual.

Ordem preparada, sem execução remota:

1. `20261013010000_restrict_modification_photo_ownership.sql` — reconciliar a correção manual anterior e seu histórico.
2. `20261013020000_private_modifications_public_projection.sql`.
3. `20261013025000_private_expense_defaults_atomic.sql` — verificar hash do corpo remoto antes de aplicar.
4. `20261013030000_pending_modification_photo_leases.sql`.
5. `20261014010000_project_image_access_registry.sql`.
6. `20261014015000_project_image_cleanup_guards.sql`.
7. `20261014020000_activate_private_project_images.sql`.

Executar futuramente os dois preflights em `docs/sql/`, com confirmação de destino. Produção usa migrations incrementais; **não executar `bootstrap.sql` ou `schema.sql` sobre o banco existente**. Não conceder SELECT geral a anon, não fazer db push cego e não falsificar histórico.

O corte futuro permanece coordenado: backup verificável do banco/Auth/metadados **e bytes do Storage**, inventário atual, manutenção/bloqueio de escritas, aplicação ordenada, ativação do bucket privado, tratamento de URLs antigas/caches e um deploy compatível. A dispensa de backup externo do notebook nesta etapa não demonstra recuperação do banco de produção.

Rotação/cópia/remoção individual de objetos e purge só após revisão do inventário e autorização específica. Converter o bucket para privado não comprova revogação de URLs públicas/assinadas/transformadas já em cache. Validar URLs exatas e aliases de deploy antigos antes de reabrir. Em falha crítica, conter e reparar mantendo o bucket privado; não reabrir permissões.

A limpeza automática de temporários permanece **desativada**. Não é necessária para publicar enquanto estiver conservadoramente desligada; ativação requer testes reais de concorrência e autorização própria.

## Netlify, OAuth e revisão humana

O código inclui `netlify.toml` e a Edge Function para `/.netlify/images` e `/_next/image`. Foram testados localmente os guards, mas não sua execução antes dos caches no adaptador real. Site ID, adaptador, segredo server-side, scopes de ambiente, aliases, quotas e consumo precisam de conferência operacional. Nenhum deploy/preview remoto foi criado; nenhum crédito de deploy foi consumido por esta execução.

Google OAuth completo continua **não validado no conjunto consolidado**. Na etapa autorizada, usar conta de QA no navegador do domínio oficial, concluir o consentimento Google/callback PKCE e verificar sessão, reload e logout. Um 302 para Google de relatório anterior não substitui esse teste. Não solicitar senhas no chat.

Revisão jurídica humana pendente: identidade do responsável pelo tratamento, funcionamento do contato publicado, retenção/descarte/backups, atendimento a titulares, moderação/denúncias e direitos de conteúdo enviado pelos usuários. Antes de instalar analytics, rever finalidade, fornecedores, política e validade do consentimento armazenado. Os testes não declaram conformidade legal definitiva.

## Respostas de encerramento

- Melhorias previstas integradas: sim, localmente, com a conciliação descrita e sem substituir as fontes.
- Testes: resultados discriminados acima; testes remotos e skips não aprovados por inferência.
- Dados e imagens privados: controles validados localmente/isoladamente; proteção da produção atual não foi alterada nem certificada.
- Supabase atualizado: não nesta etapa; sete migrations preparadas para revisão/preflight.
- Google OAuth: fluxo completo pendente.
- Publicado: não; não houve commit, push, merge na main ou deploy.
- Prontidão: conjunto consolidado preparado para auditoria final. Publicação depende da aprovação dessa auditoria e dos gates operacionais reais, com autorização posterior do corte.
