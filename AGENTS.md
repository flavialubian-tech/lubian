<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Lubian Gestão — convenções do projeto

- Idioma do domínio: português (nomes de tabelas, funções, telas). Escopo e decisões em `docs/ESCOPO.md`.
- Regras de negócio puras e testadas em `src/precificacao.ts`, `src/fatura.ts`, `src/recibo.ts`, `src/extenso.ts`, `src/lib/funil.ts`, `src/lib/agenda.ts`,
  `src/lib/dias-uteis.ts`, `src/lib/cobranca.ts`, `src/lib/acerto.ts`, `src/lib/lucro.ts` (`npm test`).
- Banco: Drizzle + PostgreSQL (`src/db/schema.ts`). Sem `DATABASE_URL` usa PGlite em `.data/pglite`.
  Depois de mudar o schema: `npm run db:gerar` e `npm run db:migrar`.
- Multiempresa: toda consulta filtra por `empresaId` da sessão. Toda Server Action verifica a sessão (`exigirOperador`/`exigirGestao`).
- Documentos PDF: templates Handlebars em `templates/`, renderizados com Chromium (`src/pdf/gerar-documento.ts`).
- Teste de ponta a ponta: com `npm run dev` rodando, `npm run teste:e2e`.
