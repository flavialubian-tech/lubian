# Fase 4 — Pix automático (Asaas) e colocação no ar (especificação para implementar)

Leia antes: `AGENTS.md`, `docs/ESCOPO.md` §3.5, §3.8 (integração de pagamento, D7) e §5. Fases 1–3 prontas
(`cobrancas`, `pagamentos.cobrancaId`, recibos REC e faturas FAT já existem). Reaproveite:
`registrarSinal` / `sincronizarAlocacoes` (`src/lib/operacao.ts`), o fluxo **Registrar pagamento** da Fase 3
(pagamento → cobrança `paga` → recibo PDF), `src/lib/arquivos.ts`, `src/lib/url.ts`, a rota pública `/p/[token]`.

## ⚠️ Decisão pendente (Flávia): onde hospedar
O §5 do escopo previa Vercel, mas a geração dos PDFs abre um **Chromium** (`src/pdf/gerar-documento.ts`), que não
cabe bem em função serverless (tamanho do pacote, tempo de partida, memória). **Recomendação: contêiner**.

| Opção | Prós | Contras |
|---|---|---|
| **Railway** (recomendado) | Mais simples: conecta o GitHub, lê o `Dockerfile`, domínio e HTTPS em minutos; cobra pelo uso | Sem plano gratuito permanente (~US$ 5–10/mês neste porte) |
| **Fly.io** | Servidor em São Paulo (`gru`), barato, volume persistente | Configuração por linha de comando (`fly.toml`), um pouco mais técnica |
| **Render** | Painel simples, deploy pelo GitHub | Plano gratuito "dorme" (1ª abertura lenta e webhook do Asaas pode falhar); usar o pago |
| Vercel | Já conhecida, gratuita | Chromium exige `@sparticuz/chromium` + limites de função; não recomendado |

Qualquer contêiner serve: a especificação abaixo não depende da escolha (só o passo "criar o serviço" muda).

## Parte A — Pix automático pelo Asaas

### Banco
- `empresas`: `asaasAmbiente` (`sandbox | producao`, padrão `sandbox`). Chave da API **não** vai no banco:
  vem de `ASAAS_API_KEY` (uma empresa por enquanto; multiempresa SaaS fica para a Fase 5).
- `clientes`: `asaasClienteId` (text, opcional) — criado sob demanda na 1ª cobrança.
  O Asaas exige CPF/CNPJ: usar `clientes.documento`; sem ele, o botão explica que falta o documento.
- `cobrancas`: `asaasId` (text, único, opcional), `pixCopiaECola` (text), `pixQrCode` (text, PNG base64),
  `pixExpiraEm` (timestamp), `linkPagamento` (text, `invoiceUrl` do Asaas), `lembradoEm` (timestamp, opcional).
- `pagamentos`: `origem` (`manual | asaas`, padrão `manual`), `asaasPagamentoId` (text, único, opcional) e
  `estornadoEm` (timestamp, opcional). `registradoPorId` fica nulo quando a origem é `asaas`.
- `asaas_eventos` (registro e idempotência do webhook): id (o `id` do evento, `evt_...`, chave primária),
  empresaId, evento, asaasPagamentoId, payload jsonb, processadoEm?, erro?, recebidoEm.

### Cliente da API — `src/lib/asaas.ts` (`server-only`)
- Base: `https://api-sandbox.asaas.com/v3` ou `https://api.asaas.com/v3` conforme `ASAAS_AMBIENTE`;
  cabeçalho `access_token: $ASAAS_API_KEY`, `User-Agent: lubian-gestao`.
- `garantirClienteAsaas(cliente)`: `POST /customers` (name, cpfCnpj, email, mobilePhone, externalReference = id
  do cliente) e grava `asaasClienteId`.
- `criarCobrancaPix(cobranca)`: `POST /payments` com `billingType: PIX`, `value`, `dueDate` (vencimento da
  cobrança; se já passou, hoje), `description` ("Sinal 50% — ORC-2026-0012 · Obra X"),
  `externalReference` = id da cobrança. Depois `GET /payments/{id}/pixQrCode` → grava `payload`
  (copia-e-cola), `encodedImage` (QR) e `expirationDate`.
- `cancelarCobrancaAsaas(asaasId)`: `DELETE /payments/{id}` — chamado quando a cobrança é cancelada
  ou paga manualmente (evita o cliente pagar duas vezes).
- Erros do Asaas viram `ErroNegocio` com a mensagem dele (`errors[0].description`).
- Testes com `fetch` simulado (vitest): montagem dos corpos, valor em reais com 2 casas, data `AAAA-MM-DD`.

### Quando gerar o Pix
- **Sinal**: automaticamente quando o cliente aprova no link (`/p/[token]`) — logo após criar as cobranças.
  Se o Asaas falhar, a aprovação **não** é desfeita: a cobrança fica sem Pix e aparece botão **Gerar Pix** no
  `/financeiro` e no orçamento.
- **Saldo / 100%**: ao marcar **Serviço entregue** (`marcarEntregue`).
- **Fatura mensal**: ao gerar a fatura, sobre o valor da Opção 1 (Pix com desconto de antecipação).
- Botão **Gerar Pix** manual em qualquer cobrança aberta sem `asaasId` (ou com Pix expirado → gera de novo).
- Interruptor `ASAAS_ATIVO=1`: sem ele, nada chama o Asaas e o sistema segue como na Fase 3 (chave Pix CNPJ fixa).

### Onde o cliente vê o Pix
- **Link do cliente** `/p/[token]`: depois da aprovação, card "Pague o sinal" com QR Code, botão
  **Copiar código Pix**, valor e vencimento; quando pago, troca por "Sinal recebido ✓" e o **recibo para baixar**.
  Mesma coisa para o saldo e para as faturas (link público da fatura da Fase 3).
- **PDFs**: fatura mensal e orçamento aprovado ganham bloco com QR + copia-e-cola (quando houver);
  sem Pix gerado, mantêm a chave CNPJ como hoje.
- **WhatsApp** (`src/lib/mensagens.ts`): nova mensagem "cobrança" com valor, vencimento, link do cliente e o
  copia-e-cola no fim (é o que o cliente cola no app do banco).

### Webhook — `POST /api/webhooks/asaas`
- Recusa (401) se o cabeçalho `asaas-access-token` ≠ `ASAAS_WEBHOOK_TOKEN`. Rota fora do login, sem sessão.
- Grava o evento em `asaas_eventos`; se o `id` já existe, responde **200** sem refazer nada (o Asaas reenvia).
- Responde 200 rápido; erro de processamento fica em `asaas_eventos.erro` (não devolver 500 em loop — o Asaas
  pausa a fila depois de falhas seguidas). Tela simples em `/financeiro/integracao` lista eventos com erro e
  botão **Reprocessar**.
- Eventos tratados (achar a cobrança por `payment.externalReference`, conferindo a empresa):
  - `PAYMENT_RECEIVED` (Pix cai como recebido): na mesma transação, cria `pagamento` (`forma: pix`,
    `origem: asaas`, `valor = payment.value`, `pagoEm = payment.paymentDate`), marca a cobrança `paga`;
    se for **sinal** → `sincronizarAlocacoes` (agenda **confirmada**, D3) e evento `sinal_pago` no histórico.
    Depois da transação: **gera o recibo** (sinal ou quitação, numeração REC) e guarda o PDF em
    `arquivos` para o link do cliente. Se o PDF falhar, o pagamento continua valendo; o recibo é gerado
    na próxima abertura.
  - `PAYMENT_CONFIRMED`: idem (vale para cartão no futuro; para Pix normalmente vem junto do RECEIVED —
    a idempotência por `asaasPagamentoId` evita pagamento duplicado).
  - `PAYMENT_OVERDUE`: só registra (o alerta de vencido já vem da Fase 3).
  - `PAYMENT_DELETED` / `PAYMENT_REFUNDED`: limpa o Pix da cobrança; estorno volta a cobrança para `aberta`,
    marca o pagamento como estornado (`pagamentos.estornadoEm`) e avisa no painel — **não** desconfirma a
    agenda sozinho (a Bruna decide).
- Valor pago diferente do cobrado: registra o que veio e mostra alerta na cobrança.
- Pagamento manual (Fase 3) numa cobrança com Pix aberto → `cancelarCobrancaAsaas`.

### Lembretes automáticos (fecha o item "lembretes" da Fase 4 do escopo)
- `src/lib/lembretes.ts` (pura + testes): dado hoje e as cobranças abertas, lista quem lembrar
  — **D-1** do vencimento, **no dia** e **3 dias após** vencida.
- Painel: "Cobranças para lembrar hoje" com botão WhatsApp (mensagem pronta + copia-e-cola). O envio continua
  pelo WhatsApp da Bruna (API oficial é Fase 5). Marcar como lembrado grava `cobrancas.lembradoEm`.

### Pronto quando (Parte A)
`npm test`, `npm run typecheck` e `next build` passam; `scripts/teste-e2e.ts`, com `ASAAS_*` do **sandbox**:
aprovar orçamento no link → aparece o QR do sinal → simular o pagamento (confirmar o Pix pelo painel do
sandbox, ou, sem rede, disparar o webhook com o corpo gravado em `exemplos/asaas-payment-received.json`) → cobrança paga, agenda confirmada, recibo disponível no link.
Teste do webhook repetido (mesmo `id` 2×) gera um só pagamento.

## Parte B — Colocar no ar

### Banco: Supabase (PostgreSQL)
- Criar projeto na região **São Paulo** (`sa-east-1`). `DATABASE_URL` = string do **pooler em modo sessão**
  (porta 5432) para o app em contêiner; `db.ts` já usa `prepare: false`, então o modo transação (6543) também serve.
- Rodar `npm run db:migrar` com a `DATABASE_URL` de produção (passo do deploy, antes de subir a nova versão) e
  `npm run db:semear` **uma vez** — com `SENHA_INICIAL` forte; trocar as senhas no 1º acesso.
- Login continua o próprio (`usuarios` + `sessoes`); Supabase Auth não é usado agora.
- Desligar a API REST/Data API do Supabase ou ativar RLS negando tudo em todas as tabelas: o app acessa só pela
  `DATABASE_URL`, e a chave pública do projeto não pode ler os dados.

### Arquivos: Supabase Storage
- `src/lib/arquivos.ts` ganha a implementação Storage (bucket **privado** `lubian`, mesma chave
  `empresaId/uuid.ext`), escolhida por `ARQUIVOS_DRIVER=supabase` (`disco` continua padrão no dev).
  Usa `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (só no servidor). As rotas `/api/fotos`, `/api/comprovantes`
  e os recibos continuam servindo pelo app (checando sessão/token), sem URL pública do bucket.
- Script `scripts/migrar-arquivos.ts`: copia `.data/arquivos` para o bucket (se já houver dados locais).

### Contêiner com Chromium
- `Dockerfile` multi-stage: `node:22-bookworm-slim`; build com `next build` em modo **`output: 'standalone'`**
  (`next.config.ts`); imagem final com `chromium` + `fonts-liberation` + `fonts-noto-color-emoji` do apt,
  `CHROMIUM_PATH=/usr/bin/chromium`, copiando `templates/`, `assets/` e `drizzle/` (lidos em tempo de execução).
  Rodar como usuário não-root; `chromium.launch` com `args: ['--no-sandbox']` só quando `CHROMIUM_SEM_SANDBOX=1`.
- `.dockerignore` (node_modules, .next, .data, saida, .env*).
- `GET /api/saude`: responde 200 com `select 1` no banco (health check da plataforma).
- Antes de publicar: conferir que um orçamento, um recibo e uma fatura saem em PDF **dentro do contêiner**
  (`docker run` local + `npm run teste:e2e` apontando para ele).

### Domínio e HTTPS
- Subdomínio `gestao.lubian.com.br` (ou o domínio que a Flávia tiver): registro **CNAME** no provedor do domínio
  apontando para o endereço que a plataforma der; HTTPS automático da plataforma.
- `APP_URL=https://gestao.lubian.com.br` (os links enviados ao cliente usam ela).
- Cookie de sessão `Secure` em produção (conferir `src/lib/auth.ts`).
- No painel do Asaas (produção): webhook `https://gestao.lubian.com.br/api/webhooks/asaas`, versão v3,
  eventos de cobrança, token = `ASAAS_WEBHOOK_TOKEN`, fila ativa.

### Backup
- Supabase faz backup diário no plano pago (Pro, ~US$ 25/mês); no gratuito **não** há restauração garantida.
- Independente do plano: `scripts/backup.ts` (ou job agendado da plataforma / GitHub Actions diário às 3h)
  roda `pg_dump` da `DATABASE_URL`, compacta e guarda num bucket separado (`backups`, privado),
  mantendo **30 diários + 12 mensais**. Os arquivos do Storage entram no backup semanal.
- Documentar e **testar uma restauração** num banco vazio antes de considerar pronto (`docs/OPERACAO.md`).

### Variáveis de ambiente (acrescentar à tabela do README)
| Variável | Uso |
|---|---|
| `ASAAS_ATIVO` | `1` liga a integração; sem ela, Pix manual como na Fase 3 |
| `ASAAS_AMBIENTE` | `sandbox` ou `producao` |
| `ASAAS_API_KEY` | Chave da API do Asaas (do ambiente correspondente) |
| `ASAAS_WEBHOOK_TOKEN` | Token conferido no webhook (gerar aleatório, ≥ 32 caracteres) |
| `ARQUIVOS_DRIVER` | `disco` (padrão) ou `supabase` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Storage (só servidor) |
| `CHROMIUM_SEM_SANDBOX` | `1` se o Chromium do contêiner exigir `--no-sandbox` |

### Ordem de entrada no ar
1. Supabase criado, migrações e semente aplicadas; Storage com o bucket.
2. Contêiner publicado na plataforma escolhida com `ASAAS_ATIVO` **desligado**; domínio e HTTPS funcionando.
3. Flávia e Bruna usam uma semana com o Pix manual (Fase 3) em produção.
4. Asaas: conta aprovada (CNPJ 44.883.814/0001-97), chave de produção, webhook cadastrado → `ASAAS_ATIVO=1`.
5. 1ª cobrança real de valor baixo (R$ 1) paga pela própria Flávia para ver a baixa, o recibo e a agenda.

### Pronto quando (Parte B)
Sistema aberto em `https://<domínio>` com login; PDF de orçamento, recibo e fatura gerados em produção;
foto de vistoria enviada e reaberta (Storage); backup do dia presente no bucket e uma restauração testada;
`docs/ESCOPO.md` §5 atualizado com a hospedagem escolhida e o README com as novas variáveis.
