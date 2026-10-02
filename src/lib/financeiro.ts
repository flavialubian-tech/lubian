/**
 * Financeiro (Fase 3): pagamentos das cobranças, contas a receber e despesas.
 * Toda função recebe a empresa da sessão e filtra por ela.
 */
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { ehData } from './agenda';
import { ErroNegocio } from './erros';
import { proximoNumero } from './numeracao';
import { FORMAS_PAGAMENTO, registrarEvento, sincronizarAlocacoes } from './operacao';

interface Contexto {
  empresaId: string;
  usuarioId: string;
}

export const pagamentoSchema = z.object({
  valor: z.coerce.number().positive('Informe o valor'),
  forma: z.enum(['pix', 'dinheiro', 'cartao', 'transferencia']),
  pagoEm: z.string().refine(ehData, 'Data inválida'),
  comprovante: z.string().nullable().default(null),
});

/**
 * "Dar baixa" numa cobrança: grava o pagamento (com número de recibo REC) e marca a cobrança paga.
 * Sinal pago confirma a agenda (D3). Devolve o id do pagamento (para o recibo).
 */
export async function registrarPagamento(ctx: Contexto, cobrancaId: string, entrada: z.input<typeof pagamentoSchema>) {
  const dados = pagamentoSchema.parse(entrada);
  const cob = await db.query.cobrancas.findFirst({ where: and(eq(schema.cobrancas.id, cobrancaId), eq(schema.cobrancas.empresaId, ctx.empresaId)) });
  if (!cob) throw new ErroNegocio('Cobrança não encontrada');
  if (cob.status === 'paga') throw new ErroNegocio('Esta cobrança já foi paga');
  if (cob.status === 'cancelada') throw new ErroNegocio('Esta cobrança foi cancelada');
  if (cob.tipo === 'saldo' && cob.orcamentoId) {
    const sinalAberto = await db.query.cobrancas.findFirst({
      where: and(eq(schema.cobrancas.orcamentoId, cob.orcamentoId), eq(schema.cobrancas.tipo, 'sinal'), eq(schema.cobrancas.status, 'aberta')),
    });
    if (sinalAberto) throw new ErroNegocio('Registre primeiro o sinal deste orçamento');
  }

  const [pagamento] = await db
    .insert(schema.pagamentos)
    .values({
      empresaId: ctx.empresaId,
      orcamentoId: cob.orcamentoId,
      cobrancaId: cob.id,
      tipo: cob.tipo,
      valor: dados.valor.toFixed(2),
      forma: dados.forma,
      pagoEm: dados.pagoEm,
      comprovante: dados.comprovante,
      reciboNumero: await proximoNumero(db, ctx.empresaId, 'REC'),
      registradoPorId: ctx.usuarioId,
    })
    .returning({ id: schema.pagamentos.id });
  await db.update(schema.cobrancas).set({ status: 'paga' }).where(eq(schema.cobrancas.id, cob.id));

  if (cob.orcamentoId) {
    const resumo = `R$ ${dados.valor.toFixed(2)} · ${FORMAS_PAGAMENTO[dados.forma]}`;
    if (cob.tipo === 'sinal') {
      await sincronizarAlocacoes(ctx.empresaId, cob.orcamentoId);
      await registrarEvento(cob.orcamentoId, ctx.usuarioId, 'sinal_pago', resumo);
    } else {
      await registrarEvento(cob.orcamentoId, ctx.usuarioId, 'quitado', resumo);
    }
  }
  return pagamento.id;
}

/** Sinal pela tela do orçamento (Fase 2): dá baixa na cobrança de sinal em aberto. */
export async function registrarSinal(ctx: Contexto, orcamentoId: string, entrada: z.input<typeof pagamentoSchema>) {
  const orc = await db.query.orcamentos.findFirst({ where: and(eq(schema.orcamentos.id, orcamentoId), eq(schema.orcamentos.empresaId, ctx.empresaId)) });
  if (!orc) throw new ErroNegocio('Orçamento não encontrado');
  if (orc.status !== 'aprovado') throw new ErroNegocio('O orçamento precisa estar aprovado');
  const cob = await db.query.cobrancas.findFirst({
    where: and(eq(schema.cobrancas.orcamentoId, orcamentoId), eq(schema.cobrancas.tipo, 'sinal'), eq(schema.cobrancas.status, 'aberta')),
  });
  if (!cob) throw new ErroNegocio('Não há sinal em aberto para este orçamento');
  return registrarPagamento(ctx, cob.id, entrada);
}

// ───────────────────────────── Contas a receber ─────────────────────────────

export interface CobrancaListada {
  id: string;
  tipo: 'sinal' | 'saldo' | 'fatura';
  descricao: string;
  valor: number;
  vencimento: string;
  status: 'aberta' | 'paga' | 'cancelada';
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string | null;
  orcamentoId: string | null;
  orcamentoNumero: string | null;
  obraNome: string | null;
  faturaId: string | null;
  faturaNumero: string | null;
  /** Total em espécie da fatura (pagamento em dinheiro). */
  valorEspecie: number | null;
}

export async function listarCobrancas(empresaId: string, filtro: { status?: ('aberta' | 'paga' | 'cancelada')[]; venceAte?: string; orcamentoId?: string } = {}) {
  const linhas = await db
    .select({
      id: schema.cobrancas.id,
      tipo: schema.cobrancas.tipo,
      descricao: schema.cobrancas.descricao,
      valor: schema.cobrancas.valor,
      vencimento: schema.cobrancas.vencimento,
      status: schema.cobrancas.status,
      clienteId: schema.clientes.id,
      clienteNome: schema.clientes.nome,
      clienteTelefone: schema.clientes.telefone,
      orcamentoId: schema.cobrancas.orcamentoId,
      orcamentoNumero: schema.orcamentos.numero,
      obraOrcamento: sql<string | null>`(select ${schema.obras.nome} from ${schema.obras} where ${schema.obras.id} = ${schema.orcamentos.obraId})`,
      obraContrato: sql<string | null>`(select ${schema.obras.nome} from ${schema.obras} where ${schema.obras.id} = ${schema.contratos.obraId})`,
      faturaId: schema.cobrancas.faturaId,
      faturaNumero: schema.faturas.numero,
      calculo: schema.faturas.calculo,
    })
    .from(schema.cobrancas)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.cobrancas.clienteId))
    .leftJoin(schema.orcamentos, eq(schema.orcamentos.id, schema.cobrancas.orcamentoId))
    .leftJoin(schema.faturas, eq(schema.faturas.id, schema.cobrancas.faturaId))
    .leftJoin(schema.contratos, eq(schema.contratos.id, schema.faturas.contratoId))
    .where(
      and(
        eq(schema.cobrancas.empresaId, empresaId),
        filtro.status ? inArray(schema.cobrancas.status, filtro.status) : undefined,
        filtro.venceAte ? lte(schema.cobrancas.vencimento, filtro.venceAte) : undefined,
        filtro.orcamentoId ? eq(schema.cobrancas.orcamentoId, filtro.orcamentoId) : undefined,
      ),
    )
    .orderBy(asc(schema.cobrancas.vencimento), asc(schema.clientes.nome));
  return linhas.map(
    ({ obraOrcamento, obraContrato, calculo, ...l }): CobrancaListada => ({
      ...l,
      valor: Number(l.valor),
      obraNome: obraOrcamento ?? obraContrato,
      valorEspecie: calculo?.especie?.total ?? null,
    }),
  );
}

export interface PagamentoListado {
  id: string;
  cobrancaId: string | null;
  tipo: 'sinal' | 'saldo' | 'fatura';
  valor: number;
  forma: keyof typeof FORMAS_PAGAMENTO;
  pagoEm: string;
  comprovante: string | null;
  reciboNumero: string | null;
  descricao: string | null;
  clienteNome: string | null;
  orcamentoId: string | null;
  orcamentoNumero: string | null;
  criadoEm: Date;
}

/** Pagamentos recebidos no período (ou de um orçamento). */
export async function listarPagamentos(empresaId: string, filtro: { de?: string; ate?: string; orcamentoId?: string }) {
  const linhas = await db
    .select({
      id: schema.pagamentos.id,
      cobrancaId: schema.pagamentos.cobrancaId,
      tipo: schema.pagamentos.tipo,
      valor: schema.pagamentos.valor,
      forma: schema.pagamentos.forma,
      pagoEm: schema.pagamentos.pagoEm,
      comprovante: schema.pagamentos.comprovante,
      reciboNumero: schema.pagamentos.reciboNumero,
      descricao: schema.cobrancas.descricao,
      clienteNome: schema.clientes.nome,
      orcamentoId: schema.pagamentos.orcamentoId,
      orcamentoNumero: schema.orcamentos.numero,
      criadoEm: schema.pagamentos.criadoEm,
    })
    .from(schema.pagamentos)
    .leftJoin(schema.cobrancas, eq(schema.cobrancas.id, schema.pagamentos.cobrancaId))
    .leftJoin(schema.orcamentos, eq(schema.orcamentos.id, schema.pagamentos.orcamentoId))
    .leftJoin(schema.clientes, sql`${schema.clientes.id} = coalesce(${schema.cobrancas.clienteId}, ${schema.orcamentos.clienteId})`)
    .where(
      and(
        eq(schema.pagamentos.empresaId, empresaId),
        filtro.de ? gte(schema.pagamentos.pagoEm, filtro.de) : undefined,
        filtro.ate ? lte(schema.pagamentos.pagoEm, filtro.ate) : undefined,
        filtro.orcamentoId ? eq(schema.pagamentos.orcamentoId, filtro.orcamentoId) : undefined,
      ),
    )
    .orderBy(desc(schema.pagamentos.pagoEm), desc(schema.pagamentos.criadoEm));
  return linhas.map((l): PagamentoListado => ({ ...l, valor: Number(l.valor) }));
}

// ───────────────────────────── Despesas ─────────────────────────────

export const CATEGORIAS_DESPESA = {
  transporte: 'Transporte',
  alimentacao: 'Alimentação',
  produtos: 'Produtos e fretes',
  locacao: 'Locação (andaime, máquinas)',
  outros: 'Outros',
  geral: 'Geral da empresa',
} as const;
export type CategoriaDespesa = keyof typeof CATEGORIAS_DESPESA;

export const despesaSchema = z.object({
  orcamentoId: z.string().uuid().nullable(),
  categoria: z.enum(Object.keys(CATEGORIAS_DESPESA) as [CategoriaDespesa]),
  descricao: z.string().trim().min(1, 'Informe a descrição'),
  valor: z.coerce.number().positive('Informe o valor'),
  data: z.string().refine(ehData, 'Data inválida'),
});

export async function lancarDespesa(ctx: Contexto, entrada: z.input<typeof despesaSchema>) {
  const d = despesaSchema.parse(entrada);
  if (d.orcamentoId) {
    const orc = await db.query.orcamentos.findFirst({ where: and(eq(schema.orcamentos.id, d.orcamentoId), eq(schema.orcamentos.empresaId, ctx.empresaId)) });
    if (!orc || orc.status !== 'aprovado') throw new ErroNegocio('Escolha uma obra com orçamento aprovado');
    if (d.categoria === 'geral') throw new ErroNegocio('Despesa de obra precisa de uma categoria (transporte, alimentação…)');
  }
  await db.insert(schema.despesas).values({ ...d, valor: d.valor.toFixed(2), empresaId: ctx.empresaId });
}

export async function removerDespesa(ctx: Contexto, id: string) {
  await db.delete(schema.despesas).where(and(eq(schema.despesas.id, id), eq(schema.despesas.empresaId, ctx.empresaId)));
}

export async function listarDespesas(empresaId: string, filtro: { de?: string; ate?: string; orcamentoId?: string }) {
  const linhas = await db
    .select({
      id: schema.despesas.id,
      categoria: schema.despesas.categoria,
      descricao: schema.despesas.descricao,
      valor: schema.despesas.valor,
      data: schema.despesas.data,
      orcamentoId: schema.despesas.orcamentoId,
      orcamentoNumero: schema.orcamentos.numero,
      obraNome: schema.obras.nome,
    })
    .from(schema.despesas)
    .leftJoin(schema.orcamentos, eq(schema.orcamentos.id, schema.despesas.orcamentoId))
    .leftJoin(schema.obras, eq(schema.obras.id, schema.orcamentos.obraId))
    .where(
      and(
        eq(schema.despesas.empresaId, empresaId),
        filtro.de ? gte(schema.despesas.data, filtro.de) : undefined,
        filtro.ate ? lte(schema.despesas.data, filtro.ate) : undefined,
        filtro.orcamentoId ? eq(schema.despesas.orcamentoId, filtro.orcamentoId) : undefined,
      ),
    )
    .orderBy(desc(schema.despesas.data), desc(schema.despesas.criadoEm));
  return linhas.map((l) => ({ ...l, valor: Number(l.valor) }));
}

/** Orçamentos aprovados (obras em execução ou entregues) para escolher nas telas. */
export function listarObrasAprovadas(empresaId: string) {
  return db
    .select({ id: schema.orcamentos.id, numero: schema.orcamentos.numero, obraNome: schema.obras.nome, clienteNome: schema.clientes.nome })
    .from(schema.orcamentos)
    .innerJoin(schema.obras, eq(schema.obras.id, schema.orcamentos.obraId))
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.orcamentos.clienteId))
    .where(and(eq(schema.orcamentos.empresaId, empresaId), eq(schema.orcamentos.status, 'aprovado')))
    .orderBy(desc(schema.orcamentos.aprovadoEm));
}
