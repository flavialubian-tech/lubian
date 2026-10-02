# Fase 2 — Agenda e Operação (especificação para implementar)

Leia antes: `AGENTS.md` (convenções), `docs/ESCOPO.md` §3.6 e §3.7. A Fase 1 está pronta e testada.

## Regra de ouro (D3)
Aprovação do cliente = **pré-reserva**. A agenda só fica **confirmada** quando o **sinal de 50%** é registrado como pago.

## Banco (novas tabelas em `src/db/schema.ts`, depois `npm run db:gerar`)
- `orcamentos.datasPrevistas` (jsonb `string[]` 'AAAA-MM-DD') — preenchidas no editor (seção 1) e mostradas no cronograma.
- `alocacoes`: id, empresaId, orcamentoId, obraId, membroEquipeId, data (date), status
  `pre_reserva | confirmada | concluida | cancelada`, presenca `null | presente | falta`, criadoEm.
- `bloqueios`: id, empresaId, membroEquipeId (null = empresa toda, ex.: feriado), dataInicio, dataFim, motivo.
- `pagamentos` (base da Fase 3): id, empresaId, orcamentoId, tipo `sinal | saldo`, valor, forma
  (`pix | dinheiro | cartao | transferencia`), pagoEm, comprovante (chave de arquivo, opcional), registradoPorId.

## Regras (funções puras + testes em `src/lib/agenda.ts`)
- `gerarAlocacoes(forcaTarefa, datas)` → uma alocação por profissional × data.
- `conflitos(alocacoes, novas, bloqueios)` → mesmo profissional no mesmo dia em outra obra (não cancelada) ou bloqueado.
- Ao **aprovar** (cliente ou manual): cria alocações `pre_reserva` com os nomes da força-tarefa → membros da equipe.
- **Registrar sinal pago** (tela do orçamento: valor sugerido = sinal, forma, data, comprovante opcional):
  grava em `pagamentos` e muda as alocações para `confirmada`.
- Pré-reserva sem sinal há mais de 2 dias → aparece no painel "Para cobrar hoje" (cobrar sinal).
- Botão **"Serviço entregue"** no orçamento → alocações `concluida` (libera a quitação na Fase 3).

## Telas
- `/agenda`: visão **semana** (padrão) e **mês**; cores por profissional (`equipe.cor`); pré-reserva tracejada,
  confirmada sólida; filtro por profissional; aviso de conflito; no celular vira lista por dia.
  Criar/remover bloqueios (folga, feriado) na mesma tela.
- `/minha-semana` (Líder/Auxiliar, via `usuarios.membroEquipeId`): próximos 7 dias com obra, endereço
  (link para o Google Maps), colegas do dia e status. O líder marca **presença/falta** de cada um no dia.
- Painel: item "Sinal pendente" e próximos serviços da semana.

## Pronto quando
`npm test`, `npm run typecheck` e `next build` passam, e `scripts/teste-e2e.ts` cobre:
aprovar → pré-reserva na agenda → registrar sinal → confirmada → login do Anderson vê em "Minha semana".
