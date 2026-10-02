/**
 * Contas a receber dos orçamentos aprovados (cobranças de sinal e saldo).
 * Chamado pela operação (aprovação, reagendamento, entrega, liberação da pré-reserva).
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/db';
import { hojeSP } from './agenda';
import { entregaPrevista, planoCobrancas, vencimentoFinal } from './cobranca';
import type { Feriado } from './dias-uteis';

/** Feriados e recessos (bloqueios da empresa toda). */
export function feriadosDaEmpresa(empresaId: string): Promise<Feriado[]> {
  return db
    .select({ membroEquipeId: schema.bloqueios.membroEquipeId, dataInicio: schema.bloqueios.dataInicio, dataFim: schema.bloqueios.dataFim })
    .from(schema.bloqueios)
    .where(and(eq(schema.bloqueios.empresaId, empresaId), isNull(schema.bloqueios.membroEquipeId)));
}

const cobrancasDoOrcamento = (orcamentoId: string) => db.query.cobrancas.findMany({ where: eq(schema.cobrancas.orcamentoId, orcamentoId) });

/** Na aprovação: sinal + saldo (ou 100% na condição especial do cliente). Não duplica. */
export async function criarCobrancasDoOrcamento(empresaId: string, orcamentoId: string) {
  if ((await cobrancasDoOrcamento(orcamentoId)).length) return;
  const orc = await db.query.orcamentos.findFirst({ where: and(eq(schema.orcamentos.id, orcamentoId), eq(schema.orcamentos.empresaId, empresaId)) });
  if (!orc) return;
  const cliente = await db.query.clientes.findFirst({ where: eq(schema.clientes.id, orc.clienteId) });
  const plano = planoCobrancas({
    resultado: orc.resultado,
    aprovacao: hojeSP(orc.aprovadoEm ?? new Date()),
    datasPrevistas: orc.datasPrevistas,
    prazoDiasUteis: cliente?.prazoDiasUteis,
    feriados: await feriadosDaEmpresa(empresaId),
  });
  if (plano.length) {
    await db.insert(schema.cobrancas).values(plano.map((c) => ({ ...c, valor: c.valor.toFixed(2), empresaId, clienteId: orc.clienteId, orcamentoId })));
  }
}

/**
 * A agenda só é confirmada com o sinal pago (D3). Na condição especial (100% após a entrega)
 * não há sinal: a aprovação já confirma.
 */
export async function dispensaSinal(orcamentoId: string) {
  const lista = await cobrancasDoOrcamento(orcamentoId);
  return lista.length > 0 && !lista.some((c) => c.tipo === 'sinal');
}

/** Atualiza o vencimento da cobrança final (saldo/100%) para a data de entrega (prevista ou real). */
export async function ajustarVencimentoFinal(empresaId: string, orcamentoId: string, entrega: string) {
  const cliente = await db
    .select({ prazoDiasUteis: schema.clientes.prazoDiasUteis })
    .from(schema.orcamentos)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.orcamentos.clienteId))
    .where(eq(schema.orcamentos.id, orcamentoId));
  const vencimento = vencimentoFinal(entrega, cliente[0]?.prazoDiasUteis, await feriadosDaEmpresa(empresaId));
  await db
    .update(schema.cobrancas)
    .set({ vencimento })
    .where(and(eq(schema.cobrancas.orcamentoId, orcamentoId), eq(schema.cobrancas.tipo, 'saldo'), eq(schema.cobrancas.status, 'aberta')));
}

/** Reagendamento: vencimento do saldo acompanha o último dia e cobranças canceladas voltam a abrir. */
export async function reabrirCobrancas(empresaId: string, orcamentoId: string, datas: string[]) {
  await db
    .update(schema.cobrancas)
    .set({ status: 'aberta' })
    .where(and(eq(schema.cobrancas.orcamentoId, orcamentoId), eq(schema.cobrancas.status, 'cancelada')));
  await ajustarVencimentoFinal(empresaId, orcamentoId, entregaPrevista(datas, hojeSP()));
}

/** Pré-reserva liberada: as cobranças em aberto deixam de valer. */
export async function cancelarCobrancasAbertas(orcamentoId: string) {
  await db
    .update(schema.cobrancas)
    .set({ status: 'cancelada' })
    .where(and(eq(schema.cobrancas.orcamentoId, orcamentoId), inArray(schema.cobrancas.status, ['aberta'])));
}
