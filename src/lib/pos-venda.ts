/** Pós-venda: pedido de avaliação, resposta do cliente pelo link, indicações e pendências do Painel. */
import 'server-only';
import { and, desc, eq, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { dataCurta } from './formato';
import { ErroNegocio } from './erros';
import { registrarEvento } from './operacao';
import { orcamentoPublico } from './orcamento-sessao';
import { limparIndicacoes, notaBaixa } from './pos-venda-regras';

const EVENTO_PEDIDO = 'avaliacao_pedida';

/** Obra entregue e com todas as cobranças pagas. */
async function quitado(orcamentoId: string) {
  const cobs = await db.query.cobrancas.findMany({ where: eq(schema.cobrancas.orcamentoId, orcamentoId), columns: { status: true } });
  const validas = cobs.filter((c) => c.status !== 'cancelada');
  return validas.length > 0 && validas.every((c) => c.status === 'paga');
}

/** Situação do pós-venda de um orçamento (cartão no orçamento e página pública). */
export async function estadoPosVenda(orcamentoId: string) {
  const [avaliacao, pedido, pago] = await Promise.all([
    db.query.avaliacoes.findFirst({ where: eq(schema.avaliacoes.orcamentoId, orcamentoId) }),
    db.query.orcamentoEventos.findFirst({
      where: and(eq(schema.orcamentoEventos.orcamentoId, orcamentoId), eq(schema.orcamentoEventos.tipo, EVENTO_PEDIDO)),
      orderBy: (e, { desc }) => [desc(e.criadoEm)],
    }),
    quitado(orcamentoId),
  ]);
  const indicados = avaliacao
    ? await db
        .select({ id: schema.indicacoes.id, nome: schema.clientes.nome, telefone: schema.clientes.telefone, clienteId: schema.clientes.id, contatadoEm: schema.indicacoes.contatadoEm })
        .from(schema.indicacoes)
        .innerJoin(schema.clientes, eq(schema.clientes.id, schema.indicacoes.clienteId))
        .where(eq(schema.indicacoes.avaliacaoId, avaliacao.id))
    : [];
  return { avaliacao, indicados, pedidoEm: pedido?.criadoEm ?? null, quitado: pago };
}

export async function registrarPedidoAvaliacao(orcamentoId: string, usuarioId: string) {
  await registrarEvento(orcamentoId, usuarioId, EVENTO_PEDIDO, 'Pedido de avaliação enviado pelo WhatsApp');
}

const respostaSchema = z.object({
  nota: z.coerce.number().int().min(1, 'Escolha de 1 a 5 estrelas').max(5, 'Escolha de 1 a 5 estrelas'),
  comentario: z.string().trim().max(2000).optional().transform((v) => v || null),
  indicacoes: z.array(z.object({ nome: z.string().optional(), telefone: z.string().optional() })).default([]),
});

/** Resposta do cliente pela página pública /p/[token]/avaliar. */
export async function responderAvaliacao(token: string, entrada: z.input<typeof respostaSchema>) {
  const orc = await orcamentoPublico(token);
  if (!orc || orc.status !== 'aprovado' || !orc.entregueEm) throw new ErroNegocio('Avaliação disponível depois da entrega do serviço');
  if (await db.query.avaliacoes.findFirst({ where: eq(schema.avaliacoes.orcamentoId, orc.id), columns: { id: true } })) {
    throw new ErroNegocio('Esta avaliação já foi enviada. Obrigada!');
  }
  const dados = respostaSchema.parse(entrada);
  const { validas, erro } = limparIndicacoes(dados.indicacoes);
  if (erro) throw new ErroNegocio(erro);
  const cliente = await db.query.clientes.findFirst({ where: eq(schema.clientes.id, orc.clienteId) });
  if (!cliente) throw new ErroNegocio('Cliente não encontrado');

  const [avaliacao] = await db
    .insert(schema.avaliacoes)
    .values({ empresaId: orc.empresaId, orcamentoId: orc.id, clienteId: cliente.id, nota: dados.nota, comentario: dados.comentario })
    .returning();
  for (const ind of validas) {
    const [novo] = await db
      .insert(schema.clientes)
      .values({
        empresaId: orc.empresaId,
        tipo: 'pessoa_fisica',
        nome: ind.nome,
        telefone: ind.telefone,
        indicadoPorId: cliente.id,
        observacoes: `Indicado(a) por ${cliente.nome} na avaliação do orçamento ${orc.numero} (${dataCurta(new Date())}).`,
      })
      .returning();
    await db.insert(schema.indicacoes).values({ empresaId: orc.empresaId, avaliacaoId: avaliacao.id, indicadoPorId: cliente.id, clienteId: novo.id });
  }
  const resumo = `${dados.nota} estrela(s)${validas.length ? ` · ${validas.length} indicação(ões)` : ''}`;
  await registrarEvento(orc.id, null, 'avaliacao', resumo);
  return avaliacao;
}

/** Pendências do pós-venda para o Painel. */
export async function pendenciasPosVenda(empresaId: string) {
  // Obras entregues nos últimos 90 dias, sem avaliação e sem pedido enviado; só aparecem depois de quitadas.
  const desde = new Date(Date.now() - 90 * 86_400_000);
  const entregues = await db
    .select({ id: schema.orcamentos.id, numero: schema.orcamentos.numero, entregueEm: schema.orcamentos.entregueEm, clienteNome: schema.clientes.nome, obraNome: schema.obras.nome })
    .from(schema.orcamentos)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.orcamentos.clienteId))
    .innerJoin(schema.obras, eq(schema.obras.id, schema.orcamentos.obraId))
    .where(
      and(
        eq(schema.orcamentos.empresaId, empresaId),
        eq(schema.orcamentos.status, 'aprovado'),
        isNotNull(schema.orcamentos.entregueEm),
        sql`${schema.orcamentos.entregueEm} >= ${desde.toISOString()}`,
        sql`not exists (select 1 from ${schema.avaliacoes} where ${schema.avaliacoes.orcamentoId} = ${schema.orcamentos.id})`,
        sql`not exists (select 1 from ${schema.orcamentoEventos} where ${schema.orcamentoEventos.orcamentoId} = ${schema.orcamentos.id} and ${schema.orcamentoEventos.tipo} = ${EVENTO_PEDIDO})`,
      ),
    )
    .orderBy(desc(schema.orcamentos.entregueEm));
  const pedir = [];
  for (const o of entregues) if (await quitado(o.id)) pedir.push(o);

  const baixas = await db
    .select({ id: schema.avaliacoes.id, nota: schema.avaliacoes.nota, comentario: schema.avaliacoes.comentario, orcamentoId: schema.avaliacoes.orcamentoId, clienteNome: schema.clientes.nome, telefone: schema.clientes.telefone, criadoEm: schema.avaliacoes.criadoEm })
    .from(schema.avaliacoes)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.avaliacoes.clienteId))
    .where(and(eq(schema.avaliacoes.empresaId, empresaId), isNull(schema.avaliacoes.tratadoEm), lte(schema.avaliacoes.nota, 3)));

  const indicador = sql<string>`(select ${schema.clientes.nome} from ${schema.clientes} where ${schema.clientes.id} = ${schema.indicacoes.indicadoPorId})`;
  const indicados = await db
    .select({ id: schema.indicacoes.id, clienteId: schema.clientes.id, nome: schema.clientes.nome, telefone: schema.clientes.telefone, indicadorNome: indicador, criadoEm: schema.indicacoes.criadoEm })
    .from(schema.indicacoes)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.indicacoes.clienteId))
    .where(and(eq(schema.indicacoes.empresaId, empresaId), isNull(schema.indicacoes.contatadoEm)))
    .orderBy(desc(schema.indicacoes.criadoEm));

  return { pedir, baixas: baixas.filter((b) => notaBaixa(b.nota)), indicados };
}

export async function marcarIndicacaoContatada(empresaId: string, id: string) {
  await db.update(schema.indicacoes).set({ contatadoEm: new Date() }).where(and(eq(schema.indicacoes.id, id), eq(schema.indicacoes.empresaId, empresaId)));
}

export async function marcarAvaliacaoTratada(empresaId: string, id: string) {
  await db.update(schema.avaliacoes).set({ tratadoEm: new Date() }).where(and(eq(schema.avaliacoes.id, id), eq(schema.avaliacoes.empresaId, empresaId)));
}

/** Média das notas (para o Painel). */
export async function resumoAvaliacoes(empresaId: string) {
  const [r] = await db
    .select({ total: sql<number>`count(*)::int`, media: sql<number | null>`avg(${schema.avaliacoes.nota})::float` })
    .from(schema.avaliacoes)
    .where(eq(schema.avaliacoes.empresaId, empresaId));
  return { total: r?.total ?? 0, media: r?.media ?? null };
}


/** Todas as avaliações (mais novas primeiro), com cliente, obra e quantas indicações vieram junto. */
export function listarAvaliacoes(empresaId: string, filtro?: { clienteId?: string }) {
  return db
    .select({
      id: schema.avaliacoes.id,
      nota: schema.avaliacoes.nota,
      comentario: schema.avaliacoes.comentario,
      criadoEm: schema.avaliacoes.criadoEm,
      tratadoEm: schema.avaliacoes.tratadoEm,
      orcamentoId: schema.avaliacoes.orcamentoId,
      numero: schema.orcamentos.numero,
      clienteId: schema.clientes.id,
      clienteNome: schema.clientes.nome,
      obraNome: schema.obras.nome,
      indicacoes: sql<number>`(select count(*)::int from ${schema.indicacoes} where ${schema.indicacoes.avaliacaoId} = ${schema.avaliacoes.id})`,
    })
    .from(schema.avaliacoes)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.avaliacoes.clienteId))
    .innerJoin(schema.orcamentos, eq(schema.orcamentos.id, schema.avaliacoes.orcamentoId))
    .innerJoin(schema.obras, eq(schema.obras.id, schema.orcamentos.obraId))
    .where(and(eq(schema.avaliacoes.empresaId, empresaId), filtro?.clienteId ? eq(schema.avaliacoes.clienteId, filtro.clienteId) : undefined))
    .orderBy(desc(schema.avaliacoes.criadoEm));
}

/** Todas as indicações, com quem indicou e se a pessoa indicada já pediu orçamento. */
export function listarIndicacoes(empresaId: string, filtro?: { indicadoPorId?: string; clienteId?: string }) {
  const indicador = sql<string>`(select ${schema.clientes.nome} from ${schema.clientes} where ${schema.clientes.id} = ${schema.indicacoes.indicadoPorId})`;
  return db
    .select({
      id: schema.indicacoes.id,
      criadoEm: schema.indicacoes.criadoEm,
      contatadoEm: schema.indicacoes.contatadoEm,
      clienteId: schema.clientes.id,
      nome: schema.clientes.nome,
      telefone: schema.clientes.telefone,
      indicadoPorId: schema.indicacoes.indicadoPorId,
      indicadorNome: indicador,
      orcamentos: sql<number>`(select count(*)::int from ${schema.orcamentos} where ${schema.orcamentos.clienteId} = ${schema.indicacoes.clienteId})`,
    })
    .from(schema.indicacoes)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.indicacoes.clienteId))
    .where(
      and(
        eq(schema.indicacoes.empresaId, empresaId),
        filtro?.indicadoPorId ? eq(schema.indicacoes.indicadoPorId, filtro.indicadoPorId) : undefined,
        filtro?.clienteId ? eq(schema.indicacoes.clienteId, filtro.clienteId) : undefined,
      ),
    )
    .orderBy(desc(schema.indicacoes.criadoEm));
}
