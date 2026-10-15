# Cookies e proteção jurídica básica — revisão local

**Data:** 13/10/2026. **Branch:** `codex/performance-etapa-1`. Sem commit, push, merge, deploy ou build remoto. As otimizações anteriores de prefetch e da fronteira Server/Client do login foram preservadas.

## Verificações antes da edição

- A aplicação não contém importação nem carregamento de Google Analytics, `gtag`, Google Tag Manager ou outro SDK de analytics no código verificado. Nenhum script de estatísticas foi adicionado nesta tarefa.
- O consentimento já era salvo em `localStorage` sob `projeto-garagem:cookie-consent`, com `analytics: false` e `marketing: false`; não havia controle de alteração dessa categoria. A nova interface mantém a leitura dos registros válidos anteriores e permite mudar `analytics` depois.
- O endereço `ggtopxbox1@gmail.com` já constava nas páginas `/terms` e `/privacy`. Foi reutilizado como contato para denúncias e solicitações de dados. A entrega de mensagens a essa caixa não foi verificada tecnicamente.
- A navegação pública, autenticação via Supabase e hospedagem Netlify são referidas no código e no texto anterior da política. Prazos específicos de retenção, descarte de backups e inventário completo dos dados dos provedores não foram comprovados; a política deixou de afirmá-los como fatos.

## Implementação

| Arquivo | Alteração |
|---|---|
| `src/components/privacy/cookie-consent.tsx` | Aviso compacto com título, descrição, três botões e links solicitados. “Aceitar” salva `analytics: true`; “Recusar” salva `false`; “Configurar” inicia desligado e permite escolha separada. Nenhum analytics é carregado. |
| `src/app/template.tsx` | Remove `min-h-0` do wrapper da rota: ele agora cresce com páginas longas, mantendo o rodapé depois do conteúdo. Isso resolve a sobreposição que interceptava o botão “Gerenciar cookies”. |
| `src/app/terms/page.tsx` | Mantém as seções existentes e explicita direitos e autorizações sobre material enviado, proibição de uso indevido de obras, responsabilidade do usuário nos limites legais e análise de denúncias com possibilidade de remoção. Usa o contato existente e não exclui a responsabilidade legal da plataforma. |
| `src/app/privacy/page.tsx` | Explica categorias de dados, cookies essenciais, preferência opcional e revogação, provedores, direitos e contato. Informa que Google Analytics não está integrado atualmente. Retira afirmações não verificadas sobre prazos e backups. |

## Validação

Build local de produção (`next build`) e typecheck passaram. ESLint dos quatro arquivos alterados e do script de teste passou. Os seis testes públicos Playwright existentes passaram em Mobile e Desktop. A [validação funcional](evidencias-cookies-juridico-2026-10-13/resultado.json) usou `next start` local, Chrome Playwright, janelas de 390×844 e 1366×768: conferiu textos, navegação dos links do aviso, “Aceitar”, “Recusar”, “Configurar”, preferência inicialmente desligada, persistência após reload, revogação e abertura do diálogo pelo rodapé em `/`, `/privacy` e `/terms`. Também verificou validação local do login e cadastro, sem envio remoto. Não houve requisição a serviços de analytics, overflow horizontal nas páginas testadas nem erro de runtime. O script está em [`validacao.cjs`](evidencias-cookies-juridico-2026-10-13/validacao.cjs).

Screenshots: [inicial Mobile](evidencias-cookies-juridico-2026-10-13/mobile-inicial.png), [inicial Desktop](evidencias-cookies-juridico-2026-10-13/desktop-inicial.png), [preferências Mobile](evidencias-cookies-juridico-2026-10-13/mobile-configurar.png), [preferências Desktop](evidencias-cookies-juridico-2026-10-13/desktop-configurar.png), [Termos Mobile](evidencias-cookies-juridico-2026-10-13/mobile-terms.png), [Termos Desktop](evidencias-cookies-juridico-2026-10-13/desktop-terms.png), [Privacidade Mobile](evidencias-cookies-juridico-2026-10-13/mobile-privacy.png) e [Privacidade Desktop](evidencias-cookies-juridico-2026-10-13/desktop-privacy.png).

## Questões para revisão jurídica e operacional

1. Confirmar a identidade do responsável pelo tratamento, a operação do endereço de contato e os prazos/processos de retenção e atendimento a solicitações. O repositório não comprova esses detalhes.
2. A opção de estatísticas hoje apenas registra uma preferência; nenhum tratamento analítico decorre dela. **Antes de instalar Google Analytics ou serviço equivalente**, revisar finalidade, fornecedor, categorias de dados, política e validade do consentimento existente. Não usar automaticamente autorizações antigas para uma integração nova sem essa revisão.
3. Revisar a redação final dos Termos e da Política conforme a operação real, especialmente moderação de denúncias e direitos dos titulares. A [orientação da ANPD sobre cookies](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais) recomenda controle claro e revogação facilitada; os [direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares) incluem revogar consentimento. A responsabilidade por conteúdo de terceiros depende da legislação aplicável e não foi afastada pelos Termos.

Nenhuma medição Lighthouse nova foi solicitada nesta revisão visual e jurídica. A mudança do aviso pode alterar o LCP de primeira visita; esse impacto permanece sem quantificação comparável. O checkout local não executou login real nem enviou dados a serviços externos.
No viewport Mobile testado, o aviso fixo cobre temporariamente o botão “Entrar” antes da escolha inicial. O formulário foi validado após “Recusar”; a necessidade de decidir antes de acionar esse botão é uma limitação de interação da primeira visita a considerar em revisão de UX.
