# Fase 4 — Pix automático (Asaas) e colocação no ar (especificação para implementar)

Leia antes: `AGENTS.md`, `docs/ESCOPO.md` §3.5, §3.8 (gateway — D7) e §5. Fases 1 a 3 prontas: `cobrancas` é a
fonte única de contas a receber (sinal/saldo na aprovação, `fatura` nos contratos) e
`registrarPagamento` (`src/lib/financeiro.ts`) já dá baixa, numera o recibo (REC) e confirma a agenda no sinal.
A Fase 4 **não muda as regras**: o Asaas só cria a cobrança lá fora e chama `registrarPagamento` quando o cliente paga.
O mesmo código roda **no computador** (sem `DATABASE_URL` → PGlite, Parte L) ou **na nuvem** (com `DATABASE_URL`, Parte B).

## ⚠️ Decisão pendente (Flávia): onde hospedar — **custo zero por enquanto**
Restrição: sem caixa para investir agora. **Começar pelo modo local (Parte L)**, sem nenhum serviço online.
Quando precisar do link do cliente e da equipe na rua, ir para a nuvem em **planos gratuitos** (abaixo); o pago
fica para quando houver receita (seção "Quando houver caixa", no fim).
A geração dos PDFs abre um **Chromium** (`src/pdf/gerar-documento.ts`) e precisa de ~1 GB de memória, o que
descarta funções serverless pequenas. **Recomendação: Google Cloud Run** (contêiner que "desliga" quando ninguém usa).

| Opção (grátis) | Prós | Contras |
|---|---|---|
| **Google Cloud Run** (recomendado) | Cota grátis mensal (2 milhões de acessos, 180 mil vCPU-s, 360 mil GiB-s) sobra para a Lubian; aceita 1 GB de memória (Chromium cabe); desliga sozinho sem uso e liga em poucos segundos | Pede cartão para abrir a conta de cobrança — configurar **alerta de orçamento de R$ 5** e **máximo de 1 instância** para não haver surpresa; conferir na página de preços se a região escolhida está na cota grátis |
| **Render (plano Free)** | Mais simples de todos, **não pede cartão**, deploy pelo GitHub | Só 512 MB de memória e 0,1 CPU (Next + Chromium podem estourar — testar o PDF antes); "dorme" após 15 min sem uso e leva ~1 min para acordar |
| **Oracle Cloud (Always Free)** | Servidor de verdade, ligado o tempo todo, muita memória, grátis sem prazo | Bem mais técnico (instalar Docker e HTTPS na mão); pede cartão para verificação |
| ~~Vercel Hobby~~ | — | Plano grátis **proíbe uso comercial**, e o Chromium não cabe |
| ~~Railway / Fly.io~~ | — | Não têm mais plano gratuito permanente |

Qualquer contêiner serve: a especificação abaixo não depende da escolha (só o passo "criar o serviço" muda).
Se ficar com o **Render Free**, gerar os PDFs um de cada vez (fila simples em memória) e medir o pico de memória.

## Parte L — Modo local: rodar no computador da Lubian, sem nada online (opção zero) ✅
Computador da Lubian: **Windows 10**. Implementado — guia de uso em `docs/OPERACAO.md`.

O sistema **já roda inteiro no computador**: banco PGlite em `.data/pglite`, fotos e comprovantes em
`.data/arquivos`, PDFs com o Chrome/Edge instalado. Não precisa de Supabase, hospedagem, domínio nem cartão.
Internet só é necessária **uma vez**, na instalação (Node.js e `npm install`); depois funciona desconectado.

### O que muda no dia a dia
| Funciona igual | Muda |
|---|---|
| Orçamentos, PDFs, agenda, financeiro, recibos, faturas, relatórios | Só funciona com **o computador ligado** e o sistema aberto |
| Pix com QR Code e copia-e-cola (Parte A0, gerado localmente) | **Link do cliente** (`/p/[token]`) não abre fora da casa/escritório → enviar o **PDF pelo WhatsApp** e marcar **Aprovado manualmente** (botão já existe) |
| Celulares da equipe e da Bruna **no mesmo Wi-Fi** abrem pelo endereço local (ex.: `http://192.168.0.10:3000`) | Fora do Wi-Fi (equipe na obra) ninguém acessa → "Minha semana" vira **PDF/print da escala** enviado pelo WhatsApp |
| — | Asaas (baixa automática) **não funciona** — o aviso de pagamento precisa chegar pela internet. Baixa manual |
| — | Se o computador estragar ou for roubado, perde tudo **sem backup** → backup é obrigatório |

### O que foi implementado
- **Iniciar com dois cliques**: `iniciar-lubian.bat` → `npm run iniciar` (`scripts/iniciar.ts`): backup do dia,
  `db:semear` (migra e, na 1ª vez, cria os dados), `npm run build` só se o código mudou, `next start -H 0.0.0.0`
  e abre o navegador. `atualizar-lubian.bat`: `git pull` + `npm install`.
- **Chromium**: `src/pdf/navegador.ts` usa `CHROMIUM_PATH` ou detecta o Chrome/Edge instalados; sem nenhum,
  mensagem clara na tela.
- **Endereço para os celulares**: tela `/minha-conta` mostra o endereço na rede local (IP do computador
  + porta) com QR Code para abrir no celular (`src/lib/modo-local.ts`, `src/lib/rede.ts`). `APP_URL` fica sem definir (o sistema usa o endereço de quem acessou).
  Dica no `docs/OPERACAO.md`: fixar o IP do computador no roteador (reserva DHCP) para o endereço não mudar.
- **Firewall**: na 1ª vez o Windows pergunta se libera o Node.js na rede — marcar **rede privada**.
- **Backup local** — automático ao iniciar (1×/dia) e `npm run backup` com o sistema fechado
  (o PGlite não abre em dois processos): `PGlite.dumpDataDir('gzip')` → `banco.tar.gz` + cópia de `.data/arquivos`
  na pasta `lubian-AAAA-MM-DD` dentro de `BACKUP_DIR` (pendrive/HD externo, ou a pasta do Google Drive
  para computador, se quiser uma cópia fora de casa). Mantém 30 diários + 12 mensais. `npm run restaurar <arquivo>`
  volta um backup, guardando os dados atuais em `.data/*-antes-*`. Regras de retenção puras em `src/lib/backup.ts`.
  Aviso no painel quando o último backup tiver mais de 3 dias.
- **Segurança**: só o computador tem os dados → senha no Windows/Mac, trocar as senhas iniciais dos usuários.
  O sistema não fica exposto à internet (só à rede do Wi-Fi).
- Sem `ASAAS_ATIVO`, a Parte A fica desligada; o webhook nem é usado.

### Passar para online depois (sem perder nada)
Quando houver caixa ou precisar do link do cliente/equipe na rua: criar o Supabase, `pg_dump` do PGlite →
importar no Supabase (`scripts/migrar-para-nuvem.ts`), copiar `.data/arquivos` para o Storage
(`scripts/migrar-arquivos.ts`) e seguir a Parte B. Os dados são os mesmos; só muda onde ficam.

### Pronto quando (Parte L)
Num computador sem internet: abrir pelo atalho, criar orçamento, gerar PDF, registrar pagamento com recibo;
abrir o sistema no celular pelo Wi-Fi; `npm run backup` gera o zip e `npm run restaurar` volta ele num banco vazio.

## Parte A0 — Pix com QR Code sem custo (sem Asaas)
O Asaas **não cobra mensalidade**, mas cobra tarifa por cobrança paga com QR Code dinâmico (a isenção das
100 primeiras do mês vale só para Pix por chave ou QR estático). Para começar sem gasto:
- `src/lib/pix.ts` (função pura + testes): monta o **Pix copia-e-cola estático** (BR Code, padrão EMV do Banco
  Central) a partir de `empresas.chavePix` (CNPJ), nome e cidade da empresa, **valor** da cobrança e um
  identificador (`txid` = número da cobrança, ex.: `REC20260012`), com o CRC16 no fim. QR Code gerado a partir
  dele (pacote `qrcode`, PNG/SVG).
- Aparece nos mesmos lugares da Parte A (link do cliente, PDFs, mensagem de WhatsApp). O cliente não digita
  valor nem chave — menos erro.
- A **baixa continua manual** (Bruna confere no extrato e clica em **Registrar pagamento**, Fase 3).
- É o comportamento quando `ASAAS_ATIVO` está desligado.

## Parte A — Pix automático pelo Asaas (quando compensar a tarifa)

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
- Com `ASAAS_FAKE=1` usa um cliente simulado (testes e e2e, sem rede).
- Regras puras com testes em `src/lib/asaas-regras.ts`: `paraCobrancaAsaas(cobranca, cliente)` (corpo do
  `POST /payments`; fatura com `billingType: UNDEFINED` deixa Pix/boleto/cartão) e `eventoParaAcao(evento)`.
- Baixa pelo webhook sempre via `registrarPagamento` (usuário "Sistema (Asaas)", `registradoPorId` nulo); recibo com
  link público `/r/[token]` (como `/f/[token]`) e painel "Recibos para enviar".
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
- Interruptor `ASAAS_ATIVO=1`: sem ele, nada chama o Asaas e o sistema usa o Pix estático da Parte A0.

### Onde o cliente vê o Pix
- **Link do cliente** `/p/[token]`: depois da aprovação, card "Pague o sinal" com QR Code, botão
  **Copiar código Pix**, valor e vencimento; quando pago, troca por "Sinal recebido ✓" e o **recibo para baixar**.
  Mesma coisa para o saldo e para as faturas (link público da fatura da Fase 3).
- **PDFs**: fatura mensal e orçamento aprovado ganham bloco com QR + copia-e-cola (quando houver);
  sem Pix do Asaas, usam o Pix estático da Parte A0.
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
`npm test` (inclui o BR Code da Parte A0 conferido contra um copia-e-cola gerado pelo app do banco), `npm run typecheck` e `next build` passam; `scripts/teste-e2e.ts`, com `ASAAS_*` do **sandbox**:
aprovar orçamento no link → aparece o QR do sinal → simular o pagamento (confirmar o Pix pelo painel do
sandbox, ou, sem rede, disparar o webhook com o corpo gravado em `exemplos/asaas-payment-received.json`) → cobrança paga, agenda confirmada, recibo disponível no link.
Teste do webhook repetido (mesmo `id` 2×) gera um só pagamento.

## Parte B — Colocar no ar

### Banco: Supabase (PostgreSQL)
- Plano **Free** (500 MB de banco, 1 GB de arquivos, 2 projetos). Projeto grátis **pausa após 1 semana sem uso**
  — com uso diário não acontece; se pausar, reativa pelo painel sem perder dados.
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
- Para caber em 1 GB: reduzir fotos ao enviar (lado maior 1600 px, JPEG ~80%) antes de gravar.
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

### Segurança e dados iniciais de produção
- Cabeçalhos básicos (`X-Frame-Options`, `Referrer-Policy`), `robots` noindex nas rotas públicas; cookie `secure` em produção.
- `npm run db:semear -- --sem-exemplos` em produção (sem o orçamento de exemplo); trocar as senhas no 1º acesso.

### Endereço e HTTPS
- **Agora (grátis):** usar o endereço que a plataforma dá (ex.: `lubian-gestao-xxxx.run.app` ou
  `lubian-gestao.onrender.com`), já com HTTPS. `APP_URL` = esse endereço (os links enviados ao cliente usam ela).
- **Depois (≈ R$ 40/ano no registro.br):** domínio próprio, ex.: `gestao.lubian.com.br`, com registro **CNAME**
  apontando para a plataforma; trocar `APP_URL` (links antigos param de funcionar — avisar clientes com cobrança aberta).
- Cookie de sessão `Secure` em produção (conferir `src/lib/auth.ts`).
- Asaas (quando ligado): webhook `<APP_URL>/api/webhooks/asaas`, versão v3, eventos de cobrança,
  token = `ASAAS_WEBHOOK_TOKEN`, fila ativa. Com plataforma que "dorme", o 1º aviso pode demorar a ser aceito;
  o Asaas reenvia e a idempotência evita duplicar.

### Backup (grátis)
- O plano Free do Supabase **não tem backup**. Fazer o nosso, pelo **GitHub Actions** (grátis no repositório):
  `.github/workflows/backup.yml` diário às 3h roda `pg_dump` da `DATABASE_URL` (segredo do repositório),
  compacta, **criptografa** com `BACKUP_SENHA` (gpg) e guarda como artefato do Actions com retenção de 90 dias.
- Uma vez por mês a Flávia baixa o último backup para o computador/Google Drive (passo no `docs/OPERACAO.md`).
- Arquivos do Storage: cópia semanal pelo mesmo workflow (script `scripts/backup-arquivos.ts`).
- Documentar e **testar uma restauração** num banco vazio (PGlite local serve) antes de considerar pronto.

### Variáveis de ambiente (acrescentar à tabela do README)
| Variável | Uso |
|---|---|
| `ASAAS_ATIVO` | `1` liga a integração; sem ela, Pix manual como na Fase 3 |
| `ASAAS_AMBIENTE` | `sandbox` ou `producao` |
| `ASAAS_API_KEY` | Chave da API do Asaas (do ambiente correspondente) |
| `ASAAS_WEBHOOK_TOKEN` | Token conferido no webhook (gerar aleatório, ≥ 32 caracteres) |
| `ARQUIVOS_DRIVER` | `disco` (padrão) ou `supabase` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Storage (só servidor) |
| `BACKUP_SENHA` | Senha da criptografia do backup (segredo do GitHub, guardar também fora do sistema) |
| `CHROMIUM_SEM_SANDBOX` | `1` se o Chromium do contêiner exigir `--no-sandbox` |

### Ordem de entrada no ar
1. Supabase Free criado, migrações e semente aplicadas; Storage com o bucket.
2. Contêiner publicado na plataforma escolhida (com alerta de orçamento, se pedir cartão), `ASAAS_ATIVO`
   **desligado**, Pix estático (A0) funcionando; backup diário rodando.
3. Flávia e Bruna usam em produção com baixa manual.
4. Quando o volume de cobranças justificar a tarifa: conta Asaas (CNPJ 44.883.814/0001-97), chave de produção,
   webhook → `ASAAS_ATIVO=1`; 1ª cobrança real de R$ 1 paga pela própria Flávia para ver baixa, recibo e agenda.

### Pronto quando (Parte B)
Sistema aberto no endereço da plataforma com login; PDF de orçamento, recibo e fatura gerados em produção;
foto de vistoria enviada e reaberta (Storage); backup do dia presente no GitHub Actions e uma restauração testada;
`docs/ESCOPO.md` §5 atualizado com a hospedagem escolhida e o README com as novas variáveis.

### Quando houver caixa (não fazer agora)
- Supabase **Pro** (~US$ 25/mês): backup diário gerenciado, sem pausa.
- Domínio próprio (~R$ 40/ano).
- Asaas ligado (tarifa por Pix recebido — conferir a tabela da conta).
- Hospedagem paga sem "dormir" (Railway/Render pago) se o Cloud Run/Render Free ficar lento.
