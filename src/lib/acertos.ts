/**
 * Acerto da equipe (D4): extrato do período, vales e fechamento.
 */
import { and, asc, desc, eq, gte, isNull, lte, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { calcularAcerto } from './acerto';
import { ehData } from './agenda';
import { ErroNegocio } from './erros';

interface Contexto {
  empresaId: string;
  usuarioId: string;
}

async function buscarMembro(empresaId: string, id: string) {
  const m = await db.query.equipe.findFirst({ where: and(eq(schema.equipe.id, id), eq(schema.equipe.empresaId, empresaId)) });
  if (!m) throw new ErroNegocio('Profissional não encontrado');
  return m;
}

/** Escalas do profissional no período (com a força-tarefa de cada orçamento, para a diária). */
function alocacoesDoPeriodo(empresaId: string, membroEquipeId: string, de: string, ate: string) {
  return db
    .select({
      data: schema.alocacoes.data,
      status: schema.alocacoes.status,
      presenca: schema.alocacoes.presenca,
      obraNome: schema.obras.nome,
      numero: schema.orcamentos.numero,
      precificacao: schema.orcamentos.precificacao,
    })
    .from(schema.alocacoes)
    .innerJoin(schema.obras, eq(schema.obras.id, schema.alocacoes.obraId))
    .innerJoin(schema.orcamentos, eq(schema.orcamentos.id, schema.alocacoes.orcamentoId))
    .where(
      and(
        eq(schema.alocacoes.empresaId, empresaId),
        eq(schema.alocacoes.membroEquipeId, membroEquipeId),
        gte(schema.alocacoes.data, de),
        lte(schema.alocacoes.data, ate),
        ne(schema.alocacoes.status, 'cancelada'),
      ),
    )
    .orderBy(asc(schema.alocacoes.data));
}

/** Extrato: escalas do período, vales em aberto (até `ate`) e o cálculo do líquido. */
export async function extratoAcerto(empresaId: string, membroEquipeId: string, de: string, ate: string) {
  const membro = await buscarMembro(empresaId, membroEquipeId);
  const [alocacoes, vales] = await Promise.all([
    alocacoesDoPeriodo(empresaId, membroEquipeId, de, ate),
    db.query.vales.findMany({
      where: and(eq(schema.vales.empresaId, empresaId), eq(schema.vales.membroEquipeId, membroEquipeId), isNull(schema.vales.acertoId), lte(schema.vales.data, ate)),
      orderBy: asc(schema.vales.data),
    }),
  ]);
  const resultado = calcularAcerto({
    membro: { nome: membro.nome, diariaPadrao: Number(membro.diariaPadrao) },
    alocacoes: alocacoes.map((a) => ({ ...a, equipeOrcamento: a.precificacao.equipe })),
    vales: vales.map((v) => ({ valor: Number(v.valor) })),
  });
  return { membro, alocacoes, vales: vales.map((v) => ({ ...v, valor: Number(v.valor) })), resultado };
}

export const valeSchema = z.object({
  membroEquipeId: z.string().uuid(),
  valor: z.coerce.number().positive('Informe o valor do vale'),
  data: z.string().refine(ehData, 'Data inválida'),
  descricao: z.string().trim().nullable(),
});

export async function lancarVale(ctx: Contexto, entrada: z.input<typeof valeSchema>) {
  const v = valeSchema.parse(entrada);
  await buscarMembro(ctx.empresaId, v.membroEquipeId);
  await db.insert(schema.vales).values({ ...v, valor: v.valor.toFixed(2), descricao: v.descricao || null, empresaId: ctx.empresaId });
}

export async function removerVale(ctx: Contexto, id: string) {
  const r = await db
    .delete(schema.vales)
    .where(and(eq(schema.vales.id, id), eq(schema.vales.empresaId, ctx.empresaId), isNull(schema.vales.acertoId)))
    .returning({ id: schema.vales.id });
  if (!r.length) throw new ErroNegocio('Vale já incluído num acerto');
}

/** Fecha o período: grava os totais e liga os vales em aberto ao acerto. */
export async function fecharAcerto(ctx: Contexto, membroEquipeId: string, de: string, ate: string) {
  if (!ehData(de) || !ehData(ate) || de > ate) throw new ErroNegocio('Período inválido');
  const sobreposto = await db.query.acertos.findFirst({
    where: and(eq(schema.acertos.empresaId, ctx.empresaId), eq(schema.acertos.membroEquipeId, membroEquipeId), lte(schema.acertos.de, ate), gte(schema.acertos.ate, de)),
  });
  if (sobreposto) {
    throw new ErroNegocio(`Já existe acerto de ${sobreposto.de.split('-').reverse().join('/')} a ${sobreposto.ate.split('-').reverse().join('/')} para este período`);
  }
  const { vales, resultado: r } = await extratoAcerto(ctx.empresaId, membroEquipeId, de, ate);
  if (!r.diarias && !vales.length) throw new ErroNegocio('Nenhuma diária trabalhada nem vale no período');
  const [acerto] = await db
    .insert(schema.acertos)
    .values({
      empresaId: ctx.empresaId,
      membroEquipeId,
      de,
      ate,
      diarias: r.diarias,
      totalDiarias: r.totalDiarias.toFixed(2),
      totalVales: r.totalVales.toFixed(2),
      liquido: r.liquido.toFixed(2),
    })
    .returning({ id: schema.acertos.id });
  for (const v of vales) await db.update(schema.vales).set({ acertoId: acerto.id }).where(eq(schema.vales.id, v.id));
  return acerto.id;
}

export async function marcarAcertoPago(ctx: Contexto, id: string, pagoEm: string) {
  if (!ehData(pagoEm)) throw new ErroNegocio('Data inválida');
  await db
    .update(schema.acertos)
    .set({ pagoEm })
    .where(and(eq(schema.acertos.id, id), eq(schema.acertos.empresaId, ctx.empresaId)));
}

export function listarAcertos(empresaId: string, membroEquipeId: string) {
  return db.query.acertos.findMany({
    where: and(eq(schema.acertos.empresaId, empresaId), eq(schema.acertos.membroEquipeId, membroEquipeId)),
    orderBy: desc(schema.acertos.ate),
  });
}

/** Acerto fechado com as linhas do período (para o extrato imprimível). */
export async function obterAcerto(empresaId: string, id: string) {
  const acerto = await db.query.acertos.findFirst({ where: and(eq(schema.acertos.id, id), eq(schema.acertos.empresaId, empresaId)) });
  if (!acerto) return null;
  const membro = await buscarMembro(empresaId, acerto.membroEquipeId);
  const [alocacoes, vales] = await Promise.all([
    alocacoesDoPeriodo(empresaId, membro.id, acerto.de, acerto.ate),
    db.query.vales.findMany({ where: eq(schema.vales.acertoId, id), orderBy: asc(schema.vales.data) }),
  ]);
  const { linhas } = calcularAcerto({
    membro: { nome: membro.nome, diariaPadrao: Number(membro.diariaPadrao) },
    alocacoes: alocacoes.map((a) => ({ ...a, equipeOrcamento: a.precificacao.equipe })),
    vales: [],
  });
  return { acerto, membro, linhas, vales: vales.map((v) => ({ ...v, valor: Number(v.valor) })) };
}
