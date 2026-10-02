# Fase 4 — Pix automático (Asaas) e sistema no ar (especificação para implementar)

Leia antes: `AGENTS.md`, `docs/ESCOPO.md` §3.8 (gateway — D7) e §5. Fases 1 a 3 prontas: `cobrancas` é a
fonte única de contas a receber (sinal/saldo na aprovação, `fatura` nos contratos) e
`registrarPagamento` (`src/lib/financeiro.ts`) já dá baixa, numera o recibo (REC) e confirma a agenda no sinal.
A Fase 4 **não muda as regras**: o Asaas só cria a cobrança lá fora e chama `registrarPagamento` quando o cliente paga.

## Parte A — Pix automático pelo Asaas

### Configuração
- Variáveis: `ASAAS_API_KEY`, `ASAAS_AMBIENTE` (`sandbox` | `producao`), `ASAAS_WEBHOOK_TOKEN`.
  Base: sandbox `https://api-sandbox.asaas.com/v3`, produção `https://api.asaas.com/v3`; header `access_token`.
- **Sem `ASAAS_API_KEY` o sistema continua 100% manual** (como hoje). Com `ASAAS_FAKE=1` usa um cliente simulado
  (para testes e e2e, sem rede).
- `src/lib/asaas.ts`: cliente fino (fetch) com `criarCliente`, `criarCobranca`, `atualizarCobranca`, `cancelarCobranca`,
  `pixQrCode` (`GET /payments/{id}/pixQrCode` → `encodedImage` + `payload`). Erros do Asaas viram `ErroNegocio` legível.

### Banco
- `clientes.asaasClienteId` (text). Criado sob demanda (nome, CPF/CNPJ, e-mail, telefone); sem CPF/CNPJ → aviso na tela
  ("cadastre o documento para gerar Pix") e a cobrança segue manual.
- `cobrancas`: `asaasId` (unique), `pixCopiaECola`, `pixQrCode` (base64 PNG), `linkPagamento` (invoiceUrl), `asaasErro`.
- `pagamentos`: `asaasPagamentoId` (unique — garante que o webhook não baixa duas vezes), `tokenPublico` (recibo público).
- `webhook_eventos`: id, empresaId, origem (`asaas`), eventoId (unique), tipo, payload jsonb, processadoEm, erro, criadoEm.

### Regras (funções puras + testes em `src/lib/asaas-regras.ts`)
- `paraCobrancaAsaas(cobranca, cliente)` → corpo do `POST /payments`: `billingType: 'PIX'` (fatura: `UNDEFINED`,
  deixa Pix/boleto/cartão), `value`, `dueDate` = vencimento (se já passou, hoje), `description`,
  `externalReference` = `cobranca.id`.
- `eventoParaAcao(evento)`: `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` → baixa (forma `pix`, ou `cartao`/`transferencia`
  conforme `billingType`; `pagoEm` = `paymentDate`/`clientPaymentDate`); `PAYMENT_OVERDUE` → nada (o vencido já é
  calculado); `PAYMENT_DELETED`/`PAYMENT_REFUNDED` → registra evento para a Bruna revisar (não estorna sozinho).
- Fatura em espécie continua manual (dinheiro não passa pelo Asaas).

### Quando sincronizar
- Cobrança criada (aprovação, geração/recálculo de fatura) → cria no Asaas e guarda Pix (falha não impede aprovar:
  grava `asaasErro` e mostra botão **Gerar Pix de novo**).
- Vencimento/valor alterados (reagendar, entrega, fatura recalculada) → `atualizarCobranca`.
- Cobrança cancelada (pré-reserva liberada) → `cancelarCobranca`.
- Baixa manual de cobrança que existe no Asaas → `POST /payments/{id}/receiveInCash` (evita o cliente pagar duas vezes).

### Webhook `POST /api/webhooks/asaas`
- Confere o header `asaas-access-token` = `ASAAS_WEBHOOK_TOKEN` (senão 401). Grava em `webhook_eventos` (idempotente por
  `eventoId`), processa e responde 200 rápido. Acha a cobrança por `externalReference`.
- Baixa com `registrarPagamento` (usuário "Sistema (Asaas)" — `registradoPorId` nulo), que já confirma a agenda no sinal
  e numera o recibo. Depois registra evento no orçamento ("Pix recebido pelo Asaas").
- Evento com erro fica com `erro` preenchido; tela **/financeiro/integracao** lista os últimos eventos e tem
  **Reprocessar**.

### Telas e documentos
- `/p/[token]` (cliente aprovou e falta o sinal): QR Code + **Copiar código Pix** + valor do sinal; depois da entrega,
  o Pix do saldo. Atualiza sozinho quando pago (consulta a cada 10 s) → "Pagamento recebido, agenda confirmada".
- Fatura (`templates/fatura-mensal.html`) ganha bloco com QR Code e copia-e-cola da opção Pix.
- `/financeiro`: selo "Pix gerado" / "Pago via Asaas"; botão copiar Pix na mensagem de cobrança do WhatsApp.
- Recibo automático: ao baixar pelo webhook, o painel mostra "Recibos para enviar" com botão WhatsApp e link público
  `/r/[token]` (PDF do recibo sem login, como `/f/[token]`).

## Parte B — Colocar no ar

- **Banco:** Supabase (PostgreSQL). `DATABASE_URL` com o pooler (o driver já usa `prepare: false`).
  Em produção sem `DATABASE_URL` o sistema **não sobe** (nada de PGlite). Migrações no deploy (`npm run db:migrar`).
- **Arquivos:** trocar `src/lib/arquivos.ts` por Supabase Storage (bucket privado), mesmas funções
  (`salvarArquivo`, `lerArquivo`, `apagarArquivo`). Script para migrar `.data/arquivos` se houver.
- **Hospedagem:** contêiner Docker (Railway, Fly.io ou Render) com Node 22 + Chromium (os PDFs precisam dele;
  `CHROMIUM_PATH`). Serverless (Vercel) só com `@sparticuz/chromium` — decidir com a Flávia; recomendação: contêiner.
- **Domínio e segurança:** `APP_URL=https://gestao.lubianlimpezas.com.br`, HTTPS, cookie `secure` (já automático em
  produção), cabeçalhos básicos (`X-Frame-Options`, `Referrer-Policy`), `robots` noindex nas rotas públicas.
- **Dados iniciais de produção:** `npm run db:semear` com dados reais (empresa, usuários Flávia/Bruna/Anderson, equipe,
  serviços), **sem** o orçamento de exemplo (flag `--sem-exemplos`); troca de senha obrigatória no primeiro acesso.
- **Operação:** backup diário do Supabase; monitor de disponibilidade (rota `/api/saude` que testa o banco);
  logs de erro do servidor; webhook do Asaas apontando para o domínio de produção.
- **Guia:** `docs/IMPLANTACAO.md` passo a passo (criar contas, variáveis, deploy, webhook, primeiro acesso).

## Pronto quando
`npm test`, `npm run typecheck` e `next build` passam; `scripts/teste-e2e.ts` (com `ASAAS_FAKE=1`) cobre: aprovar →
Pix do sinal aparece no link do cliente → webhook simulado de pagamento → agenda confirmada + recibo gerado;
fatura gerada → Pix na fatura → webhook → cobrança paga. Teste manual no sandbox do Asaas documentado em
`docs/IMPLANTACAO.md`, e o sistema acessível no domínio com HTTPS.
