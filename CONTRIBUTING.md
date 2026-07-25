# Contribuindo

Obrigado pelo interesse no Projeto Garagem.

## Ambiente

1. Use Node.js 20 ou superior.
2. Execute `npm ci`.
3. Copie `.env.example` para `.env.local` apenas se precisar integrar o Supabase.
4. Use contas e dados exclusivos de QA.

## Antes de abrir um Pull Request

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Mudanças autenticadas devem respeitar as políticas RLS e incluir uma forma segura de validação. Não altere migrations históricas já aplicadas; crie uma migration incremental.

## Critérios

- descreva o problema e a decisão técnica;
- mantenha o escopo do Pull Request pequeno;
- inclua ou atualize testes;
- não versione credenciais, relatórios ou dados de usuários;
- preserve acessibilidade e comportamento responsivo.
