# Fechamento efetivo da autenticação — 30/10/2026

**Autenticação validada e Turnstile hospedado ativo. Retenção destrutiva e revogação final de credenciais temporárias continuam condicionadas aos requisitos abaixo.** Horários UTC das evidências podem indicar 31/10; a execução ocorreu em 30/10 America/Bahia.

## Resultados efetivos

1. Recuperado o controle da aba existente por reinicialização suportada da conexão da ferramenta. O desafio já concluído foi utilizado sem novo desafio manual. Envio real de recuperação, registro de `recovery_sent_at` no Supabase e email recebido no Gmail autorizado.
2. Link oficial consumido e redirecionamento para `/reset-password?auth_redirect=1`, sem código privado na URL final. Proprietário preencheu e enviou a nova senha por exigência da ferramenta. A aplicação só redireciona ao login após o Auth aceitar a atualização. Login real posterior chegou à garagem. Nenhuma senha foi lida, exportada ou persistida pelo agente.
3. Logout real deixou zero sessões da conta descartável. Segundo login real foi feito após ativação do CAPTCHA, com a credencial já preenchida pelo navegador e token legítimo novo, sem pedir novo aceite.
4. CLI oficial aplicou exclusivamente as propriedades declaradas em `auth.captcha`. Consulta remota posterior confirmou `enabled=true` e `provider=turnstile`; a comparação das demais propriedades declaradas não mostrou alteração. Configuração mínima de reversão preparada privadamente para restaurar `enabled=false` em caso de bloqueio; não foi necessária.
5. Backend hospedado recusou token ausente e inválido em login, cadastro e recuperação: seis respostas HTTP 400 com `captcha_failed`. Prova em `captcha-backend-negativos-20261030.json`. Não foram usadas chaves dummy, contas novas ou APIs administrativas como simulação de sucesso.
6. Recuperação pelo formulário publicado com CAPTCHA hospedado ativo também foi aceita; novo horário de envio confirmado no banco. Google existente voltou à garagem com a proteção ativa e sem novo aceite. Logout final confirmado no banco: zero sessões em cada uma das duas contas autorizadas, um recibo aprovado em cada uma. Garagem anônima voltou a exigir login.

O erro `300030` não foi corrigido por mudança especulativa de código: desafios legítimos passaram posteriormente no mesmo navegador integrado. A Cloudflare documenta a família `300*` como falha do desafio, sem causa pública exclusiva para os dígitos restantes; navegadores automatizados não têm suporte para resolver desafios de produção. Não foi obtida comparação independente com Chrome/Firefox. Não há evidência de defeito do site que justificasse enfraquecer a proteção.

## Monitoramento e retenção

Migration adicional **somente operacional**, `20261031023347_retention_operational_monitor.sql`, aplicada separadamente das oito migrations anteriores, que não foram repetidas. Habilita o pg_cron existente no produto e instala `garagem-retention-monitor` no próprio Supabase, de hora em hora, com timeout de 15 segundos. Execuções reais do agendador passaram; horário final reconferido em `0 * * * *`.

O job lê os recibos somente para produzir contagens. Não chama a função de expurgo nem altera recibos. Grava apenas horário, elegíveis, exceções vigentes e exceções vencidas em schema privado, sem IDs, emails, textos, tokens ou credenciais. Telemetria e histórico desse job têm limite técnico de 30 dias; isso não define prazo jurídico para recibos, backups ou registros de exclusões. Outros jobs e seus históricos não são eliminados.

Falhas ficam registradas em `cron.job_run_details`. A view privada `operations_private.retention_health` indica `healthy`, `attention`, `failed`, `disabled` ou `stale`; dados com mais de 90 minutos ficam obsoletos. Elegíveis/exceções vencidas geram aviso nos logs Postgres. **Não há envio de alerta externo**: canal e destinatário não foram definidos. A tabela tem RLS e nenhum grant para clientes; funções usam SECURITY INVOKER e search_path fixo. Advisory novo apenas informativo pela ausência intencional de políticas de clientes.

Teste focado novo passou: recibos preservados, contagens, falha, desativação e atraso detectados, limpeza restrita à própria telemetria e negação a anon/authenticated. O stub local do scheduler não foi confundido com as execuções nativas verificadas em produção. ESLint focado e diff check passaram. Não houve necessidade de novo build do aplicativo.

**Expurgo permanece desativado, com fila elegível zero.** Ainda faltam fundamentos/prazos revisados, destino e duração do registro externo de exclusões e ciclo real das cópias para restauração. As contagens do monitor não são um registro de exclusões e não impedem sozinhas a reintrodução de dados após restore. Histórico operacional agregado privado também foi materializado em `artifacts/production-operations/`, fora do Git. Backups previamente validados do banco e dos 90 objetos foram preservados, sem ensaio repetido.

## Limpeza executada e pendência concreta

- Dois timers locais de fixtures parados e desabilitados; services encerrados. O antigo runtime em `/tmp` já estava ausente antes desta limpeza.
- Candidato derivado `artifacts/auth-release/candidate-9Smm6K` removido após conferir zero dependências de processos. Symlinks compartilhados não foram seguidos. Fonte, imagens originais, evidências e backup real preservados.
- Cliente de teste conferido no console: projeto `garagem-oauth-teste`, cliente `Garagem OAuth Local Isolado`, callback exclusivamente loopback. Distinto do cliente usado no OAuth de produção. Dois segredos temporários ainda ativos, mascarados `****xFjk` e `****sywp`; painel deixado pronto e solicitada desativação humana, conforme o controle da ferramenta sobre alterações de credenciais. Não criar substitutos.
- Cópia privada da credencial e widget Cloudflare exclusivamente local preservados até a revogação segura. Nenhuma conta real, conta descartável hospedada, recurso de produção ou backup foi excluído na limpeza.

## Limites dos testes

Cadastro existente e confirmação permanecem aprovados. Não foi criada outra conta para repetir criação positiva após a ativação; as recusas de CAPTCHA no endpoint de cadastro foram efetivamente testadas. Replay de token CAPTCHA não foi exercitado em produção, e não é apresentado como teste aprovado. A jornada pública de recuperação, alteração pessoal da senha, login, segundo acesso, logout, Google e os testes hospedados descritos acima são reais.

Evidência agregada: `fechamento-autenticacao-20261030.json`. Credenciais e respostas privadas da configuração ficam somente nos diretórios ignorados. Nenhuma alteração estética, dependência, catálogo ou imagem original foi realizada.
