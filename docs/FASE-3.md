# Fase 3 — Financeiro (especificação para implementar)

Leia antes: `AGENTS.md`, `docs/ESCOPO.md` §3.8, §3.9 e §3.11. Fases 1 e 2 prontas
(`alocacoes`, `bloqueios`, `pagamentos` e `src/lib/operacao.ts` já existem; o sinal já é registrado).
Reaproveite: `src/fatura.ts` + `templates/fatura-mensal.html`, `src/recibo.ts` + `templates/recibo.html`,
`src/lib/numeracao.ts` (REC / FAT), `src/lib/arquivos.ts`.

## Banco
- `cobrancas` (contas a receber): id, empresaId, clienteId, orcamentoId?, faturaId?, tipo `sinal | saldo | fatura`,
  descricao, valor, vencimento (date), status `aberta | paga | cancelada`, criadoEm.
  - Ao aprovar orçamento: cria `sinal` (vence na aprovação) e `saldo` (vence na entrega, data prevista = último dia
    das alocações). Se o cliente tiver condição especial (ex.: CREDCREA), uma cobrança única de 100% com vencimento
    em **N dias úteis após a entrega** — adicionar `clientes.prazoDiasUteis` (int, opcional).
  - Migração: criar as cobranças dos orçamentos já aprovados e ligar os pagamentos de sinal existentes.
- `pagamentos`: `orcamentoId` passa a opcional; adicionar `cobrancaId` e tipo `fatura`. Pagar uma cobrança marca-a `paga`.
- `contratos` (recorrentes): id, empresaId, clienteId, obraId, diasSemana int[], diariaBase (180),
  descontoAntecipacao (0.10), diariaEspecie (160, opcional), prazoDias (7), saudacao, ativo.
- `faturas`: id, empresaId, contratoId, numero (FAT-AAAA-NNNN), ano, mes, diariasProgramadas, faltas,
  calculo jsonb (`ResultadoFatura`), emissao, vencimento, criadoEm. Gera uma `cobranca` tipo `fatura` (valor Pix).
- `despesas`: id, empresaId, orcamentoId?, categoria `transporte | alimentacao | produtos | locacao | outros | geral`,
  descricao, valor, data, criadoEm.
- `vales` (adiantamentos da equipe): id, empresaId, membroEquipeId, valor, data, descricao, acertoId?.
- `acertos`: id, empresaId, membroEquipeId, de, ate, diarias, totalDiarias, totalVales, liquido, pagoEm?, criadoEm.

## Regras (funções puras + testes)
- `src/lib/dias-uteis.ts`: somar N dias úteis (pular sáb/dom e bloqueios da empresa toda).
- `src/lib/acerto.ts`: para um profissional e período, somar as alocações com presença `presente`
  (status `confirmada`/`concluida`) × diária daquele projeto (pelo nome em `orcamento.precificacao.equipe`;
  se não achar, `equipe.diariaPadrao`) − vales em aberto = líquido. Fechar acerto liga os vales a ele.
- `src/lib/lucro.ts`: lucro real da obra = pagamentos recebidos − (diárias das alocações presentes + despesas).
  Markup real = lucro ÷ custo real. Semáforo: 🟢 ≥ 30% · 🟡 0–30% · 🔴 prejuízo.
- Fatura mensal: dias da semana do contrato no mês (`diasProgramados`) sem os bloqueios da empresa toda;
  faltas digitadas pela Bruna; pagamento em espécie usa o total em espécie.

## Telas
- `/financeiro`: contas a receber (abertas, vencidas em vermelho, pagas no mês) com filtro; botão
  **Registrar pagamento** (valor, forma, data, comprovante) → gera e baixa o **recibo PDF**
  (sinal = `tipo: sinal`; saldo/100% = `tipo: quitacao`, numeração REC). O recibo do sinal da Fase 2 também ganha botão.
- `/contratos`: cadastro dos recorrentes; em cada um, **Gerar fatura** (mês, faltas) → PDF no modelo Katiane,
  botão WhatsApp com mensagem e link do PDF (rota pública por token, como `/p/[token]`).
- `/despesas`: lançar por obra ou geral; no orçamento aprovado, quadro **Previsto × Realizado**.
- `/equipe/acerto`: escolher profissional e período → extrato (dias, obras, diárias, vales, líquido),
  lançar vale, **Fechar acerto** e **Marcar como pago**; página imprimível.
- `/relatorios`: faturamento do mês (recebido × a receber), **lucro real por obra** com semáforo,
  **ranking de parceiros** (obras indicadas, orçamentos enviados/aprovados, conversão, faturamento).
- Painel: cobranças vencendo hoje e vencidas.

## Pronto quando
`npm test`, `npm run typecheck` e `next build` passam; `scripts/teste-e2e.ts` cobre: registrar saldo →
recibo de quitação em PDF; gerar fatura de um contrato → PDF; lançar despesa → lucro real aparece no relatório.
