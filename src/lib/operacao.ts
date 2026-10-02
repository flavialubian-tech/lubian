/**
 * Agenda e operação (Fase 2): pré-reservas, sinal, entrega, bloqueios e presença.
 * Toda função recebe a empresa da sessão e filtra por ela.
 */
import { and, asc, eq, gte, inArray, isNull, lte, ne, notExists, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { ehData, gerarAlocacoes, hojeSP, mapearForcaTarefa, normalizarDatas, statusAlocacao } from './agenda';
import { ErroNegocio } from './erros';

interface Contexto {
  empresaId: string;
  usuarioId: string;
}

export async function registrarEvento(orcamentoId: string, usuarioId: string | null, tipo: string, descricao?: string) {
  await db.insert(schema.orcamentoEventos).values({ orcamentoId, usuarioId, tipo, descricao });
}

async function buscarAprovado(empresaId: string, id: string) {
  const orc = await db.query.orcamentos.findFirst({
    where: and(eq(schema.orcamentos.id, id), eq(schema.orcamentos.empresaId, empresaId)),
  });
  if (!orc) throw new ErroNegocio('Orçamento não encontrado');
  if (orc.status !== 'aprovado') throw new ErroNegocio('O orçamento precisa estar aprovado');
  return orc;
}

export async function sinalDoOrcamento(orcamentoId: string) {
  return db.query.pagamentos.findFirst({
    where: and(eq(schema.pagamentos.orcamentoId, orcamentoId), eq(schema.pagamentos.tipo, 'sinal')),
  });
}

/**
 * Deixa as alocações do serviço iguais a força-tarefa × datas previstas, com o status certo
 * (pré-reserva, confirmada ou concluída). Mantém a presença já marcada nos dias que continuam.
 */
async function sincronizarAlocacoes(empresaId: string, orcamentoId: string) {
  const orc = await buscarAprovado(empresaId, orcamentoId);
  const membros = await db.query.equipe.findMany({ where: and(eq(schema.equipe.empresaId, empresaId), eq(schema.equipe.ativo, true)) });
  const { encontrados, naoEncontrados } = mapearForcaTarefa(
    orc.precificacao.equipe.map((m) => m.nome),
    membros,
  );
  const desejadas = gerarAlocacoes(
    encontrados.map((m) => ({ membroEquipeId: m.id })),
    orc.datasPrevistas,
  );
  const status = statusAlocacao({ sinalPago: !!(await sinalDoOrcamento(orcamentoId)), entregue: !!orc.entregueEm });

  const atuais = await db.query.alocacoes.findMany({ where: eq(schema.alocacoes.orcamentoId, orcamentoId) });
  const chave = (a: { membroEquipeId: string; data: string }) => `${a.membroEquipeId}|${a.data}`;
  const querer = new Set(desejadas.map(chave));
  const sobrando = atuais.filter((a) => !querer.has(chave(a))).map((a) => a.id);
  if (sobrando.length) await db.delete(schema.alocacoes).where(inArray(schema.alocacoes.id, sobrando));
  await db
    .update(schema.alocacoes)
    .set({ status, obraId: orc.obraId })
    .where(eq(schema.alocacoes.orcamentoId, orcamentoId));
  const existentes = new Set(atuais.map(chave));
  const faltando = desejadas.filter((a) => !existentes.has(chave(a)));
  if (faltando.length) {
    await db.insert(schema.alocacoes).values(faltando.map((a) => ({ ...a, empresaId, orcamentoId, obraId: orc.obraId, status })));
  }
  return { naoEncontrados };
}

/** Na aprovação (cliente ou manual): força-tarefa × datas previstas em pré-reserva. */
export async function criarPreReservas(empresaId: string, orcamentoId: string) {
  const { naoEncontrados } = await sincronizarAlocacoes(empresaId, orcamentoId);
  if (naoEncontrados.length) {
    await registrarEvento(orcamentoId, null, 'agenda', `Sem cadastro na equipe (não escalados): ${naoEncontrados.join(', ')}`);
  }
}

/** Troca as datas de um serviço já aprovado (refaz a escala). */
export async function reagendar(ctx: Contexto, id: string, datas: string[]) {
  const orc = await buscarAprovado(ctx.empresaId, id);
  if (orc.entregueEm) throw new ErroNegocio('Serviço já entregue');
  const novas = normalizarDatas(datas);
  if (!novas.length) throw new ErroNegocio('Informe ao menos uma data');
  await db.update(schema.orcamentos).set({ datasPrevistas: novas, atualizadoEm: new Date() }).where(eq(schema.orcamentos.id, id));
  await sincronizarAlocacoes(ctx.empresaId, id);
  await registrarEvento(id, ctx.usuarioId, 'agenda', `Datas: ${novas.map((d) => d.split('-').reverse().join('/')).join(', ')}`);
}

/** Libera a pré-reserva (sem sinal) para a equipe poder ir a outra obra. */
export async function liberarPreReserva(ctx: Contexto, id: string) {
  await buscarAprovado(ctx.empresaId, id);
  if (await sinalDoOrcamento(id)) throw new ErroNegocio('Sinal já pago: a agenda está confirmada');
  await db.update(schema.alocacoes).set({ status: 'cancelada' }).where(eq(schema.alocacoes.orcamentoId, id));
  await registrarEvento(id, ctx.usuarioId, 'agenda', 'Pré-reserva liberada (sem sinal)');
}

export const FORMAS_PAGAMENTO = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', transferencia: 'Transferência' } as const;

export const registrarSinalSchema = z.object({
  valor: z.coerce.number().positive('Informe o valor'),
  forma: z.enum(['pix', 'dinheiro', 'cartao', 'transferencia']),
  pagoEm: z.string().refine(ehData, 'Data inválida'),
  comprovante: z.string().nullable().default(null),
});

/** Sinal de 50% pago: grava o pagamento e confirma a agenda (D3). */
export async function registrarSinal(ctx: Contexto, id: string, entrada: z.input<typeof registrarSinalSchema>) {
  const dados = registrarSinalSchema.parse(entrada);
  await buscarAprovado(ctx.empresaId, id);
  if (await sinalDoOrcamento(id)) throw new ErroNegocio('O sinal deste orçamento já foi registrado');
  await db.insert(schema.pagamentos).values({
    empresaId: ctx.empresaId,
    orcamentoId: id,
    tipo: 'sinal',
    valor: dados.valor.toFixed(2),
    forma: dados.forma,
    pagoEm: dados.pagoEm,
    comprovante: dados.comprovante,
    registradoPorId: ctx.usuarioId,
  });
  await sincronizarAlocacoes(ctx.empresaId, id);
  await registrarEvento(id, ctx.usuarioId, 'sinal_pago', `R$ ${dados.valor.toFixed(2)} · ${FORMAS_PAGAMENTO[dados.forma]}`);
}

/** "Serviço entregue": alocações concluídas (libera a quitação). */
export async function marcarEntregue(ctx: Contexto, id: string) {
  const orc = await buscarAprovado(ctx.empresaId, id);
  if (orc.entregueEm) return;
  await db.update(schema.orcamentos).set({ entregueEm: new Date() }).where(eq(schema.orcamentos.id, id));
  await db
    .update(schema.alocacoes)
    .set({ status: 'concluida' })
    .where(and(eq(schema.alocacoes.orcamentoId, id), ne(schema.alocacoes.status, 'cancelada')));
  await registrarEvento(id, ctx.usuarioId, 'entregue');
}

export const bloqueioSchema = z
  .object({
    membroEquipeId: z.string().uuid().nullable(),
    dataInicio: z.string().refine(ehData, 'Data inicial inválida'),
    dataFim: z.string().refine(ehData, 'Data final inválida'),
    motivo: z.string().trim().min(1, 'Informe o motivo'),
  })
  .refine((b) => b.dataInicio <= b.dataFim, 'A data final é antes da inicial');

export async function criarBloqueio(ctx: Contexto, entrada: z.input<typeof bloqueioSchema>) {
  const b = bloqueioSchema.parse(entrada);
  if (b.membroEquipeId) {
    const m = await db.query.equipe.findFirst({ where: and(eq(schema.equipe.id, b.membroEquipeId), eq(schema.equipe.empresaId, ctx.empresaId)) });
    if (!m) throw new ErroNegocio('Profissional inválido');
  }
  await db.insert(schema.bloqueios).values({ ...b, empresaId: ctx.empresaId });
}

export async function removerBloqueio(ctx: Contexto, id: string) {
  await db.delete(schema.bloqueios).where(and(eq(schema.bloqueios.id, id), eq(schema.bloqueios.empresaId, ctx.empresaId)));
}

/**
 * Presença/falta no dia. O líder marca a equipe dos serviços em que está escalado no mesmo dia;
 * Gestão e Administrativo podem marcar qualquer uma.
 */
export async function marcarPresenca(
  sessao: { empresaId: string; perfil: string; membroEquipeId: string | null },
  alocacaoId: string,
  presenca: 'presente' | 'falta' | null,
) {
  const a = await db.query.alocacoes.findFirst({
    where: and(eq(schema.alocacoes.id, alocacaoId), eq(schema.alocacoes.empresaId, sessao.empresaId)),
  });
  if (!a || a.status === 'cancelada') throw new ErroNegocio('Escala não encontrada');
  if (a.data > hojeSP()) throw new ErroNegocio('A presença só pode ser marcada no dia');
  if (sessao.perfil === 'lider') {
    if (!sessao.membroEquipeId) throw new ErroNegocio('Usuário sem vínculo com a equipe');
    const minha = await db.query.alocacoes.findFirst({
      where: and(
        eq(schema.alocacoes.orcamentoId, a.orcamentoId),
        eq(schema.alocacoes.data, a.data),
        eq(schema.alocacoes.membroEquipeId, sessao.membroEquipeId),
        ne(schema.alocacoes.status, 'cancelada'),
      ),
    });
    if (!minha) throw new ErroNegocio('Você não está escalado neste serviço neste dia');
  } else if (sessao.perfil !== 'gestao' && sessao.perfil !== 'administrativo') {
    throw new ErroNegocio('Só o líder marca a presença');
  }
  await db.update(schema.alocacoes).set({ presenca }).where(eq(schema.alocacoes.id, alocacaoId));
}

// ───────────────────────────── Consultas ─────────────────────────────

export interface AlocacaoAgenda {
  id: string;
  orcamentoId: string;
  obraId: string;
  membroEquipeId: string;
  data: string;
  status: 'pre_reserva' | 'confirmada' | 'concluida' | 'cancelada';
  presenca: 'presente' | 'falta' | null;
  membroNome: string;
  membroCor: string;
  obraNome: string;
  obraEndereco: string | null;
  clienteNome: string;
  numero: string;
}

/** Alocações ativas (não canceladas) entre duas datas, opcionalmente de um profissional. */
export async function listarAlocacoes(empresaId: string, de: string, ate: string, filtro?: { membroEquipeId?: string; orcamentoId?: string }) {
  return db
    .select({
      id: schema.alocacoes.id,
      orcamentoId: schema.alocacoes.orcamentoId,
      obraId: schema.alocacoes.obraId,
      membroEquipeId: schema.alocacoes.membroEquipeId,
      data: schema.alocacoes.data,
      status: schema.alocacoes.status,
      presenca: schema.alocacoes.presenca,
      membroNome: schema.equipe.nome,
      membroCor: schema.equipe.cor,
      obraNome: schema.obras.nome,
      obraEndereco: schema.obras.endereco,
      clienteNome: schema.clientes.nome,
      numero: schema.orcamentos.numero,
    })
    .from(schema.alocacoes)
    .innerJoin(schema.equipe, eq(schema.equipe.id, schema.alocacoes.membroEquipeId))
    .innerJoin(schema.obras, eq(schema.obras.id, schema.alocacoes.obraId))
    .innerJoin(schema.orcamentos, eq(schema.orcamentos.id, schema.alocacoes.orcamentoId))
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.orcamentos.clienteId))
    .where(
      and(
        eq(schema.alocacoes.empresaId, empresaId),
        gte(schema.alocacoes.data, de),
        lte(schema.alocacoes.data, ate),
        ne(schema.alocacoes.status, 'cancelada'),
        filtro?.membroEquipeId ? eq(schema.alocacoes.membroEquipeId, filtro.membroEquipeId) : undefined,
        filtro?.orcamentoId ? eq(schema.alocacoes.orcamentoId, filtro.orcamentoId) : undefined,
      ),
    )
    .orderBy(asc(schema.alocacoes.data), asc(schema.obras.nome), asc(schema.equipe.nome)) as Promise<AlocacaoAgenda[]>;
}

/** Bloqueios que tocam o período (de um profissional inclui os da empresa toda). */
export async function listarBloqueios(empresaId: string, de: string, ate: string, membroEquipeId?: string) {
  return db
    .select({
      id: schema.bloqueios.id,
      membroEquipeId: schema.bloqueios.membroEquipeId,
      dataInicio: schema.bloqueios.dataInicio,
      dataFim: schema.bloqueios.dataFim,
      motivo: schema.bloqueios.motivo,
      membroNome: schema.equipe.nome,
    })
    .from(schema.bloqueios)
    .leftJoin(schema.equipe, eq(schema.equipe.id, schema.bloqueios.membroEquipeId))
    .where(
      and(
        eq(schema.bloqueios.empresaId, empresaId),
        lte(schema.bloqueios.dataInicio, ate),
        gte(schema.bloqueios.dataFim, de),
        membroEquipeId ? or(isNull(schema.bloqueios.membroEquipeId), eq(schema.bloqueios.membroEquipeId, membroEquipeId)) : undefined,
      ),
    )
    .orderBy(asc(schema.bloqueios.dataInicio));
}

/** Orçamentos aprovados (pré-reserva) ainda sem sinal registrado. */
export async function listarSinaisPendentes(empresaId: string) {
  const linhas = await db
    .select({
      id: schema.orcamentos.id,
      numero: schema.orcamentos.numero,
      clienteNome: schema.clientes.nome,
      clienteTelefone: schema.clientes.telefone,
      obraNome: schema.obras.nome,
      aprovadoEm: schema.orcamentos.aprovadoEm,
      datasPrevistas: schema.orcamentos.datasPrevistas,
      resultado: schema.orcamentos.resultado,
    })
    .from(schema.orcamentos)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.orcamentos.clienteId))
    .innerJoin(schema.obras, eq(schema.obras.id, schema.orcamentos.obraId))
    .where(
      and(
        eq(schema.orcamentos.empresaId, empresaId),
        eq(schema.orcamentos.status, 'aprovado'),
        isNull(schema.orcamentos.entregueEm),
        notExists(
          db
            .select({ id: schema.pagamentos.id })
            .from(schema.pagamentos)
            .where(and(eq(schema.pagamentos.orcamentoId, schema.orcamentos.id), eq(schema.pagamentos.tipo, 'sinal'))),
        ),
      ),
    )
    .orderBy(asc(schema.orcamentos.aprovadoEm));
  return linhas.map(({ resultado, ...l }) => ({ ...l, sinal: resultado.sinal }));
}
