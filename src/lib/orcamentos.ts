/**
 * Regras de negócio dos orçamentos (salvar, enviar, follow-up, aprovar, recusar).
 * Toda função recebe a empresa da sessão e filtra por ela.
 */
import { randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import type { ConteudoOrcamento } from '@/db/schema';
import { calcularOrcamento, MARKUP_MINIMO_PADRAO, type EntradaOrcamento } from '@/precificacao';
import { normalizarDatas } from './agenda';
import { ErroNegocio } from './erros';
import { situacaoNoFunil } from './funil';
import { criarPreReservas, registrarEvento } from './operacao';
import { proximoNumero } from './numeracao';

export { ErroNegocio };

const texto = z.string().trim();
const textoOpcional = z.string().trim().default('');
const valor = z.coerce.number().min(0);

export const entradaPrecificacaoSchema = z.object({
  equipe: z.array(z.object({ nome: texto.min(1), diaria: valor, dias: z.coerce.number().min(0) })).min(1, 'Informe a força-tarefa'),
  custosVariaveis: z.object({
    transporte: valor.optional(),
    alimentacao: valor.optional(),
    produtosFretes: valor.optional(),
    locacao: valor.optional(),
    outros: valor.optional(),
  }),
  markup: z.coerce.number().min(0).max(3),
  ancoragem: z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('nenhuma') }),
    z.object({ tipo: z.literal('desconto_valor'), valor }),
    z.object({ tipo: z.literal('desconto_percentual'), percentual: z.coerce.number().min(0).max(0.9) }),
    z.object({ tipo: z.literal('valor_tabela'), valor }),
  ]),
  arredondamento: z.object({ modo: z.enum(['baixo', 'proximo', 'cima']), passo: z.coerce.number().positive() }).optional(),
});

const itemRotulado = z.object({ rotulo: textoOpcional, texto: textoOpcional });

export const conteudoSchema = z.object({
  tipoServico: textoOpcional,
  cronograma: textoOpcional,
  equipeTexto: textoOpcional,
  areaTexto: textoOpcional,
  localTexto: textoOpcional,
  informacoes: z.object({ titulo: textoOpcional, itens: z.array(z.string()) }),
  parecer: z.object({ titulo: textoOpcional, texto: textoOpcional }).nullable(),
  escopo: z.array(z.object({ titulo: textoOpcional, meta: textoOpcional, itens: z.array(z.string()), peso: z.coerce.number().min(0) })),
  valorAgregado: z.object({ titulo: textoOpcional, texto: textoOpcional }).nullable(),
  incluidos: z.array(itemRotulado),
  responsabilidades: z.array(itemRotulado),
  descricaoSubtotal: textoOpcional,
  rotuloDesconto: textoOpcional,
}) satisfies z.ZodType<ConteudoOrcamento>;

export const salvarOrcamentoSchema = z.object({
  clienteId: z.string().uuid(),
  obraId: z.string().uuid(),
  servicoId: z.string().uuid().nullable(),
  vistoriaId: z.string().uuid().nullable(),
  validadeDias: z.coerce.number().int().min(1).max(90),
  datasPrevistas: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')).default([]),
  precificacao: entradaPrecificacaoSchema,
  conteudo: conteudoSchema,
});
export type SalvarOrcamentoInput = z.input<typeof salvarOrcamentoSchema>;

interface Contexto {
  empresaId: string;
  usuarioId: string;
}

async function buscar(ctx: Contexto, id: string) {
  const orc = await db.query.orcamentos.findFirst({
    where: and(eq(schema.orcamentos.id, id), eq(schema.orcamentos.empresaId, ctx.empresaId)),
  });
  if (!orc) throw new ErroNegocio('Orçamento não encontrado');
  return orc;
}

export async function salvarOrcamento(ctx: Contexto, id: string | null, entrada: SalvarOrcamentoInput) {
  const dados = salvarOrcamentoSchema.parse(entrada);
  const precificacao: EntradaOrcamento = { ...dados.precificacao, markupMinimo: MARKUP_MINIMO_PADRAO };
  const resultado = calcularOrcamento(precificacao);

  // O cliente e a obra precisam ser da mesma empresa.
  const obra = await db.query.obras.findFirst({
    where: and(eq(schema.obras.id, dados.obraId), eq(schema.obras.empresaId, ctx.empresaId), eq(schema.obras.clienteId, dados.clienteId)),
  });
  if (!obra) throw new ErroNegocio('Obra não encontrada para este cliente');
  if (dados.servicoId) {
    const servico = await db.query.servicos.findFirst({
      where: and(eq(schema.servicos.id, dados.servicoId), eq(schema.servicos.empresaId, ctx.empresaId)),
    });
    if (!servico) throw new ErroNegocio('Serviço inválido');
  }
  if (dados.vistoriaId) {
    const vistoria = await db.query.vistorias.findFirst({
      where: and(eq(schema.vistorias.id, dados.vistoriaId), eq(schema.vistorias.empresaId, ctx.empresaId)),
    });
    if (!vistoria) throw new ErroNegocio('Vistoria inválida');
  }

  const valores = {
    clienteId: dados.clienteId,
    obraId: dados.obraId,
    servicoId: dados.servicoId,
    vistoriaId: dados.vistoriaId,
    validadeDias: dados.validadeDias,
    datasPrevistas: normalizarDatas(dados.datasPrevistas),
    precificacao,
    conteudo: dados.conteudo,
    resultado,
    valorFinal: resultado.valorFinal.toFixed(2),
    atualizadoEm: new Date(),
  };

  if (id) {
    const atual = await buscar(ctx, id);
    if (atual.status === 'aprovado') throw new ErroNegocio('Orçamento aprovado não pode ser alterado');
    const mudouValor = Number(atual.valorFinal) !== resultado.valorFinal;
    await db
      .update(schema.orcamentos)
      .set({
        ...valores,
        // Mudou o valor: a liberação de markup anterior deixa de valer.
        ...(mudouValor ? { liberadoPorId: null, justificativaLiberacao: null } : {}),
      })
      .where(eq(schema.orcamentos.id, id));
    await registrarEvento(id, ctx.usuarioId, 'editado', mudouValor ? `Valor final: R$ ${resultado.valorFinal.toFixed(2)}` : undefined);
    return id;
  }

  const numero = await proximoNumero(db, ctx.empresaId, 'ORC');
  const [novo] = await db
    .insert(schema.orcamentos)
    .values({
      ...valores,
      empresaId: ctx.empresaId,
      numero,
      tokenPublico: randomBytes(18).toString('base64url'),
      criadoPorId: ctx.usuarioId,
    })
    .returning({ id: schema.orcamentos.id });
  await registrarEvento(novo.id, ctx.usuarioId, 'criado', numero);
  return novo.id;
}

export async function liberarMarkup(ctx: Contexto, id: string, justificativa: string) {
  if (!justificativa.trim()) throw new ErroNegocio('Informe a justificativa da liberação');
  await buscar(ctx, id);
  await db
    .update(schema.orcamentos)
    .set({ liberadoPorId: ctx.usuarioId, justificativaLiberacao: justificativa.trim() })
    .where(eq(schema.orcamentos.id, id));
  await registrarEvento(id, ctx.usuarioId, 'liberacao_markup', justificativa.trim());
}

/** Marca como enviado. Bloqueia markup abaixo do mínimo sem liberação da gestão. */
export async function enviarOrcamento(ctx: Contexto, id: string) {
  const orc = await buscar(ctx, id);
  if (orc.status === 'aprovado') throw new ErroNegocio('Orçamento já aprovado');
  if (orc.resultado.abaixoDoMinimo && !orc.liberadoPorId) {
    throw new ErroNegocio('Markup abaixo do mínimo de 30%: precisa de liberação da Gestão antes do envio');
  }
  await db
    .update(schema.orcamentos)
    .set({ status: 'enviado', enviadoEm: new Date(), recusadoEm: null, motivoRecusa: null })
    .where(eq(schema.orcamentos.id, id));
  await registrarEvento(id, ctx.usuarioId, 'enviado', orc.status === 'enviado' ? 'Reenviado (validade renovada)' : undefined);
}

export async function registrarFollowUp(ctx: Contexto, id: string, nota: string) {
  await buscar(ctx, id);
  await registrarEvento(id, ctx.usuarioId, 'follow_up', nota.trim() || undefined);
}

export async function recusarOrcamento(ctx: Contexto, id: string, motivo: string) {
  const orc = await buscar(ctx, id);
  if (orc.status === 'aprovado') throw new ErroNegocio('Orçamento já aprovado');
  await db
    .update(schema.orcamentos)
    .set({ status: 'recusado', recusadoEm: new Date(), motivoRecusa: motivo.trim() || null })
    .where(eq(schema.orcamentos.id, id));
  await registrarEvento(id, ctx.usuarioId, 'recusado', motivo.trim() || undefined);
}

/** Aprovação feita pelo próprio cliente no link público. */
export async function aprovarPeloCliente(token: string, ip: string | null) {
  const orc = await db.query.orcamentos.findFirst({ where: eq(schema.orcamentos.tokenPublico, token) });
  if (!orc) throw new ErroNegocio('Orçamento não encontrado');
  if (orc.status === 'aprovado') return orc.id;
  if (orc.status !== 'enviado') throw new ErroNegocio('Este orçamento não está disponível para aprovação');
  if (situacaoNoFunil(orc).tipo === 'expirado') {
    throw new ErroNegocio('A validade deste orçamento expirou. Fale com a nossa equipe para renovar.');
  }
  await db.update(schema.orcamentos).set({ status: 'aprovado', aprovadoEm: new Date(), aprovadoIp: ip }).where(eq(schema.orcamentos.id, orc.id));
  await registrarEvento(orc.id, null, 'aprovado', 'Aprovado pelo cliente no link');
  await criarPreReservas(orc.empresaId, orc.id);
  return orc.id;
}

/** Aprovação registrada pela equipe (cliente aprovou por WhatsApp, telefone…). */
export async function aprovarManualmente(ctx: Contexto, id: string) {
  const orc = await buscar(ctx, id);
  if (orc.status === 'aprovado') throw new ErroNegocio('Orçamento já aprovado');
  if (orc.status !== 'enviado') throw new ErroNegocio('Só um orçamento enviado pode ser aprovado');
  await db.update(schema.orcamentos).set({ status: 'aprovado', aprovadoEm: new Date() }).where(eq(schema.orcamentos.id, id));
  await registrarEvento(id, ctx.usuarioId, 'aprovado', 'Aprovação registrada pela equipe');
  await criarPreReservas(ctx.empresaId, id);
}

/** Data do último follow-up de cada orçamento (para os lembretes do funil). */
export async function ultimosFollowUps(orcamentoIds: string[]) {
  const mapa = new Map<string, Date>();
  if (!orcamentoIds.length) return mapa;
  const eventos = await db
    .select({ orcamentoId: schema.orcamentoEventos.orcamentoId, criadoEm: schema.orcamentoEventos.criadoEm })
    .from(schema.orcamentoEventos)
    .where(eq(schema.orcamentoEventos.tipo, 'follow_up'))
    .orderBy(desc(schema.orcamentoEventos.criadoEm));
  for (const e of eventos) if (orcamentoIds.includes(e.orcamentoId) && !mapa.has(e.orcamentoId)) mapa.set(e.orcamentoId, e.criadoEm);
  return mapa;
}
