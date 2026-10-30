# Ativação definitiva: sequência preparada, não executada

Data: 29/10/2026. Nenhum passo abaixo autoriza operação em produção. A autorização Google de teste recebida nesta conversa não autoriza deploy, SQL remoto, CAPTCHA hospedado ou alteração do OAuth de produção.

## Preflight realizado

Somente metadados e histórico de migrations foram consultados no Supabase hospedado, sem consultar pessoas, criar contas ou alterar dados. PostgreSQL 17.6; última migration registrada: `20261014020000_activate_private_project_images`. O schema `legal_private` e as RPCs de aceite ainda não existem remotamente. Não foi consultada a configuração administrativa hospedada de CAPTCHA; sua ativação não pode ser inferida da configuração local.

O hash do corpo de `save_car_project_atomic` é exatamente o baseline esperado pela migration de contadores: `15701d0fe6677e752c58cbef63bf3ab1`. As oito colunas de contadores esperadas existem. As tabelas ativas e as funções de mídia/contadores de comentários/seguidores consultadas existem. Sete tabelas legadas e `refresh_profile_cars_count(uuid)` não existem: as duas migrations locais foram corrigidas para ignorar somente essas ausências opcionais. Não foram recriadas tabelas antigas nem removidos guards da função atômica.

O ensaio isolado reproduziu essas ausências e aplicou a cadeia. Isso não comprova ausência de toda divergência de schema, de conflitos nos dados ou de contenção real de locks. Não foi feita nova auditoria completa nem clonagem de produção. O manifesto `migration-preflight.json` registra a ordem e SHA-256 dos arquivos; refazer o preflight específico se o banco ou os arquivos mudarem.

## Ordem exata das migrations pendentes

| Ordem | Arquivo | Dependência/efeito relevante |
| --- | --- | --- |
| 1 | `20261027120000_expand_modification_catalog.sql` | Catálogo existente; contém atualizações de catálogo, requer autorização própria do conjunto. |
| 2 | `20261027210000_modification_offers.sql` | Catálogo/categorias; cria ofertas e leitura pública autorizada. |
| 3 | `20261028010000_reviewed_catalog_offers.sql` | Tabela de ofertas do passo 2; acrescenta metadados de revisão. |
| 4 | `20261028120000_protect_derived_counters.sql` | Colunas existentes e corpo exato da RPC atômica; muda grants e INSERT da RPC. |
| 5 | `20261028121000_lock_legacy_tables.sql` | Fecha acesso às tabelas legadas se existirem; ausências são aceitas. |
| 6 | `20261028122000_notification_event_limits.sql` | Perfis, interações e notificações; cria recibos/quota e muda RPC. |
| 7 | `20261029010000_require_terms_acceptance.sql` | Deve vir depois das tabelas anteriores para também instalar nelas políticas/triggers de aceite. Instala par provisório não aprovado. |
| 8 | `20261029181952_approved_legal_versions_and_account_closure.sql` | Depende do passo 7; instala par aprovado/hashes, FK corrigida, retenção e expurgo. |

Nunca executar `bootstrap.sql` no banco existente. Não usar `db push` indiscriminadamente: o histórico remoto contém migrations históricas sem arquivo equivalente local. Não usar `migration repair` para ocultar divergências. Aplicação futura deve usar executor revisado que registre cada migration corretamente; não copiar SQL sem registrar o histórico. Não reexecutar migrations aditivas já aplicadas.

## Sequência operacional com gates

1. **Encerrar o teste Google isolado.** Conta de teste autorizada, login Google real de usuário novo e existente, primeiro aceite, recarga, refresh, logout e retomada de destino. Depois testar HTTPS em ambiente autorizado que use configuração isolada. Não usar identidade de produção como fixture nem chamar simulação de Google real.
2. **Congelar o conjunto revisado.** Conferir hashes dos oito SQLs e documentos (`node scripts/check-legal-snapshots.mjs`), diff autorizado, imagens e configuração. Repetir o preflight de metadados/histórico imediatamente antes da janela. Conferir schemas expostos no painel: `legal_private` deve ficar fora do Data API; `current_setting('pgrst.db_schemas')` retornou NULL e não confirma esse ajuste.
3. **Preparar build e recuperação, ainda sem promover.** Usar a chave pública do widget de produção em `.env.turnstile.production.pending`, com `NEXT_PUBLIC_TURNSTILE_MODE=production`; chave privada somente no Supabase Auth. `NEXT_PUBLIC_*` é incorporado no build. Não publicar chave local/dummy ou usar segredo em variável pública. Guardar identificação do build anterior, snapshot de configuração e backup autorizado; não contratar serviços. As 263 imagens precisam acompanhar o conjunto existente.
4. **Obter autorização operacional específica para os arquivos exatos, publicação e contas descartáveis de validação.** A liberação inclui mudanças de catálogo e segurança além do CAPTCHA. Agendamento de expurgo e configuração CAPTCHA são ações separadas. Sem essa autorização, manter tudo preparado localmente.
5. **Abrir janela de manutenção coordenada.** Controlar entrada nas rotas de escrita/aceite, informar usuários e evitar clientes antigos. Aplicar os oito arquivos na ordem revisada com `ON_ERROR_STOP`, limites de lock/statement e registro de migration. Se houver erro, parar antes do próximo arquivo; não continuar parcialmente e não ampliar grants. Conferir a função atômica, grants, RLS e objetos novos antes de liberar tráfego.
6. **Concluir os passos 7 e 8 consecutivamente e promover imediatamente o build compatível dentro da mesma janela.** Entre as duas migrations, ninguém pode aceitar o par provisório: o banco falha fechado até a versão aprovada. Antes da primeira migration de termos, o código novo também falha fechado pois as RPCs ainda não existem. Não há atualização sem risco de indisponibilidade apenas escolhendo um lado para publicar primeiro. A janela coordenada é necessária; não marcar aceites fictícios nem instalar bypass temporário.
7. **Validar o código publicado com o CAPTCHA do Auth ainda na configuração anterior.** Cadastro, confirmação por email, aceite idempotente, login, recuperação até alteração efetiva da senha descartável, Google novo/existente, sessão e destino interno; nenhuma conta real sem autorização. Conferir origem HTTPS, cookies Secure, callback e ausência de cache compartilhado. A presença do widget antes da ativação do Auth não comprova proteção contra chamadas diretas.
8. **Com autorização específica, configurar o segredo Turnstile correspondente no Supabase Auth e ativar CAPTCHA.** Conferir widget/domínio e build antes de ativar. Não existe necessidade de segredo Cloudflare no Next nem Siteverify duplicado. Clientes email antigos sem token falharão até recarregar; a janela deve contemplar isso.
9. **Testar proteção real e encerrar a janela.** Tokens ausente/inválido/expirado/reutilizado recusados pelo Auth; token novo aceito em cadastro/login/recuperação. Cada tentativa usa seu próprio token. Validar OAuth, aceite obrigatório, acesso negado sem aceite, sessão após recarga/refresh/logout e redirecionamentos. Google OAuth não recebe `captchaToken` pelo contrato atual do SDK; a proteção de aceite continua no servidor e no banco. Registrar evidência sem códigos, tokens, email ou secrets.
10. **Ativar operação de retenção somente após sua aprovação.** Definir fundamentos/revisores, destino do registro administrativo, ciclo de backups e agendador. Inspecionar primeiro; depois agendar o executor privado revisado. Ver `operacao-retencao.md`. A política máxima de cinco anos continua sujeita à revisão jurídica.

## Interrupção e reversão

| Situação | Ação preparada |
| --- | --- |
| Migration falha | Manter manutenção, interromper a sequência, registrar arquivo/erro sem dados pessoais e conferir rollback da transação desse arquivo. Os anteriores podem já ter sido confirmados; não reaplicar cegamente. |
| Build novo falha após termos instalados | Manter manutenção, corrigir ou promover build compatível já preparado. Build antigo sem aceite não é rollback compatível com as políticas novas. |
| CAPTCHA ativo rejeita todos | Verificar segredo/site key/domínio/rede. Se necessária reversão, obter autorização e restaurar coordenadamente a configuração Auth anterior e build compatível; desativar só o widget bloquearia os formulários. |
| Cloudflare indisponível | Email falha fechado, com opção de refazer. Google e sessões válidas podem continuar conforme disponibilidade e aceite; não inserir bypass de CAPTCHA. |
| RPC/versões indisponíveis | Recursos restritos falham fechados. Recuperação, documentos e saída permanecem disponíveis. Corrigir configuração; não aprovar versões em massa ou apagar recibos. |
| Restauração indispensável | Decisão separada e autorizada: indisponibilidade, perda de gravações posteriores, exclusões a reaplicar, sessões e Storage. Seguir restauração isolada em `operacao-retencao.md`. |

Não apagar histórico jurídico para reverter código, não desfazer RLS de propriedade/quota e não restaurar dados reais por conveniência. Uma versão jurídica anterior só pode voltar por migration administrativa revisada, preservando recibos e textos correspondentes.

## Limite conhecido para testes isolados

O código atual fixa `https://projetogaragem.com.br` quando `NODE_ENV=production`, inclusive para callbacks. Por isso o ensaio nativo usa `next dev` em cópia isolada (`http://127.0.0.1:3196`) e Supabase loopback. **Não iniciar um build de produção contra Auth de teste esperando callback local**: ele apontaria para o domínio real. HTTPS/preview necessita desenho/configuração isolada revisada, sem desviar o OAuth de produção. Não foi alterada essa regra global de domínio nesta etapa.

Documentação oficial conferida: [Google/Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha), [Backups](https://supabase.com/docs/guides/platform/backups). Os guias Next instalados de Route Handlers, autenticação e variáveis públicas foram consultados. Nenhuma alteração Next foi necessária nesta execução.

## Checklist de liberação — complemento da retomada de 29/10/2026

Conferência local desta retomada: os oito SHA-256 continuam iguais ao manifesto e os dois documentos jurídicos passaram no verificador. `.env.turnstile.production.pending` contém somente as duas variáveis públicas esperadas, com chave presente e modo `production`; não houve impressão da chave nem ativação. Isso não confirma domínio/pareamento com segredo no painel. O preflight remoto anterior não foi repetido e precisa ser atualizado durante a futura janela autorizada.

- [x] Ordem dos oito arquivos e dependências revisadas; todos possuem BEGIN/COMMIT próprios. Não envolver cegamente o conjunto em transação externa. Registro do histórico e cada confirmação devem usar executor revisado; ainda não há executor remoto aprovado nesta entrega.
- [x] Plano de compatibilidade e reversão acima preservado; migrations 7/8 e build compatível precisam da mesma janela. A indisponibilidade planejada evita exposição de clientes incompatíveis, mas não promete atualização sem interrupção.
- [x] Procedimento de expurgo complementado com dependências, modelo de timer não instalado e proposta de descarte de backups.
- [ ] Cliente Google de teste concluído; conta de teste autorizada; matriz Google real nova/existente concluída.
- [ ] HTTPS no ambiente isolado: certificado confiável, callback na origem autorizada e cookies Secure nas respostas efetivas, sem ignorar erros TLS. Não usar a regra atual de produção para apontar Auth de teste ao domínio real.
- [ ] Preflight remoto autorizado imediatamente antes da janela: histórico, objetos, hash da RPC atômica, índices/grants, schema privado fora do Data API e locks/transações longas. Validar os dados existentes contra constraints novas sem exportar dados pessoais. Parar em divergência.
- [ ] Artefato de build compatível aprovado com a chave pública correta; widget permite somente domínios necessários. Segredo correspondente entregue privadamente ao Supabase Auth somente na etapa de ativação autorizada. Nenhum segredo `NEXT_PUBLIC_*`.
- [ ] Responsável/janela, manutenção das escritas, backup recuperável autorizado, build anterior identificado e build novo compatível disponível. Não promover até esses gates estarem prontos.
- [ ] Smoke autorizado após código/migrations: cadastro com confirmação, login correto e incorreto, recuperação até troca efetiva, aceite autenticado/idempotente e negação a acesso antes do aceite.
- [ ] Smoke Google: identidade nova, existente aceita, existente sem aceite, conta já existente por email (observar vinculação real, não forçar merge), retorno ao destino original, recarga/refresh, logout/novo login e cancelamento. Não editar identidades reais como fixture.
- [ ] PKCE/callback: verifier ausente, código repetido, erro do provedor e destinos absolutos, `//`, barras invertidas e codificados. Nunca registrar códigos/verifiers/cookies em evidência. O sucesso precisa ser observado no serviço real.
- [ ] HTTPS publicado: origem canônica, callback e recuperação na allowlist exata, ausência de wildcard desnecessário, cookies Secure e atributos SameSite/Path compatíveis com SSR, sessão persistente e logout efetivo. Conferir respostas de sessão sem cache compartilhado; não exigir HttpOnly de cookies que o SDK SSR precisa ler no navegador.
- [ ] Ativação CAPTCHA autorizada depois do widget/build disponível; smoke com tokens ausente, inválido, expirado, reutilizado e novo. Conferir fluxo completo antes de liberar o tráfego. Não trocar a configuração Google de produção durante testes isolados.
- [ ] Operação aprovada: psql durável/CA/principal, inspeção revisada, destino mínimo de exclusões, inventário/janela de backups, alertas e revisão jurídica dos prazos. Somente então agendar.

Mudanças recentes de documentação conferidas nesta retomada: descontinuação de cifras CBC antigas nos endpoints HTTP ([changelog TLS](https://supabase.com/changelog/cbc-tls-ciphers-deprecated)); manter clientes/TLS atuais. A alteração self-hosted de `API_EXTERNAL_URL` ([changelog Auth](https://supabase.com/changelog/47093-self-hosted-supabase-api-external-url-to-include-auth-v1)) reforça conferir a URI efetivamente emitida pelo GoTrue instalado; não concatenar caminhos por suposição ou mudar a stack já aprovada sem necessidade. Nenhum desses avisos justificou alteração de produção ou atualização de dependências.


## Atualização após segundo login real

Consultar `continuacao-segundo-login.md` e `google-real-status.json`: cliente Google e login novo/existente com aceite estão comprovados, incluindo segundo acesso sem novo aceite, logout e preservação do recibo. PKCE sem verifier/incorreto, replay e refresh explícito passaram no serviço real. HTTPS/Secure passou com cliente Node e CA privada explicitamente confiada; o fluxo integral HTTPS de navegador e sua renovação automática após expiração permanecem pendentes. Segredo antigo aguarda desativação humana. Os itens históricos de “cliente ainda não concluído” acima foram superados; não recriar o cliente.

Conferência local atual em `preparacao-local-conferida.json`: oito hashes e transações próprios íntegros; nenhum novo preflight remoto. A sequência de manutenção, migrations/build e ativação Turnstile permanece a mesma, sem autorização de execução implícita. Retenção/backups continuam com os gates operacionais de `operacao-retencao.md`; não há registro externo persistente de exclusões instalado.
