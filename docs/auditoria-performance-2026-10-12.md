# Coleta de desempenho — Projeto Garagem

**Data da coleta:** 2026-10-12 (horários brutos em UTC nos JSON)  
**Site:** https://projetogaragem.com.br  
**Escopo:** execução de medições e registro de dados. Sem análise, hipóteses ou recomendações.

## 1. Ambiente e ferramentas utilizadas

- Google PageSpeed Insights API: consultada para quatro páginas acessíveis, em Mobile e Desktop. As oito respostas foram HTTP 429; corpos brutos preservados.
- Lighthouse CLI: versão 13.5.0, executado pelo terminal com Chrome for Testing 149.0.7827.55; uma execução por página e modo. Relatórios JSON completos preservados.
- Playwright: Chromium 149.0.7827.55, sessões isoladas sem login, em cinco viewports por página. Nenhuma interação que crie conta ou altere dados. CPU/rede sem limitação explícita no Playwright.
- O código de coleta do Playwright está em [collect.cjs](evidencias-performance-2026-10-12/playwright/collect.cjs); a coleta acessou somente o site publicado. Nenhuma dependência do projeto foi alterada; o CLI Lighthouse foi executado de cache via npx.
- Mobile Lighthouse: 412×823, device scale factor 1, rede simulada RTT 150 ms e throughput 1638.4 Kbps, CPU ×4. Desktop Lighthouse: 1350×940, RTT 40 ms, throughput 10240 Kbps e CPU ×1. Método Lighthouse: simulate. User-Agent consta no JSON bruto.
- Playwright usou device scale factor 1. Em 360×800, 390×844 e 768×1024 foi habilitado contexto mobile/touch; em 1366×768 e 1920×1080, contexto desktop. Perfis de CPU/rede: sem throttling explícito. Resultados são emulação por navegador, não dispositivos físicos.

## 2. Páginas e acessibilidade

| Página | URL testada | Estado de acesso nesta coleta |
|---|---|---|
| Inicial | [/] (https://projetogaragem.com.br/) | HTTP 200; testada |
| Login | [/login](https://projetogaragem.com.br/login) | HTTP 200; testada |
| Cadastro | [/register](https://projetogaragem.com.br/register) | HTTP 200; testada |
| Exploração | [/explorar](https://projetogaragem.com.br/explorar) | HTTP 200; testada; interface exibiu estado sem resultados/projetos |
| Página pública de projeto | URL pública não localizada na exploração consultada | Não testada |
| Página pública de perfil | URL pública não localizada durante os acessos | Não testada |

## 3. Lighthouse — métricas por página e perfil

Uma execução por modo, sem repetição/mediana. Valores são displayValue do JSON Lighthouse. TBT é registrado como TBT; não é INP.

| Página | Modo | Score | FCP | LCP | CLS | TBT | Speed Index | Requisições | Total size | INP real |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Inicial | mobile | 56 | 2.0 s | 3.6 s | 0.01 | 2,470 ms | 5.5 s | 47 | Total size was 412 KiB | Não disponível |
| Inicial | desktop | 70 | 0.9 s | 1.4 s | 0.016 | 490 ms | 2.2 s | 49 | Total size was 535 KiB | Não disponível |
| Login | mobile | 46 | 2.2 s | 4.8 s | 0 | 5,050 ms | 5.6 s | 49 | Total size was 460 KiB | Não disponível |
| Login | desktop | 78 | 0.6 s | 0.7 s | 0.017 | 470 ms | 1.5 s | 53 | Total size was 464 KiB | Não disponível |
| Cadastro | mobile | 34 | 3.1 s | 7.4 s | 0 | 6,450 ms | 7.1 s | 43 | Total size was 390 KiB | Não disponível |
| Cadastro | desktop | 90 | 0.6 s | 0.9 s | 0.007 | 200 ms | 1.9 s | 47 | Total size was 393 KiB | Não disponível |
| Exploração | mobile | 61 | 1.6 s | 3.4 s | 0 | 2,280 ms | 4.1 s | 48 | Total size was 390 KiB | Não disponível |
| Exploração | desktop | 77 | 0.6 s | 1.0 s | 0.016 | 410 ms | 2.1 s | 49 | Total size was 366 KiB | Não disponível |

O endpoint PSI não forneceu dados de campo; não houve dados reais de INP nesta coleta. Não se apresenta estimativa de INP.

### Relatórios Lighthouse brutos

- [Inicial — mobile JSON](evidencias-performance-2026-10-12/lighthouse/inicio-mobile.json) — fetchTime 2026-10-12T20:19:24.948Z.
- [Inicial — desktop JSON](evidencias-performance-2026-10-12/lighthouse/inicio-desktop.json) — fetchTime 2026-10-12T20:20:00.236Z.
- [Login — mobile JSON](evidencias-performance-2026-10-12/lighthouse/login-mobile.json) — fetchTime 2026-10-12T20:20:41.300Z.
- [Login — desktop JSON](evidencias-performance-2026-10-12/lighthouse/login-desktop.json) — fetchTime 2026-10-12T20:21:10.710Z.
- [Cadastro — mobile JSON](evidencias-performance-2026-10-12/lighthouse/cadastro-mobile.json) — fetchTime 2026-10-12T20:21:44.568Z.
- [Cadastro — desktop JSON](evidencias-performance-2026-10-12/lighthouse/cadastro-desktop.json) — fetchTime 2026-10-12T20:22:11.413Z.
- [Exploração — mobile JSON](evidencias-performance-2026-10-12/lighthouse/explorar-mobile.json) — fetchTime 2026-10-12T20:22:47.691Z.
- [Exploração — desktop JSON](evidencias-performance-2026-10-12/lighthouse/explorar-desktop.json) — fetchTime 2026-10-12T20:23:38.417Z.
Logs individuais estão na mesma pasta com extensão .log; resumo em [summary.json](evidencias-performance-2026-10-12/lighthouse/summary.json).

## 4. PageSpeed Insights

| Página | Mobile | Desktop |
|---|---|---|
| Inicial | HTTP 429 | HTTP 429 |
| Login | HTTP 429 | HTTP 429 |
| Cadastro | HTTP 429 | HTTP 429 |
| Exploração | HTTP 429 | HTTP 429 |

Respostas recebidas: Quota exceeded for quota metric Queries and limit Queries per day (HTTP 429). Não foram retornadas auditorias PSI nem métricas. Corpos originais em [psi](evidencias-performance-2026-10-12/psi/); resumo em [summary.json](evidencias-performance-2026-10-12/psi/summary.json).

## 5. Playwright — por página e resolução

Cada linha é uma sessão/navegação isolada. DOMContentLoaded e load são milissegundos desde o início da navegação. Requisições e bytes são somas das entradas Resource Timing expostas pela página. Largura client/scroll e overflow são valores medidos do documento. Console conta error e warning. HTTP ≥400 são respostas vistas pelo listener.

| Página | Viewport | HTTP | DOMContentLoaded ms | Load ms | Recursos | Transfer bytes | Largura client/scroll | Overflow horizontal | Skeleton/aria-busy visível | Requests falhadas | Console error/warning | HTTP ≥400 | Screenshot DOMContentLoaded | Screenshot carregada |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---|---|
| Inicial | 360x800 | 200 | 1168 | 2331 | 38 | 359046 | 360/360 | não | 0 | 4 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/inicio-android-compacto-360x800-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/inicio-android-compacto-360x800-settled.png) |
| Inicial | 390x844 | 200 | 902 | 2173 | 39 | 377986 | 390/390 | não | 0 | 5 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/inicio-iphone-moderno-390x844-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/inicio-iphone-moderno-390x844-settled.png) |
| Inicial | 768x1024 | 200 | 1384 | 4866 | 39 | 395129 | 768/768 | não | 0 | 2 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/inicio-tablet-768x1024-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/inicio-tablet-768x1024-settled.png) |
| Inicial | 1366x768 | 200 | 1536 | 4516 | 41 | 515328 | 1366/1366 | não | 0 | 1 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/inicio-notebook-1366x768-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/inicio-notebook-1366x768-settled.png) |
| Inicial | 1920x1080 | 200 | 2274 | 5130 | 41 | 515439 | 1920/1920 | não | 0 | 2 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/inicio-desktop-fullhd-1920x1080-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/inicio-desktop-fullhd-1920x1080-settled.png) |
| Login | 360x800 | 200 | 843 | 2347 | 36 | 352492 | 360/360 | não | 0 | 2 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/login-android-compacto-360x800-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/login-android-compacto-360x800-settled.png) |
| Login | 390x844 | 200 | 903 | 2639 | 35 | 365772 | 390/390 | não | 0 | 0 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/login-iphone-moderno-390x844-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/login-iphone-moderno-390x844-settled.png) |
| Login | 768x1024 | 200 | 929 | 2900 | 37 | 371814 | 768/768 | não | 0 | 0 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/login-tablet-768x1024-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/login-tablet-768x1024-settled.png) |
| Login | 1366x768 | 200 | 1152 | 3522 | 45 | 445950 | 1366/1366 | não | 0 | 5 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/login-notebook-1366x768-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/login-notebook-1366x768-settled.png) |
| Login | 1920x1080 | 200 | 1427 | 3652 | 45 | 446111 | 1920/1920 | não | 0 | 7 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/login-desktop-fullhd-1920x1080-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/login-desktop-fullhd-1920x1080-settled.png) |
| Cadastro | 360x800 | 200 | 649 | 1965 | 34 | 352579 | 360/360 | não | 0 | 4 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/cadastro-android-compacto-360x800-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/cadastro-android-compacto-360x800-settled.png) |
| Cadastro | 390x844 | 200 | 593 | 1795 | 35 | 370917 | 390/390 | não | 0 | 4 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/cadastro-iphone-moderno-390x844-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/cadastro-iphone-moderno-390x844-settled.png) |
| Cadastro | 768x1024 | 200 | 612 | 1970 | 35 | 371676 | 768/768 | não | 0 | 2 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/cadastro-tablet-768x1024-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/cadastro-tablet-768x1024-settled.png) |
| Cadastro | 1366x768 | 200 | 810 | 2875 | 37 | 372349 | 1366/1366 | não | 0 | 5 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/cadastro-notebook-1366x768-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/cadastro-notebook-1366x768-settled.png) |
| Cadastro | 1920x1080 | 200 | 608 | 2569 | 37 | 370820 | 1920/1920 | não | 0 | 3 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/cadastro-desktop-fullhd-1920x1080-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/cadastro-desktop-fullhd-1920x1080-settled.png) |
| Exploração | 360x800 | 200 | 1779 | 2656 | 39 | 343993 | 360/360 | não | 0 | 3 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/explorar-android-compacto-360x800-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/explorar-android-compacto-360x800-settled.png) |
| Exploração | 390x844 | 200 | 1548 | 3594 | 39 | 361603 | 390/390 | não | 0 | 1 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/explorar-iphone-moderno-390x844-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/explorar-iphone-moderno-390x844-settled.png) |
| Exploração | 768x1024 | 200 | 1377 | 3574 | 36 | 350300 | 768/768 | não | 0 | 3 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/explorar-tablet-768x1024-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/explorar-tablet-768x1024-settled.png) |
| Exploração | 1366x768 | 200 | 3678 | 4925 | 42 | 365220 | 1366/1366 | não | 0 | 7 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/explorar-notebook-1366x768-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/explorar-notebook-1366x768-settled.png) |
| Exploração | 1920x1080 | 200 | 2028 | 4310 | 42 | 364479 | 1920/1920 | não | 0 | 3 | 0 | 0 | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/explorar-desktop-fullhd-1920x1080-domcontentloaded.png) | [PNG](evidencias-performance-2026-10-12/playwright/screenshots/explorar-desktop-fullhd-1920x1080-settled.png) |

Capturas carregadas foram feitas após networkidle ou, se não alcançado em 15 s, após espera adicional de 2 s; o estado correspondente está em [summary.json do Playwright](evidencias-performance-2026-10-12/playwright/summary.json). A captura DOMContentLoaded foi feita após o evento.

## 6. Falhas de carregamento, console e respostas

- Nas 20 sessões Playwright, o documento principal respondeu HTTP 200; respostas HTTP ≥400 registradas: zero em cada sessão.
- Erros e avisos de console: zero em cada sessão.
- Eventos requestfailed: quantidades por sessão constam na tabela; URLs, métodos e texto de falha estão registrados integralmente no JSON Playwright.
- O resumo bruto também lista URLs de recursos, iniciador, duração e tamanhos Resource Timing por sessão.
- Logs individuais do Lighthouse estão ao lado dos JSON brutos.

## 7. Limitações registradas

- PSI não entregou dados por quota; respostas completas preservadas.
- Lighthouse: uma execução por rota e modo; não foram feitas três execuções nem mediana.
- INP real não disponível.
- Nenhuma URL pública de projeto ou perfil foi localizada para medição.
- Resource Timing contém os valores expostos à página pelo navegador; bytes não expostos não entram nas somas reportadas.
- Viewports Playwright e perfis Lighthouse são simulados; não houve medições em hardware físico.

## 8. Evidências coletadas

- Lighthouse: oito JSON e oito logs; [resumo JSON](evidencias-performance-2026-10-12/lighthouse/summary.json).
- PageSpeed Insights: oito corpos JSON HTTP 429 e [resumo JSON](evidencias-performance-2026-10-12/psi/summary.json).
- Playwright: [resumo JSON com tempos, rede e falhas](evidencias-performance-2026-10-12/playwright/summary.json), [script de coleta](evidencias-performance-2026-10-12/playwright/collect.cjs) e 40 screenshots PNG em [screenshots](evidencias-performance-2026-10-12/playwright/screenshots/).
