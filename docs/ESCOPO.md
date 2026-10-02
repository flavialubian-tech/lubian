# Lubian Gestão — Documento de Escopo (v0.1)

> Sistema de gestão (SaaS) para a **Lubian Limpezas** — Engenharia de Limpeza Pós-Obra.
> Status: **rascunho para aprovação**. Nenhum código foi escrito ainda.

---

## 1. Visão geral

Sistema web responsivo (funciona no computador e no celular, instalável como app) que cobre
o ciclo completo de uma obra:

```
Lead (WhatsApp) → Vistoria Técnica → Orçamento → Aprovação do cliente → Sinal 50%
   → Agenda/Equipe → Execução + Checklist Handover → Quitação 50% → Acerto da equipe
   → Relatório de lucro real da obra
```

E, em paralelo, o ciclo dos **contratos recorrentes/mensais** (diária R$ 180 / R$ 160 →
fatura mensal com abatimento de faltas).

Desde o início o banco de dados será **multiempresa** (cada registro pertence a uma
"empresa"), para que no futuro outras empresas de limpeza possam usar o sistema com
sua própria marca, sem retrabalho.

---

## 2. Usuários e permissões

| Perfil | Quem | Acesso | Dispositivo principal |
|---|---|---|---|
| **Gestão** (admin) | Flávia | Tudo: custos, margens, lucro, configurações | Celular (vistorias) + PC |
| **Administrativo** | Bruna | Clientes, orçamentos, agenda, financeiro, WhatsApp. *(Ver custos/margem? — decisão D5)* | Computador |
| **Líder de equipe** | Anderson | Somente leitura: escala e agenda da semana, endereço da obra, checklist | Celular |
| **Auxiliar** | Leandro, Nicoly… | Somente a própria escala/agenda | Celular |
| **Cliente** (sem login) | Arquitetos, construtoras, PF | Link seguro: ver/aprovar orçamento, baixar fatura e recibos, ver Pix | Celular |

---

## 3. Módulos

### 3.1 Cadastros

**Clientes**
- Tipo: Pessoa Física · Arquiteto Parceiro · Construtora · Escritório/Empresa (B2B) · Imobiliária
- Nome/Razão social, CPF/CNPJ, telefone/WhatsApp, e-mail
- **Endereço de cobrança** (sede — ex.: CREDCREA) separado dos endereços de obra
- Indicado por (vincula a um Arquiteto Parceiro → alimenta o ranking)
- Prazo de pagamento padrão (ex.: "50/50" ou "10 dias úteis após NF")
- Observações

**Obras / Imóveis** — um cliente tem **várias obras**
- Endereço da obra, tipo de imóvel, m², andar/acesso, contato no local
- Arquiteto/construtora responsável
- Histórico: vistorias, orçamentos, serviços, fotos

**Equipe**
- Nome, função (Líder / Auxiliar), telefone, **cor na agenda**
- **Diária padrão** (ex.: Flávia R$ 250; Anderson/Leandro/Nicoly R$ 180–230)
- A diária pode ser **sobrescrita por projeto** (o valor do orçamento prevalece)
- Habilitações (ex.: NR-35 para trabalho em altura) — o sistema avisa se escalar alguém sem NR-35 em serviço de fachada

**Catálogo de serviços**
- Limpeza Intermediária (Pré-Marcenaria)
- Limpeza Final (Handover)
- Desincrustação Técnica Pesada
- Vidros/Fachadas em Altura (NR-35)
- Limpeza Recorrente/Mensal
- Cada serviço com: descrição técnica padrão (texto que vai no PDF), faixa de referência
  R$/m² (ex.: Intermediária R$ 11–14, Final R$ 15–18) e checklist padrão

### 3.2 Pré-qualificação rápida (atendimento — Bruna)
Calculadora simples para o WhatsApp: m² × faixa R$/m² do serviço, respeitando o
**Setup Mínimo (R$ 1.100–1.200)**. Gera uma **estimativa** (não é orçamento oficial) e
cria o lead + agendamento da vistoria.

### 3.3 Vistoria Técnica (mobile — Flávia)
- Abre no celular a partir da agenda
- Medições (m² por ambiente), nível de sujeira, tipo de resíduo, acesso, necessidade de andaime
- **Fotos** (câmera do celular) anexadas à obra
- Observações → ao finalizar, botão **"Gerar orçamento a partir desta vistoria"**

### 3.4 Orçamento Técnico (motor de precificação)

O orçamento **não** é m² × preço. Ele nasce da vistoria e usa a fórmula de custos:

```
1. FORÇA-TAREFA    = Σ (diária de cada profissional × dias dele na obra)
2. CUSTOS VARIÁVEIS = Uber/Transporte + Alimentação/Marmitas + Produtos/Fretes + Locação (andaimes…)
3. CUSTO TOTAL     = Força-Tarefa + Custos Variáveis
4. VALOR FINAL     = Custo Total aplicado o Markup Estratégico (35% a 45%)   ← ver decisão D1
5. VALOR DE TABELA = Valor Final × fator de ancoragem (padrão 1,25; configurável)
6. DESCONTO DE PARCERIA = Valor de Tabela − Valor Final
```

**Exemplo** — 2 dias, Flávia (250) + Leandro (200) + Nicoly (180), variáveis R$ 300, markup 40%:

| Linha | Valor |
|---|---|
| Força-Tarefa: (250 + 200 + 180) × 2 | R$ 1.260,00 |
| Custos variáveis | R$ 300,00 |
| **Custo total** | **R$ 1.560,00** |
| Valor final (markup 40%: × 1,40) | R$ 2.184,00 |
| Valor de tabela (× 1,25, arredondado) | R$ 2.730,00 |
| Desconto de Parceria | − R$ 546,00 |
| **Cliente paga** | **R$ 2.184,00** |
| Sinal 50% / Quitação 50% | R$ 1.092,00 / R$ 1.092,00 |

Regras:
- **Trava de segurança:** o sistema **não deixa** salvar/enviar um valor abaixo do
  Custo Total + markup mínimo (35%). Só a Flávia pode liberar exceção, com justificativa.
- Tela interna mostra custos e margem; **o PDF do cliente mostra só** Valor de Tabela →
  Desconto de Parceria → Valor Final, escopo técnico, condições e validade.
- Validade do orçamento configurável (padrão sugerido: 7 dias).
- Versões: se o orçamento for revisado, guarda o histórico (v1, v2…).

**Funil:** Rascunho → Enviado → Aprovado → Recusado (com motivo) · Expirado
- **Alertas de follow-up** para a Bruna: ex.: 2 dias e 5 dias após envio sem resposta,
  e 1 dia antes de expirar. Painel "Orçamentos para cobrar hoje".

### 3.5 Link do cliente (sem login)
- Link único e seguro enviado pelo WhatsApp
- Cliente vê o orçamento, baixa o PDF e clica em **"Aprovar orçamento"** (registra data/hora e IP)
- Depois da aprovação, o mesmo link mostra: Pix do sinal, recibos e faturas para download

### 3.6 Agenda e Escala
- Visões dia / semana / mês, **cores por profissional ou equipe**
- Serviço de **vários dias** (contínuos ou dias escolhidos, ex.: qui + sex)
- Ao aprovar: os dias ficam **pré-reservados**; ao **pagar o sinal**, viram **confirmados** (ver decisão D3)
- Alerta de **conflito**: profissional já escalado em outra obra no mesmo dia
- Bloqueios: folgas, feriados, indisponibilidade
- Visão da equipe (líderes/auxiliares): "Minha semana" com endereço (abre no Maps) e horário

### 3.7 Execução e Checklist Handover
- Checklist por tipo de serviço (itens marcáveis no celular)
- **Fotos antes/depois** por ambiente
- Registro de presença da equipe no dia (alimenta o acerto e as faltas)
- Ao concluir: gera o **Checklist/Termo de Entrega** em PDF para o cliente

### 3.8 Financeiro

**Contas a receber**
- Cada obra aprovada gera automaticamente 2 parcelas: **Sinal 50%** (vence na aprovação)
  e **Quitação 50%** (vence na entrega) — ou a condição do cliente
  (ex.: CREDCREA: 100% em 10 dias úteis após entrega/NF)
- Status: Em aberto · Pago · Vencido · Cancelado
- Alertas de vencimento e atraso
- Formas: **Pix (principal)**, dinheiro, cartão, transferência, boleto

**Integração de pagamento (gateway)**
- Gera **Pix copia-e-cola / QR Code** no PDF e no link do cliente
- **Baixa automática** quando o cliente paga → confirma agenda → gera o recibo automaticamente
- Sugestão: **Asaas** (Pix, boleto, cartão, webhook de baixa e emissão de **NFS-e** na mesma
  plataforma — resolve também o item de nota fiscal no futuro)

**Contratos recorrentes / mensais**
- Contrato com cliente, dias da semana fixos, diária R$ 180 (Pix/Cartão) ou R$ 160 (espécie)
- Fatura mensal automática: dias trabalhados (vindos da agenda/presença) × diária − faltas

**Despesas**
- Lançadas **por obra** (Uber, marmitas, produtos, frete, andaime) e gerais da empresa
- Comparação **Previsto (orçamento) × Realizado** por obra

**Acerto da equipe**
- Semanal ou mensal (por profissional)
- Soma diárias trabalhadas (pelo valor do projeto) − faltas ± vales/adiantamentos
- Gera extrato/recibo de pagamento para cada profissional

### 3.9 Documentos PDF (com os modelos HTML da Lubian)
Os seus modelos HTML de Alto Padrão viram **templates** com campos dinâmicos. O sistema
gera o PDF com fidelidade ao layout (renderização em navegador headless):

1. Orçamento Técnico
2. Recibo de Sinal (Reserva de Agenda)
3. Recibo de Quitação
4. Fatura Mensal (recorrentes)
5. Checklist / Termo de Entrega (Handover)
6. Extrato de acerto da equipe *(interno)*

Numeração sequencial automática (ORC-2026-0001, REC-…, FAT-…).

### 3.10 WhatsApp
- Botão **"Enviar no WhatsApp"** em cada documento: abre o WhatsApp (Web ou app) já com a
  mensagem pronta no tom da Lubian + link do documento/PDF
- Modelos de mensagem editáveis (envio de orçamento, follow-up, cobrança do sinal,
  lembrete da véspera, cobrança da quitação)
- *Futuro:* API oficial do WhatsApp para envios automáticos (tem custo por mensagem)

### 3.11 Painel e Relatórios
- **Faturamento do mês** (recebido × a receber)
- **Lucro Líquido Real por Obra**: valor recebido − (diárias pagas + despesas reais),
  com semáforo: 🟢 margem ≥ meta · 🟡 abaixo da meta · 🔴 prejuízo
- **Ranking de parceiros** (arquitetos/construtoras): nº de obras indicadas, taxa de
  fechamento, faturamento gerado
- Funil de orçamentos (enviados, aprovados, recusados, taxa de conversão, motivos de recusa)
- Agenda da semana e contas vencendo

---

## 4. Fases de entrega (proposta)

| Fase | Entrega | Resultado para o negócio |
|---|---|---|
| **1 — Núcleo comercial** | Login/perfis, cadastros (clientes, obras, equipe, serviços), vistoria básica com fotos, motor de orçamento + trava de margem, **PDF do Orçamento**, link de aprovação, funil + follow-up, botão WhatsApp | Bruna e Flávia já orçam e vendem pelo sistema |
| **2 — Agenda e operação** | Agenda com cores, multi-dias, conflitos, visão da equipe, pré-reserva/confirmação, checklist handover + fotos, presença | Escala organizada, equipe vê a semana no celular |
| **3 — Financeiro** | Contas a receber, Recibos de Sinal/Quitação, Faturas mensais, despesas por obra, acerto da equipe, relatórios de lucro e ranking | Controle de "não pagar para trabalhar" |
| **4 — Automação** | Integração Asaas (Pix QR + baixa automática), lembretes automáticos | Bruna para de conferir extrato manualmente |
| **5 — Expansão** | NFS-e, WhatsApp API oficial, cadastro de outras empresas (SaaS comercial) | Novo produto/receita |

---

## 5. Tecnologia sugerida

| Item | Escolha | Por quê |
|---|---|---|
| Aplicação | **Next.js (React) + TypeScript**, PWA | Um só sistema para PC e celular, instalável como app |
| Banco/Login/Arquivos | **Supabase** (PostgreSQL + Auth + Storage) | Fotos das vistorias, perfis de acesso e isolamento por empresa (multiempresa) nativos; plano gratuito para começar |
| PDF | Templates HTML da Lubian → **Chromium headless** | PDF idêntico ao layout que vocês já usam |
| Pagamentos/NFS-e | **Asaas** (API + webhooks) | Pix com baixa automática; NFS-e no mesmo lugar |
| Hospedagem | Vercel (app) + Supabase | Custo inicial baixo/zero |

---

## 6. Decisões pendentes (preciso da sua resposta)

- **D1 — Markup ou Margem?** São contas diferentes. Com custo de R$ 3.000:
  - *Markup 40%* (custo × 1,40) → cliente paga **R$ 4.200** → lucro R$ 1.200 = 28,6% do preço
  - *Margem 40%* (custo ÷ 0,60) → cliente paga **R$ 5.000** → lucro R$ 2.000 = 40% do preço
  Qual das duas é a "fórmula sagrada"? E o relatório "margem dos 40% respeitada" mede qual?
- **D2 — Fator de ancoragem** do Valor de Tabela: fixo (ex.: 1,25) ou a Bruna/Flávia escolhe
  por orçamento (1,20 a 1,30)? Arredondar para centena/dezena?
- **D3 — Agenda:** aprovação = pré-reserva e **sinal pago = confirmação** (libera a vaga se
  o sinal não vier em X dias)? Ou a aprovação já confirma?
- **D4 — Acerto da equipe:** semanal ou mensal? Existem vales/adiantamentos a descontar?
- **D5 — Bruna** pode ver custos, diárias da equipe e margem, ou só o valor final?
- **D6 — Prazos de follow-up** e validade do orçamento (sugestão: lembretes em 2 e 5 dias,
  validade 7 dias).
- **D7 — Gateway:** podemos seguir com **Asaas**, ou já têm conta em outro (Mercado Pago,
  Inter, Sicredi/Cresol…)? Alguma taxa de cartão é repassada ao cliente?
- **D8 — Modelos HTML:** quando aprovar este escopo, envie os 4 modelos (Orçamento, Fatura,
  Recibo de Sinal, Recibo de Quitação) e, se tiver, o do Checklist.
