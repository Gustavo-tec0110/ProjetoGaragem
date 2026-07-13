# Relatório de UI/UX — Projeto Garagem

## Resumo executivo

O Projeto Garagem já possuía uma identidade escura e automotiva reconhecível, porém a interface dependia de muitos cards, bordas, pílulas e grandes raios de canto. Isso aproximava o produto de um kit genérico de dashboard e diminuía o impacto das fotografias, dos projetos e das ações principais.

A revisão preservou o tema escuro, o vermelho de performance, a fotografia automotiva e todas as funcionalidades existentes. A nova direção é mais editorial, técnica e premium: menos contêineres competindo, hierarquia tipográfica mais clara, superfícies mais discretas, CTAs com prioridade explícita e navegação mais leve.

## Problemas encontrados

### Sistema visual

- Excesso de caixas arredondadas e bordas, inclusive em componentes aninhados.
- Raios muito grandes aplicados indistintamente a cards, controles, menus e navegação.
- Brilho vermelho usado em muitos elementos, reduzindo o valor de destaque do CTA principal.
- Sombras e vidro com presença forte, fazendo superfícies secundárias competirem com o conteúdo.
- Hierarquia visual pouco distinta entre páginas de descoberta, gestão e autenticação.
- Cards de projeto no desktop com muitas microcaixas para métricas e dados auxiliares.

### Home

- A primeira dobra explicava o produto, mas o título era longo e descritivo em vez de memorável.
- A composição comunicava “catálogo social”, mas não deixava evidente a diferença para uma rede social genérica.
- A seção final continha linguagem interna de produto, como “MVP focado”, além de explicar funcionalidades que não fariam parte da versão atual.
- O rodapé expunha a stack técnica, reforçando aparência de projeto de estudo.
- Os quatro benefícios eram apresentados como mais uma grade de cards, aumentando a sensação de interface quadrada.

### Explorar e busca

- O cabeçalho, filtros e catálogo tinham peso visual semelhante.
- A página repetia diferentes recortes do mesmo catálogo antes da lista principal no desktop.
- O conjunto de filtros era funcional, mas visualmente denso e pouco integrado ao restante da página.
- Cards em telas pequenas precisavam manter duas colunas sem provocar overflow ou áreas clicáveis pequenas.

### Projeto

- A primeira dobra era forte, mas a página longa acumulava muitos blocos com o mesmo tratamento visual.
- Métricas, ações e dados técnicos possuíam bordas e contêineres em excesso.
- A linguagem de superfície não diferenciava bem informações primárias, apoio técnico e conteúdo social.

### Navegação

- O cabeçalho flutuante em formato de cápsula consumia espaço e reforçava o excesso de elementos arredondados.
- A barra móvel era alta, pesada e formada por várias camadas de pílulas.
- O botão “Criar” tinha importância funcional, mas não se diferenciava suficientemente das demais abas.

### Autenticação e formulários

- Login e cadastro eram cards isolados sobre uma grande área vazia no desktop.
- Campos de login e cadastro usavam placeholder como principal identificação visual.
- Recuperação de senha não utilizava a navegação e o rodapé padrão do produto.
- Mensagens de erro não tinham o mesmo tratamento visual nem região de anúncio consistente.
- Os formulários extensos acumulavam cards e controles com raios muito grandes.

### Mobile

- Barra inferior ocupava espaço excessivo e criava sensação de “dock dentro de um card”.
- Alguns agrupamentos de botões dependiam de larguras muito estreitas.
- A densidade dos cards de catálogo exigia uma revisão de contraste, espaçamento e área clicável sem alterar a grade de duas colunas validada pelos testes.
- O espaço seguro inferior era maior que o necessário.

### Estados e acessibilidade

- Estados vazios usavam o mesmo card sólido de conteúdos comuns.
- Foco estava implementado em componentes importantes, mas não havia um tratamento global coerente.
- Labels visíveis estavam ausentes nos formulários principais de autenticação.
- Era necessário preservar `prefers-reduced-motion`, títulos únicos, semântica de headings e anúncios de rota do Next.js.

## Melhorias realizadas

### Design system

- Paleta refinada para pretos menos chapados, superfícies de baixo contraste e vermelho reservado a prioridade e estado ativo.
- Escala de raios reduzida globalmente; cards, controles e menus agora parecem componentes de produto, não cápsulas decorativas.
- Sombras e glows reduzidos e concentrados em ações importantes.
- Nova classe de eyebrow para contexto de seção, com tipografia técnica e espaçamento consistente.
- Nova regra de seção para substituir cards desnecessários por divisores e respiro.
- Foco visível global e contraste reforçado em controles.
- Text wrapping balanceado em títulos e parágrafos para melhorar leitura em diferentes larguras.
- Espaço reservado à navegação móvel reduzido sem comprometer safe areas.

### Home

- Hero completamente reorganizado com a proposta “Seu projeto merece mais do que um feed”.
- Mensagem de valor dividida em promessa, explicação e dois caminhos claros: criar ou explorar.
- Imagem existente preservada e melhor integrada com gradientes, grade técnica discreta e posição responsiva.
- Faixa de atributos no hero comunica ficha, evolução e comunidade sem acrescentar funcionalidade.
- Benefícios convertidos de cards para uma seção editorial com divisores leves.
- Catálogo da comunidade ganhou enquadramento próprio e hierarquia mais clara.
- CTA final removeu linguagem de MVP e passou a falar de evolução e legado.
- Rodapé deixou de exibir tecnologias internas e passou a reforçar a proposta do produto.

### Navegação

- Cabeçalho desktop e mobile transformado em barra compacta, com borda inferior e blur discreto.
- Links ativos recebem um indicador linear simples em vez de mais uma cápsula.
- Subtítulo da marca atualizado para “Builds com história”.
- Barra inferior móvel ficou mais baixa e direta.
- Ação central “Criar” ganhou botão elevado vermelho; as demais abas ficaram visivelmente secundárias.
- Áreas clicáveis e safe area foram preservadas.

### Catálogo, filtros e cards

- Cabeçalho de Explorar ganhou separação visual e melhor hierarquia entre título, descrição e ação.
- Lista principal passou a aparecer antes das curadorias também no desktop, acelerando o objetivo principal da página.
- Curadorias foram preservadas após o catálogo, sem remoção de recursos de descoberta.
- Filtros receberam superfícies mais leves e controles com a nova escala de raios.
- Bottom sheet mobile de filtros foi mantido, com composição mais contida.
- Cards de projeto preservam foto, status, autor, specs, métricas, tags, acesso e comparação.
- Métricas do desktop deixaram de ser quatro caixas independentes e passaram a usar uma faixa técnica única.
- Botão de comparação foi compactado sem perder nome acessível.
- Grid móvel de duas colunas, exigido e validado pelos testes existentes, foi mantido sem overflow.
- Estado vazio agora usa borda tracejada e tratamento distinto do conteúdo normal.

### Autenticação

- Criado um shell reutilizável para login, cadastro, recuperação e redefinição de senha.
- Desktop ganhou uma composição em duas áreas, com contexto de produto e formulário focado.
- Mobile mantém uma coluna direta e sem espaço desperdiçado.
- Login e cadastro agora possuem labels visíveis, autocomplete apropriado e mensagens de erro anunciáveis.
- Separação entre Google e email foi padronizada.
- Links secundários foram reorganizados por prioridade.
- Recuperação de senha voltou a fazer parte da navegação geral do produto.
- Redefinição de senha adotou o mesmo padrão visual e de acessibilidade.

### Componentes e estados padronizados

- Botões: raios, alturas, hover, active, foco, disabled e hierarquia de variantes.
- Inputs e selects: superfície, borda, foco, placeholder e escala de raio.
- Cards e premium cards: profundidade, borda, hover e raio.
- Badges: densidade, contraste e tamanho tipográfico.
- Filtros: desktop, mobile, chips ativos e bottom sheet.
- Skeletons: preservados com suporte a redução de movimento.
- Estados vazios: diferenciação por borda tracejada e espaço interno.
- Modais e dropdowns: beneficiados pela nova escala global de superfícies e raios.
- Mensagens de erro: tratamento consistente nos fluxos de autenticação revisados.

## Decisões de design

1. **Vermelho como sinal, não decoração.** O vermelho ficou concentrado em CTA, navegação ativa e estados relevantes. Isso aumenta sua força perceptiva.
2. **Fotografia como protagonista.** O hero e os cards dão mais espaço visual aos carros, enquanto superfícies e bordas recuam.
3. **Editorial + técnico.** Títulos grandes apenas onde constroem impacto; eyebrows, divisores e métricas compactas criam a sensação de catálogo de performance.
4. **Menos caixas, mesma informação.** Dados e recursos foram mantidos, mas agrupados em faixas e divisores em vez de subcards.
5. **Mobile como interface própria.** A navegação inferior, os filtros e as ações não são simples reduções do desktop.
6. **Sem dependências novas.** A melhoria usa Tailwind, CSS e componentes já presentes, protegendo bundle e performance.
7. **Sem alteração de negócio.** Consultas, autenticação, criação, edição, comparação, interações sociais e persistência não foram modificadas.

## Ganhos de usabilidade

- Proposta do produto compreendida mais rapidamente na Home.
- CTAs primário e secundário distinguíveis em poucos segundos.
- Acesso mais rápido ao catálogo completo na página Explorar.
- Menor carga cognitiva na leitura de métricas e cards.
- Campos de autenticação mais claros e acessíveis.
- Recuperação de senha visualmente integrada ao restante do fluxo.
- Navegação móvel ocupa menos espaço e destaca a ação de criação.
- Estados vazios e mensagens de erro são mais fáceis de reconhecer.
- Melhor consistência entre páginas públicas, privadas e estados de visitante.

## Telas alteradas

- Home.
- Explorar e busca por projetos.
- Cards e grids de catálogo usados em Home, Explorar, Perfil, Garagem e recomendações.
- Detalhe de Projeto, por propagação do design system e componentes compartilhados.
- Login.
- Cadastro.
- Recuperação de senha.
- Redefinição de senha.
- Garagem e Perfil, por propagação de cards, botões, controles e navegação.
- Notificações e Atualizações, por propagação de cards, botões, badges e navegação.
- Rankings e Comparar, por propagação do design system.
- Formulários de projeto e perfil, por propagação de controles, cards e estados.
- Modais, menus, dropdowns, loaders, skeletons e estados vazios compartilhados.

Não existe atualmente uma rota dedicada de “Configurações”. As configurações existentes ficam no fluxo de perfil/onboarding e foram beneficiadas pelo novo sistema visual. Nenhuma rota nova foi criada para respeitar o escopo de não adicionar funcionalidades.

## Antes e depois descritos

### Antes

- Navegação flutuante em cápsula e dock móvel pesado.
- Hero correto, porém descritivo e semelhante a uma landing genérica de catálogo.
- Quatro benefícios em quatro cards adicionais.
- CTA final com texto sobre escopo de MVP.
- Rodapé revelando tecnologias usadas.
- Catálogo e filtros com muitas caixas de peso equivalente.
- Autenticação em card isolado, sem labels visíveis e com grande vazio ao redor.

### Depois

- Navegação estrutural, compacta e com indicador ativo preciso.
- Hero com mensagem proprietária, melhor enquadramento da foto e caminho de ação imediato.
- Benefícios em linguagem editorial, com mais ar e menos bordas.
- CTA final orientado à motivação do usuário.
- Rodapé centrado na marca e comunidade.
- Catálogo priorizado, métricas compactas e filtros mais discretos.
- Autenticação contextual, consistente, acessível e responsiva.

## Performance e acessibilidade

- Nenhuma biblioteca ou dependência foi adicionada.
- Imagem do hero continua usando `next/image`, `priority`, `fill` e carregamento otimizado.
- Animações permanecem discretas e respeitam `prefers-reduced-motion`.
- Removido `will-change` permanente dos premium cards para evitar promoção desnecessária de camadas.
- Focus visible global e específico preservado.
- Labels, autocomplete, roles de erro e regiões de status melhorados.
- Sem overflow horizontal nos viewports auditados de 390 × 844 e 1440 × 900.
- Sem alteração de metadados, headings principais, sitemap ou regras de SEO.

## Validações executadas

- `npm run lint`: aprovado sem erros.
- `npm run typecheck`: aprovado sem erros de tipagem.
- `npm run build`: aprovado no Next.js 16.2.6; 30 páginas estáticas geradas e rotas dinâmicas compiladas.
- Testes públicos de interface com Playwright: 20 de 20 aprovados, cobrindo desktop e mobile.
- Cenários autenticados: 5 testes existentes permaneceram ignorados por dependerem das credenciais E2E opcionais do ambiente; não houve falha autenticada executada.
- Auditoria visual no navegador: Home, Explorar, Projeto e Login revisados em 1440 × 900 e 390 × 844.
- Responsividade: nenhum overflow horizontal encontrado nos viewports auditados.
- Dependências: nenhuma biblioteca nova adicionada.
- Entrega: commit e envio ao `origin/main`, sem deploy, conforme solicitado.

## Sugestões futuras

- Criar uma rota de configurações somente quando houver requisitos funcionais claros para conta, privacidade e preferências.
- Adicionar testes de contraste automatizados e auditoria com axe em CI.
- Definir limites de qualidade e proporção para fotos enviadas pelos usuários.
- Criar placeholders de imagem derivados das fotos para suavizar carregamentos em conexões lentas.
- Revisar a densidade da página de detalhe quando houver volume real de dados e comportamento de scroll em produção.
- Acompanhar métricas de clique em “Criar minha garagem”, conclusão de cadastro e uso de filtros para validar os ganhos de UX.
