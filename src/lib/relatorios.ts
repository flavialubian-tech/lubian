/**
 * Relatórios: faturamento do mês, lucro real por obra e ranking de parceiros.
 */
import 'server-only';
import { and, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { diariaNoProjeto, trabalhou } from './acerto';
import { calcularLucroReal, rankingParceiros } from './lucro';
import { TIPOS_PARCEIRO } from './rotulos';

/** Primeiro e último dia do mês 'AAAA-MM'. */
export function limitesMes(mes: string) {
  const [a, m] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

export async function faturamentoDoMes(empresaId: string, mes: string, hoje: string) {
  const { de, ate } = limitesMes(mes);
  const [[recebido], [aReceber]] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${schema.pagamentos.valor}), 0)` })
      .from(schema.pagamentos)
      .where(and(eq(schema.pagamentos.empresaId, empresaId), gte(schema.pagamentos.pagoEm, de), lte(schema.pagamentos.pagoEm, ate))),
    db
      .select({
        total: sql<string>`coalesce(sum(${schema.cobrancas.valor}), 0)`,
        vencido: sql<string>`coalesce(sum(${schema.cobrancas.valor}) filter (where ${schema.cobrancas.vencimento} < ${hoje}), 0)`,
      })
      .from(schema.cobrancas)
      .where(and(eq(schema.cobrancas.empresaId, empresaId), eq(schema.cobrancas.status, 'aberta'), lte(schema.cobrancas.vencimento, ate))),
  ]);
  return { recebido: Number(recebido.total), aReceber: Number(aReceber.total), vencido: Number(aReceber.vencido) };
}

/** Recebido, diárias (presenças) e despesas reais de cada orçamento, com o lucro real. */
export async function custosReais(empresaId: string, orcamentoIds: string[]) {
  const mapa = new Map<string, ReturnType<typeof calcularLucroReal> & { despesasPorCategoria: Record<string, number> }>();
  if (!orcamentoIds.length) return mapa;
  const [pagos, alocacoes, despesas] = await Promise.all([
    db
      .select({ orcamentoId: schema.pagamentos.orcamentoId, total: sql<string>`sum(${schema.pagamentos.valor})` })
      .from(schema.pagamentos)
      .where(and(eq(schema.pagamentos.empresaId, empresaId), inArray(schema.pagamentos.orcamentoId, orcamentoIds)))
      .groupBy(schema.pagamentos.orcamentoId),
    db
      .select({
        orcamentoId: schema.alocacoes.orcamentoId,
        status: schema.alocacoes.status,
        presenca: schema.alocacoes.presenca,
        membroNome: schema.equipe.nome,
        diariaPadrao: schema.equipe.diariaPadrao,
        precificacao: schema.orcamentos.precificacao,
      })
      .from(schema.alocacoes)
      .innerJoin(schema.equipe, eq(schema.equipe.id, schema.alocacoes.membroEquipeId))
      .innerJoin(schema.orcamentos, eq(schema.orcamentos.id, schema.alocacoes.orcamentoId))
      .where(and(eq(schema.alocacoes.empresaId, empresaId), inArray(schema.alocacoes.orcamentoId, orcamentoIds), ne(schema.alocacoes.status, 'cancelada'))),
    db
      .select({ orcamentoId: schema.despesas.orcamentoId, categoria: schema.despesas.categoria, total: sql<string>`sum(${schema.despesas.valor})` })
      .from(schema.despesas)
      .where(and(eq(schema.despesas.empresaId, empresaId), inArray(schema.despesas.orcamentoId, orcamentoIds)))
      .groupBy(schema.despesas.orcamentoId, schema.despesas.categoria),
  ]);
  for (const id of orcamentoIds) {
    const recebido = Number(pagos.find((p) => p.orcamentoId === id)?.total ?? 0);
    const diarias = alocacoes
      .filter((a) => a.orcamentoId === id && trabalhou(a))
      .reduce((s, a) => s + diariaNoProjeto(a.membroNome, a.precificacao.equipe, Number(a.diariaPadrao)), 0);
    const despesasPorCategoria: Record<string, number> = {};
    for (const d of despesas.filter((x) => x.orcamentoId === id)) despesasPorCategoria[d.categoria] = Number(d.total);
    const totalDespesas = Object.values(despesasPorCategoria).reduce((s, v) => s + v, 0);
    mapa.set(id, { ...calcularLucroReal({ recebido, diarias, despesas: totalDespesas }), despesasPorCategoria });
  }
  return mapa;
}

/** Obras (orçamentos aprovados) com execução, entrega, pagamento ou despesa no mês. */
export async function lucroPorObra(empresaId: string, mes: string) {
  const { de, ate } = limitesMes(mes);
  const aprovados = await db
    .select({
      id: schema.orcamentos.id,
      numero: schema.orcamentos.numero,
      valorFinal: schema.orcamentos.valorFinal,
      datasPrevistas: schema.orcamentos.datasPrevistas,
      entregueEm: schema.orcamentos.entregueEm,
      obraNome: schema.obras.nome,
      clienteNome: schema.clientes.nome,
      comMovimento: sql<boolean>`exists (select 1 from ${schema.pagamentos} where ${schema.pagamentos.orcamentoId} = ${schema.orcamentos.id} and ${schema.pagamentos.pagoEm} between ${de} and ${ate})
        or exists (select 1 from ${schema.despesas} where ${schema.despesas.orcamentoId} = ${schema.orcamentos.id} and ${schema.despesas.data} between ${de} and ${ate})`,
    })
    .from(schema.orcamentos)
    .innerJoin(schema.obras, eq(schema.obras.id, schema.orcamentos.obraId))
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.orcamentos.clienteId))
    .where(and(eq(schema.orcamentos.empresaId, empresaId), eq(schema.orcamentos.status, 'aprovado')));
  const doMes = aprovados.filter(
    (o) =>
      o.comMovimento ||
      o.datasPrevistas.some((d) => d.startsWith(mes)) ||
      (o.entregueEm && o.entregueEm.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).startsWith(mes)),
  );
  const custos = await custosReais(
    empresaId,
    doMes.map((o) => o.id),
  );
  return doMes.map((o) => ({ ...o, valorFinal: Number(o.valorFinal), real: custos.get(o.id)! }));
}

/**
 * Ranking de parceiros: parceiro da obra (ou quem indicou o cliente), obras, orçamentos
 * enviados/aprovados, conversão e faturamento (valor final aprovado).
 */
export async function rankingDeParceiros(empresaId: string) {
  const [clientes, obras, orcamentos] = await Promise.all([
    db.query.clientes.findMany({ where: eq(schema.clientes.empresaId, empresaId) }),
    db.query.obras.findMany({ where: eq(schema.obras.empresaId, empresaId) }),
    db.query.orcamentos.findMany({
      where: eq(schema.orcamentos.empresaId, empresaId),
      columns: { obraId: true, clienteId: true, status: true, enviadoEm: true, valorFinal: true },
    }),
  ]);
  const cliente = new Map(clientes.map((c) => [c.id, c]));
  const parceiroDaObra = new Map(obras.map((o) => [o.id, o.parceiroId ?? cliente.get(o.clienteId)?.indicadoPorId ?? null]));
  const obrasPorParceiro = new Map<string, Set<string>>();
  for (const c of clientes.filter((c) => TIPOS_PARCEIRO.includes(c.tipo))) obrasPorParceiro.set(c.id, new Set());
  for (const [obraId, p] of parceiroDaObra) if (p) obrasPorParceiro.set(p, (obrasPorParceiro.get(p) ?? new Set()).add(obraId));
  const ranking = rankingParceiros(
    orcamentos.map((o) => ({
      parceiroId: parceiroDaObra.get(o.obraId) ?? cliente.get(o.clienteId)?.indicadoPorId ?? null,
      obraId: o.obraId,
      status: o.status,
      enviado: !!o.enviadoEm,
      valorFinal: Number(o.valorFinal),
    })),
    obrasPorParceiro,
  );
  return ranking.map((l) => ({ ...l, nome: cliente.get(l.parceiroId)?.nome ?? '—' }));
}
