/**
 * Contratos recorrentes e fatura mensal (modelo Katiane).
 *   Dias da semana do contrato no mês, sem os bloqueios da empresa toda, − faltas = diárias faturadas.
 */
import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { calcularFaturaMensal, diasProgramados, referenciaMes } from '@/fatura';
import { hojeSP, somarDias } from './agenda';
import { feriadosDaEmpresa } from './contas-receber';
import { diasBloqueadosNoMes } from './dias-uteis';
import { ErroNegocio } from './erros';
import { proximoNumero } from './numeracao';

interface Contexto {
  empresaId: string;
  usuarioId: string;
}

export const contratoSchema = z.object({
  obraId: z.string().uuid('Escolha a obra'),
  diasSemana: z.array(z.coerce.number().int().min(0).max(6)).min(1, 'Escolha ao menos um dia da semana'),
  diariaBase: z.coerce.number().positive('Informe a diária'),
  descontoAntecipacao: z.coerce.number().min(0).max(1),
  diariaEspecie: z.coerce.number().positive().nullable(),
  prazoDias: z.coerce.number().int().min(0).max(90),
  saudacao: z.string().trim().nullable(),
  ativo: z.boolean(),
});

/** Cria ou atualiza o contrato; o cliente é o dono da obra. */
export async function salvarContrato(ctx: Contexto, id: string | null, entrada: z.input<typeof contratoSchema>) {
  const c = contratoSchema.parse(entrada);
  const obra = await db.query.obras.findFirst({ where: and(eq(schema.obras.id, c.obraId), eq(schema.obras.empresaId, ctx.empresaId)) });
  if (!obra) throw new ErroNegocio('Obra inválida');
  const valores = {
    clienteId: obra.clienteId,
    obraId: obra.id,
    diasSemana: [...new Set(c.diasSemana)].sort(),
    diariaBase: c.diariaBase.toFixed(2),
    descontoAntecipacao: c.descontoAntecipacao.toFixed(4),
    diariaEspecie: c.diariaEspecie?.toFixed(2) ?? null,
    prazoDias: c.prazoDias,
    saudacao: c.saudacao || null,
    ativo: c.ativo,
  };
  if (id) {
    const r = await db
      .update(schema.contratos)
      .set(valores)
      .where(and(eq(schema.contratos.id, id), eq(schema.contratos.empresaId, ctx.empresaId)))
      .returning({ id: schema.contratos.id });
    if (!r.length) throw new ErroNegocio('Contrato não encontrado');
    return id;
  }
  const [novo] = await db
    .insert(schema.contratos)
    .values({ ...valores, empresaId: ctx.empresaId })
    .returning({ id: schema.contratos.id });
  return novo.id;
}

export const gerarFaturaSchema = z.object({
  ano: z.coerce.number().int().min(2020).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  faltas: z.coerce.number().int().min(0, 'Faltas não podem ser negativas'),
});

/**
 * Gera a fatura do mês (ou recalcula a que ainda não foi paga, mantendo o número) e a cobrança
 * correspondente pelo total no Pix.
 */
export async function gerarFatura(ctx: Contexto, contratoId: string, entrada: z.input<typeof gerarFaturaSchema>) {
  const { ano, mes, faltas } = gerarFaturaSchema.parse(entrada);
  const contrato = await db.query.contratos.findFirst({ where: and(eq(schema.contratos.id, contratoId), eq(schema.contratos.empresaId, ctx.empresaId)) });
  if (!contrato) throw new ErroNegocio('Contrato não encontrado');

  const calendario = diasProgramados(ano, mes, contrato.diasSemana, diasBloqueadosNoMes(ano, mes, await feriadosDaEmpresa(ctx.empresaId)));
  const diariasProgramadas = calendario.reduce((s, c) => s + c.dias.length, 0);
  if (faltas > diariasProgramadas) throw new ErroNegocio(`Faltas (${faltas}) acima das ${diariasProgramadas} diárias programadas`);
  const calculo = calcularFaturaMensal({
    diariasProgramadas,
    faltas,
    diariaBase: Number(contrato.diariaBase),
    descontoAntecipacao: Number(contrato.descontoAntecipacao),
    diariaEspecie: contrato.diariaEspecie === null ? undefined : Number(contrato.diariaEspecie),
  });
  const emissao = hojeSP();
  const vencimento = somarDias(emissao, contrato.prazoDias);
  const dados = { diariasProgramadas, faltas, calculo, calendario, emissao, vencimento };

  const existente = await db.query.faturas.findFirst({
    where: and(eq(schema.faturas.contratoId, contratoId), eq(schema.faturas.ano, ano), eq(schema.faturas.mes, mes)),
  });
  let fatura: typeof schema.faturas.$inferSelect;
  if (existente) {
    const cob = await db.query.cobrancas.findFirst({ where: eq(schema.cobrancas.faturaId, existente.id) });
    if (cob?.status === 'paga') throw new ErroNegocio(`A fatura ${existente.numero} deste mês já foi paga`);
    [fatura] = await db.update(schema.faturas).set(dados).where(eq(schema.faturas.id, existente.id)).returning();
  } else {
    [fatura] = await db
      .insert(schema.faturas)
      .values({
        ...dados,
        empresaId: ctx.empresaId,
        contratoId,
        ano,
        mes,
        numero: await proximoNumero(db, ctx.empresaId, 'FAT', ano),
        tokenPublico: randomBytes(18).toString('base64url'),
      })
      .returning();
  }

  const cobranca = {
    empresaId: ctx.empresaId,
    clienteId: contrato.clienteId,
    faturaId: fatura.id,
    tipo: 'fatura' as const,
    descricao: `Fatura ${fatura.numero} · Diárias de ${referenciaMes(ano, mes)}`,
    valor: calculo.pix.total.toFixed(2),
    vencimento,
    status: 'aberta' as const,
  };
  const r = await db.update(schema.cobrancas).set(cobranca).where(eq(schema.cobrancas.faturaId, fatura.id)).returning({ id: schema.cobrancas.id });
  if (!r.length) await db.insert(schema.cobrancas).values(cobranca);
  return fatura;
}

export async function listarContratos(empresaId: string) {
  const contratos = await db
    .select({ contrato: schema.contratos, clienteNome: schema.clientes.nome, clienteTelefone: schema.clientes.telefone, obraNome: schema.obras.nome })
    .from(schema.contratos)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.contratos.clienteId))
    .innerJoin(schema.obras, eq(schema.obras.id, schema.contratos.obraId))
    .where(eq(schema.contratos.empresaId, empresaId))
    .orderBy(desc(schema.contratos.ativo), asc(schema.clientes.nome));
  const ids = contratos.map((c) => c.contrato.id);
  const faturas = ids.length
    ? await db
        .select({ fatura: schema.faturas, cobrancaStatus: schema.cobrancas.status })
        .from(schema.faturas)
        .leftJoin(schema.cobrancas, eq(schema.cobrancas.faturaId, schema.faturas.id))
        .where(inArray(schema.faturas.contratoId, ids))
        .orderBy(desc(schema.faturas.ano), desc(schema.faturas.mes))
    : [];
  return contratos.map((c) => ({ ...c, faturas: faturas.filter((f) => f.fatura.contratoId === c.contrato.id) }));
}

/** Fatura pelo link público (/f/[token]). */
export function faturaPorToken(token: string) {
  return db.query.faturas.findFirst({ where: eq(schema.faturas.tokenPublico, token) });
}
