# Segurança operacional e custos

Data da auditoria: 27 de setembro de 2026. Este documento descreve o código do Projeto Garagem; não substitui as configurações do Supabase e Netlify.

## Ameaças e controles

| Vetor | Recurso afetado | Risco antes | Controle aplicado | Risco residual |
| --- | --- | --- | --- | --- |
| Imagem grande, falsa ou com pixels excessivos | Storage, banda e CPU | Limite de 5 MB/MIME apenas no browser e bucket | Limite de 5 MB, JPG/PNG/WebP, decodificação com Sharp, máximo 4096×4096/16 MP e regravação WebP no endpoint | Escritas diretas na API do Storage ainda dependem das políticas do bucket; não há antivírus de conteúdo |
| Muitas imagens por conta | Storage e egress | Sem quota total | 150 objetos ou 500 MB por conta no bucket; lock transacional por conta; 16 uploads/10 min; 12 fotos por projeto | Objetos órfãos continuam contando até serem removidos |
| Criação/edição em massa | Database e funções | Sem limite de frequência ou máximo de projetos | 4 criações/h, 24 edições/h, 25 projetos por conta, payload máximo de 512 KB | Ataque distribuído entre contas requer proteção de Auth/WAF do provedor |
| Comentários, likes e follows em rajada | Database, triggers e notificações | Sem limite de frequência | 8 comentários/10 min; 45 ações sociais/10 min; limites persistidos por usuário | O toggle legado faz leitura antes da escrita; constraints/RLS continuam essenciais |
| Busca automatizada | Database e funções | Endpoint público sem limite por IP | 30 sugestões/minuto por IP, consulta curta e resultado fixo | O limite em memória é por instância serverless; um WAF/CDN é a camada global recomendada |
| Payloads/arrays gigantes | CPU, memória e banco | `formData`/JSON sem teto | Body de projeto 512 KB, máximo 80 campos, 100 KB por JSON, itens truncados por categoria | Requests sem `Content-Length` são rejeitados apenas após parsing; a plataforma também deve limitar bodies |
| Leitura/scraping de catálogo | Database e banda | Algumas leituras de catálogo chegam a 120/140 linhas | Limites existentes de consultas e cache público foram mantidos; endpoint de sugestões limitado | Páginas públicas seguem acessíveis por design e podem ser cacheadas pelo CDN |

## Limites escolhidos

- Imagens: 5 MB por arquivo, 4096 px por lado e 16 MP: suficiente para fotos automotivas comuns e pequeno o bastante para conter decodificação e egress.
- Conta: 150 imagens ou 500 MB total, 25 projetos e 12 imagens por projeto: permite uma garagem ativa sem permitir crescimento ilimitado por uma única conta.
- Escritas: as janelas persistidas no Supabase são deliberadamente mais permissivas para uso humano e mais restritivas para operações com alto custo (uploads, projetos e comentários).

## RLS e secrets auditados

As migrations existentes restringem alteração/exclusão de perfis, carros, fotos, comentários, likes, saves, follows e objetos do Storage ao usuário dono, com leitura pública apenas onde a feature exige. A nova migration mantém a pasta do usuário, exige extensão permitida e aplica quota antes do insert no Storage.

O repositório usa somente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no browser. Não há service-role no código ou no `.env.example`. A chave anon é pública por definição; a segurança depende de RLS. Não adicione service-role ao frontend.

## Passos manuais obrigatórios/recomendados

1. **Aplicar migration:** no Supabase Dashboard, abra **SQL Editor** ou execute a pipeline de migrations do projeto e aplique `20260928090000_operational_abuse_protection.sql`. Sem isso, o limite transacional e a quota persistente não entram em vigor.
2. **Supabase Auth:** em **Authentication → Settings**, confirme a limitação de e-mails/Auth e ative CAPTCHA/Turnstile apenas após configurar as chaves no dashboard. Essa é a camada correta para cadastro, reset de senha e OAuth, que usam o Auth do Supabase diretamente. Não há CAPTCHA configurado neste código.
3. **Supabase Usage:** em **Organization/Project → Usage**, acompanhe Database size/compute, Storage size, egress, Auth MAU e logs. Configure spend cap/budget/alerta somente se o plano e a organização exibirem essa opção; os recursos variam por plano, então não há garantia de hard cap gratuito.
4. **Netlify:** em **Site configuration → Usage & insights** e **Functions**, acompanhe bandwidth, requests, invocações/duração de funções e logs. Ative notificações/budget alerts que o plano disponibilizar. Para bloqueio global por IP e bot distribuído, avalie as regras de firewall/WAF disponíveis no plano antes de habilitá-las.
5. **Storage:** em **Storage → project-images**, confirme limite de 5 MB e MIME `image/jpeg`, `image/png`, `image/webp`; confirme as políticas após aplicar a migration.
6. **Bloqueio total de upload direto (pendente):** para impedir que um cliente autenticado chame a Storage API sem passar pela normalização Sharp, é necessário configurar uma credencial `SUPABASE_SERVICE_ROLE_KEY` somente no ambiente server-side, alterar o endpoint para usá-la e então remover o `INSERT` direto de `authenticated` na policy do bucket. Não foi feito automaticamente: a chave não está disponível localmente e ativar a policy antes disso interromperia uploads. A service-role nunca pode receber prefixo `NEXT_PUBLIC_`.

## Observabilidade

Investigue picos de erros 429, crescimento de `storage.objects`, invocações do endpoint `/api/uploads/image`, erros de decodificação, crescimento de `action_rate_limits`, e tentativas de Auth/e-mail. Evite registrar tokens, cookies, senhas, corpos de upload ou conteúdo integral de comentários.
