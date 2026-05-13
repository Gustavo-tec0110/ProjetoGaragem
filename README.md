# ProjetoGaragem

O app Next.js esta na pasta `projeto-garagem/`.

Website automotivo premium (App Router) inspirado em Need for Speed, Forza Horizon e dashboards automotivos.

**Stack**
- Next.js (App Router) + TypeScript
- TailwindCSS v4 (tema escuro + neon laranja)
- Framer Motion (micro animacoes)
- UI components (Button/Card/Input etc)
- Zustand (estado do builder)

## Rodar local

```bash
cd projeto-garagem
npm run dev
```

Windows (se `npm` estiver bloqueado por ExecutionPolicy):

```bash
npm.cmd run dev
```

## Pages
- `/` Home (Hero + estilos + builds + ranking + carros)
- `/montar` Wizard "Montar Projeto" (carro -> orcamento -> estilo -> build + compatibilidade)
- `/builds/[id]` Build detalhada (galeria, specs, pecas, compatibilidade, custo, comentarios, likes/saves)
- `/explorar`, `/projetos`, `/kits`, `/comunidade`, `/login`

