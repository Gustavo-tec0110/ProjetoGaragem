> Atualização posterior: controle do navegador recuperado por reinicialização suportada; recuperação e senha concluídas; CAPTCHA hospedado ativado e validado. Ver `fechamento-autenticacao-20261030.md`. As pendências de autenticação descritas abaixo são históricas.

# Diagnóstico focado do Turnstile 300030 — 30/10/2026

## Resultado comprovado e limite

A falha anteriormente observada ocorre no desafio Cloudflare, antes da emissão do token. O formulário exibiu a exigência de concluir a verificação, e seu código retorna antes de chamar o Supabase quando o token está ausente. Não é evidência de rejeição de um token legítimo pelo Supabase.

A Cloudflare documenta a família `300*` como falha genérica do desafio com detecção de comportamento automatizado. Os demais dígitos são internos; não publica uma causa individual exclusiva para `300030`. Sua documentação também declara que navegadores automatizados e frameworks de automação não são suportados para resolver desafios de produção, e que navegadores embutidos têm suporte limitado.

Isso comprova uma limitação do ambiente de teste disponível. Não comprova que o problema seja exclusivo dele: a comparação no Chrome/Firefox ainda está pendente. Nenhuma falha do Projeto Garagem foi demonstrada nos itens conferidos abaixo; nenhum ajuste especulativo foi publicado.

## Conferências realizadas nesta retomada

- `/login`, `/register` e `/forgot-password` publicados: HTTP 200, todos os scripts dessas páginas recuperados com HTTP 200, chave pública igual à do widget existente e URL oficial de carregamento Turnstile presentes no código distribuído.
- CSP efetiva: `object-src 'none'; base-uri 'self'; frame-ancestors 'none'`. Não há `script-src`, `frame-src`, `connect-src` ou `default-src` bloqueando Turnstile, nem CSP em meta nas páginas inspecionadas. `frame-ancestors` restringe quem incorpora o site; não proíbe os frames que o site carrega.
- API JavaScript oficial da Cloudflare acessível por HTTP 200 a partir do host de execução. Isso não substitui rastreamento da rede dentro do navegador do visitante.
- Preflight CORS dos endpoints públicos Auth de cadastro, senha e recuperação: HTTP 200, origem e cabeçalhos necessários permitidos. Nenhum POST de autenticação foi enviado para fabricar sucesso.
- `Turnstile`: o loader compartilha uma única Promise; o efeito depende do setter estável de estado, da geração e do retry. Digitar email/senha não altera essas dependências. O cleanup remove o widget, e uma resolução tardia do loader não renderiza em componente desmontado.
- Token: erro, expiração e timeout limpam o valor. Após cada tentativa enviada, os formulários reiniciam a geração. O callback de sucesso fornece o token ao estado. Não há chamada Siteverify própria no frontend consumindo o token antes do Auth.
- Cadastro e login passam `options.captchaToken`; recuperação passa `captchaToken`. O SDK instalado serializa esse valor em `gotrue_meta_security.captcha_token`. Trata-se de conferência de código/artefato, não de aprovação de token real no backend hospedado.
- Domínio e pareamento das chaves já conferidos no painel oficial na execução anterior: evidência preservada, sem recriar widget ou revelar segredo. Não se repetiram migrations, backups, cadastro ou testes OAuth já aprovados.

Os resultados HTTP/CORS efetivos estão em `turnstile-http-diagnostico-20261030.json`. A coleta ocorreu em 30/10 America/Bahia; o timestamp UTC pode indicar 31/10.

## Impedimento de controle e alternativa

Nesta retomada a integração ainda lista as quatro abas existentes, mas falha ao obter uma aba e executar observações, tanto pela interface de acessibilidade quanto pela interface DOM documentada: `browser.user is unavailable`. A API direta documentada lista as abas, mas também falha ao obter controle delas. Não foi contornado controle de acesso nem usado navegador externo por mecanismo não suportado.

Isso é uma falha concreta da integração; não comprova que o proprietário desativou alguma configuração. O pedido inicial para reativar configurações foi corrigido. Só estão expostos o navegador integrado e a superfície de Apps; Chrome/Firefox não estão disponíveis para controle nesta sessão.

Não foram repetidos desafios, alterados user agent/fingerprinting, removidas proteções, usadas chaves dummy em produção ou consumidos tokens administrativos. A alternativa oficial é verificar o mesmo formulário em um navegador convencional suportado. Foi solicitada somente essa comparação, sem senha ou token no chat.

## Dependências para terminar

1. Em Chrome/Firefox, observar se o widget em `https://projetogaragem.com.br/forgot-password` conclui. Se falhar, registrar somente código de erro; o [diagnóstico oficial de compatibilidade](https://debug.challenges.cloudflare.com/) é a próxima ferramenta indicada pela Cloudflare. Não trocar configurações do widget às cegas.
2. Se concluir, enviar a recuperação da conta descartável existente e conferir o email real. A alteração da senha precisa de execução humana pela política da ferramenta; não pedir nem guardar a senha.
3. Validar login e segundo login por senha, preservação do recibo e logout. Somente então considerar a ativação já autorizada do CAPTCHA hospedado, seguida da operação legítima e das rejeições de token ausente/inválido/reutilizado.
4. Manter a retenção e a limpeza condicionadas aos gates existentes. Nenhuma exclusão ou revogação efetuada nesta retomada. Nenhuma decisão jurídica ou ciclo de backups foi inventado para liberar o agendamento.

## Referências oficiais consultadas

- [Erros e diagnóstico](https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/).
- [Ambientes suportados](https://developers.cloudflare.com/cloudflare-challenges/reference/supported-browsers/).
- [CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/).
- [Configuração, callbacks, retry e refresh](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/).
- [Siteverify, validade de cinco minutos e uso único](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

Nenhuma alteração de código, deploy ou configuração hospedada foi executada: ainda não há correção comprovadamente necessária nem um desafio legítimo concluído que permita ativação segura.
