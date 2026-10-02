# Lubian Gestão

Sistema de gestão da **Lubian Limpezas** — Engenharia de Limpeza Pós-Obra.
Escopo completo e decisões: [`docs/ESCOPO.md`](docs/ESCOPO.md).

## O que já funciona (Fase 1 — Núcleo comercial)

- **Login e perfis**: Gestão (Flávia), Administrativo (Bruna), Líder e Auxiliar (área da equipe chega na Fase 2).
- **Cadastros**: clientes (tipo, saudação, endereço de cobrança, parceiro que indicou, condição de pagamento),
  obras (várias por cliente), equipe (diária padrão, cor, NR-35), catálogo de serviços, usuários.
- **Pré-qualificação**: estimativa por m² com setup mínimo e mensagem pronta para o WhatsApp.
- **Vistoria técnica** (celular): medições por ambiente, nível de resíduos, andaime, observações e fotos.
- **Orçamento técnico**: força-tarefa × dias + custos variáveis → markup (30–45%) → ancoragem
  (desconto em R$, em % ou Valor de Tabela digitado), escopo itemizado, cálculo ao vivo,
  **trava de markup mínimo de 30%** (só a Gestão libera, com justificativa).
- **PDF** no layout "Padrão Luva Branca", **envio pelo WhatsApp** com mensagem pronta,
  **link do cliente** para ver, baixar e **aprovar** (registra data e IP; aprovação = pré-reserva).
- **Funil**: rascunho → enviado → aprovado / recusado, validade de 7 dias, lembretes de follow-up em 2 e 5 dias,
  painel "Para cobrar hoje", histórico de cada orçamento.

## Rodar localmente

```bash
npm install
npm run db:semear      # cria o banco local com a empresa, equipe, serviços e um orçamento de exemplo
npm run dev            # http://localhost:3000
```

Usuários iniciais (senha `lubian2026`, troque em "Minha conta"):
`flavia@lubian.local` (Gestão), `bruna@lubian.local` (Administrativo), `anderson@lubian.local` (Líder).

O PDF usa Chromium. Se ele não estiver no caminho padrão do Playwright, informe em `.env.local`:
`CHROMIUM_PATH=/caminho/para/chrome`.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL de produção (ex.: Supabase). Sem ela, usa PGlite local em `.data/pglite`. |
| `APP_URL` | Endereço público usado nos links enviados ao cliente (ex.: `https://gestao.lubian.com.br`). |
| `CHROMIUM_PATH` | Caminho do Chromium para gerar PDFs. |
| `SENHA_INICIAL` | Senha dos usuários criados por `db:semear`. |

## Comandos

| Comando | O que faz |
|---|---|
| `npm test` | Testes das regras de negócio (preço, fatura, recibo, extenso, funil) |
| `npm run typecheck` | Verificação de tipos |
| `npm run teste:e2e` | Percorre o sistema no navegador (com `npm run dev` rodando) |
| `npm run orcamento` / `fatura` / `recibo` | Gera PDFs de exemplo a partir de `exemplos/*.json` |
| `npm run db:gerar` / `db:migrar` | Gera / aplica migrações do banco |
