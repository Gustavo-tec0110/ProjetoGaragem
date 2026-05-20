# ProjetoGaragem

Website automotivo premium (App Router) inspirado em Need for Speed, Forza Horizon e dashboards automotivos.

**Stack**
- Next.js (App Router) + TypeScript
- TailwindCSS v4 (tema escuro + neon laranja)
- Framer Motion (micro animacoes)
- UI components (Button/Card/Input etc)
- Zustand (estado do builder)

## Rodar local

```bash
npm install
npm start
```

Windows (se `npm` estiver bloqueado por ExecutionPolicy):

```bash
npm.cmd install
npm.cmd start
```

## Pages
- `/` Home (Hero + estilos + builds + ranking + carros)
- `/montar` Wizard "Montar Projeto" (carro -> orcamento -> estilo -> build + compatibilidade)
- `/builds/[id]` Build detalhada (galeria, specs, pecas, compatibilidade, custo, comentarios, likes/saves)
- `/explorar`, `/projetos`, `/kits`, `/comunidade`, `/login`

## Login Google (opcional)
O projeto tem suporte a Login Google via Supabase (client-side) quando as envs estiverem configuradas.

Crie um `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Depois acesse `/login` e clique em **Continuar com Google**.

