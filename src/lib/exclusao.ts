/**
 * Exclusões (corrigir lançamentos e cadastros feitos por engano).
 * Cada função confere a empresa, apaga primeiro o que depende do registro e desfaz os efeitos
 * (ex.: excluir o pagamento do sinal volta a cobrança para "em aberto" e a agenda para pré-reserva).
 * Cadastros com histórico (cliente, obra, profissional) só saem depois dos orçamentos/contratos ligados a eles.
 */
import 'server-only';
import { and, eq, inArray, or } from 'drizzle-orm';
import { db, schema } from '@/db';
import { apagarArquivo } from './arquivos';
import { ErroNegocio } from './erros';
import { registrarEvento, sincronizarAlocacoes } from './operacao';

interface Contexto {
  empresaId: string;
  usuarioId: string;
}

const { pagamentos, cobrancas } = schema;

async function apagarPagamentos(ids: string[]) {
  if (!ids.length) return;
  const lista = await db.query.pagamentos.findMany({ where: inArray(pagamentos.id, ids) });
  await db.delete(pagamentos).where(inArray(pagamentos.id, ids));
  for (const p of lista) if (p.comprovante) await apagarArquivo(p.comprovante);
}

/** Pagamento lançado errado: some o pagamento (e o recibo), a cobrança volta a "em aberto". */
export async function excluirPagamento(ctx: Contexto, id: string) {
  const pag = await db.query.pagamentos.findFirst({ where: and(eq(pagamentos.id, id), eq(pagamentos.empresaId, ctx.empresaId)) });
  if (!pag) throw new ErroNegocio('Pagamento não encontrado');
  if (pag.tipo === 'sinal' && pag.orcamentoId) {
    // O recibo de quitação soma o sinal: sem ele, ficaria "quitado" com parcela em aberto.
    const saldo = await db.query.pagamentos.findFirst({
      where: and(eq(pagamentos.orcamentoId, pag.orcamentoId), eq(pagamentos.tipo, 'saldo')),
      columns: { id: true },
    });
    if (saldo) throw new ErroNegocio('Esta obra já tem o saldo pago. Exclua primeiro o pagamento do saldo e depois o do sinal.');
  }
  await apagarPagamentos([pag.id]);
  if (pag.cobrancaId) await db.update(cobrancas).set({ status: 'aberta' }).where(eq(cobrancas.id, pag.cobrancaId));
  if (pag.orcamentoId) {
    // Sem o sinal, a agenda volta para pré-reserva.
    await sincronizarAlocacoes(ctx.empresaId, pag.orcamentoId).catch(() => undefined);
    await registrarEvento(pag.orcamentoId, ctx.usuarioId, 'pagamento_excluido', `R$ ${Number(pag.valor).toFixed(2)} · ${pag.tipo}`);
  }
}

/** Fatura gerada errada: some com a cobrança e os pagamentos dela. */
export async function excluirFatura(ctx: Contexto, id: string) {
  const fatura = await db.query.faturas.findFirst({ where: and(eq(schema.faturas.id, id), eq(schema.faturas.empresaId, ctx.empresaId)) });
  if (!fatura) throw new ErroNegocio('Fatura não encontrada');
  const cobs = await db.query.cobrancas.findMany({ where: eq(cobrancas.faturaId, id) });
  if (cobs.length) {
    const pags = await db.query.pagamentos.findMany({ where: inArray(pagamentos.cobrancaId, cobs.map((c) => c.id)) });
    await apagarPagamentos(pags.map((p) => p.id));
  }
  await db.delete(schema.faturas).where(eq(schema.faturas.id, id)); // cobranças saem em cascata
}

export async function excluirContrato(ctx: Contexto, id: string) {
  const contrato = await db.query.contratos.findFirst({ where: and(eq(schema.contratos.id, id), eq(schema.contratos.empresaId, ctx.empresaId)) });
  if (!contrato) throw new ErroNegocio('Contrato não encontrado');
  const faturas = await db.query.faturas.findMany({ where: eq(schema.faturas.contratoId, id) });
  for (const f of faturas) await excluirFatura(ctx, f.id);
  await db.delete(schema.contratos).where(eq(schema.contratos.id, id));
}

/** Orçamento inteiro: histórico, agenda, cobranças, pagamentos (com comprovantes) e despesas da obra. */
export async function excluirOrcamento(ctx: Contexto, id: string) {
  const orc = await db.query.orcamentos.findFirst({ where: and(eq(schema.orcamentos.id, id), eq(schema.orcamentos.empresaId, ctx.empresaId)) });
  if (!orc) throw new ErroNegocio('Orçamento não encontrado');
  const cobs = await db.query.cobrancas.findMany({ where: eq(cobrancas.orcamentoId, id) });
  const pags = await db.query.pagamentos.findMany({
    where: cobs.length ? or(eq(pagamentos.orcamentoId, id), inArray(pagamentos.cobrancaId, cobs.map((c) => c.id))) : eq(pagamentos.orcamentoId, id),
  });
  await apagarPagamentos(pags.map((p) => p.id));
  await db.delete(schema.orcamentos).where(eq(schema.orcamentos.id, id)); // eventos, alocações, cobranças e despesas em cascata
}

/** Vistoria e suas fotos; orçamentos feitos a partir dela continuam (só perdem o vínculo). */
export async function excluirVistoria(ctx: Contexto, id: string) {
  const vistoria = await db.query.vistorias.findFirst({ where: and(eq(schema.vistorias.id, id), eq(schema.vistorias.empresaId, ctx.empresaId)) });
  if (!vistoria) throw new ErroNegocio('Vistoria não encontrada');
  const fotos = await db.query.vistoriaFotos.findMany({ where: eq(schema.vistoriaFotos.vistoriaId, id) });
  await db.update(schema.orcamentos).set({ vistoriaId: null }).where(eq(schema.orcamentos.vistoriaId, id));
  await db.delete(schema.vistorias).where(eq(schema.vistorias.id, id)); // fotos em cascata
  for (const f of fotos) await apagarArquivo(f.arquivo);
}

async function exigirSemOrcamentosNemContratos(filtro: { obraId?: string; clienteId?: string }, quem: string) {
  const orcs = await db.query.orcamentos.findMany({
    where: filtro.obraId ? eq(schema.orcamentos.obraId, filtro.obraId) : eq(schema.orcamentos.clienteId, filtro.clienteId!),
    columns: { numero: true },
  });
  if (orcs.length) throw new ErroNegocio(`${quem} tem orçamento(s) (${orcs.map((o) => o.numero).join(', ')}). Exclua os orçamentos primeiro.`);
  const contratos = await db.query.contratos.findMany({
    where: filtro.obraId ? eq(schema.contratos.obraId, filtro.obraId) : eq(schema.contratos.clienteId, filtro.clienteId!),
    columns: { id: true },
  });
  if (contratos.length) throw new ErroNegocio(`${quem} tem contrato recorrente. Exclua o contrato primeiro (em Contratos).`);
}

/** Obra sem orçamentos nem contratos; leva junto as vistorias dela. */
export async function excluirObra(ctx: Contexto, id: string) {
  const obra = await db.query.obras.findFirst({ where: and(eq(schema.obras.id, id), eq(schema.obras.empresaId, ctx.empresaId)) });
  if (!obra) throw new ErroNegocio('Obra não encontrada');
  await exigirSemOrcamentosNemContratos({ obraId: id }, 'Esta obra');
  const vistorias = await db.query.vistorias.findMany({ where: eq(schema.vistorias.obraId, id), columns: { id: true } });
  for (const v of vistorias) await excluirVistoria(ctx, v.id);
  await db.delete(schema.obras).where(eq(schema.obras.id, id));
}

/** Cliente sem orçamentos nem contratos; leva junto as obras (e vistorias) dele. */
export async function excluirCliente(ctx: Contexto, id: string) {
  const cliente = await db.query.clientes.findFirst({ where: and(eq(schema.clientes.id, id), eq(schema.clientes.empresaId, ctx.empresaId)) });
  if (!cliente) throw new ErroNegocio('Cliente não encontrado');
  await exigirSemOrcamentosNemContratos({ clienteId: id }, 'Este cliente');
  const obras = await db.query.obras.findMany({ where: eq(schema.obras.clienteId, id), columns: { id: true } });
  for (const o of obras) await excluirObra(ctx, o.id);
  // Se era parceiro que indicou outros clientes/obras, só some a indicação.
  await db.update(schema.clientes).set({ indicadoPorId: null }).where(eq(schema.clientes.indicadoPorId, id));
  await db.update(schema.obras).set({ parceiroId: null }).where(eq(schema.obras.parceiroId, id));
  await db.delete(cobrancas).where(eq(cobrancas.clienteId, id));
  await db.delete(schema.clientes).where(eq(schema.clientes.id, id));
}

/** Profissional sem escala, vales ou acertos (com histórico, use "inativo" no cadastro). */
export async function excluirMembroEquipe(ctx: Contexto, id: string) {
  const membro = await db.query.equipe.findFirst({ where: and(eq(schema.equipe.id, id), eq(schema.equipe.empresaId, ctx.empresaId)) });
  if (!membro) throw new ErroNegocio('Profissional não encontrado');
  const [aloc, vale, acerto] = await Promise.all([
    db.query.alocacoes.findFirst({ where: eq(schema.alocacoes.membroEquipeId, id), columns: { id: true } }),
    db.query.vales.findFirst({ where: eq(schema.vales.membroEquipeId, id), columns: { id: true } }),
    db.query.acertos.findFirst({ where: eq(schema.acertos.membroEquipeId, id), columns: { id: true } }),
  ]);
  if (aloc || vale || acerto) {
    throw new ErroNegocio(`${membro.nome} já tem escala, vales ou acertos registrados. Para não perder o histórico, desmarque "Ativo" no cadastro.`);
  }
  await db.update(schema.usuarios).set({ membroEquipeId: null }).where(eq(schema.usuarios.membroEquipeId, id));
  await db.delete(schema.bloqueios).where(eq(schema.bloqueios.membroEquipeId, id));
  await db.delete(schema.equipe).where(eq(schema.equipe.id, id));
}

/** Serviço do catálogo; orçamentos e vistorias que o usavam continuam (o texto já está neles). */
export async function excluirServico(ctx: Contexto, id: string) {
  const servico = await db.query.servicos.findFirst({ where: and(eq(schema.servicos.id, id), eq(schema.servicos.empresaId, ctx.empresaId)) });
  if (!servico) throw new ErroNegocio('Serviço não encontrado');
  await db.update(schema.orcamentos).set({ servicoId: null }).where(eq(schema.orcamentos.servicoId, id));
  await db.update(schema.vistorias).set({ servicoId: null }).where(eq(schema.vistorias.servicoId, id));
  await db.delete(schema.servicos).where(eq(schema.servicos.id, id));
}

/** Desfaz um acerto fechado: os vales voltam a ficar em aberto. */
export async function excluirAcerto(ctx: Contexto, id: string) {
  const acerto = await db.query.acertos.findFirst({ where: and(eq(schema.acertos.id, id), eq(schema.acertos.empresaId, ctx.empresaId)) });
  if (!acerto) throw new ErroNegocio('Acerto não encontrado');
  await db.update(schema.vales).set({ acertoId: null }).where(eq(schema.vales.acertoId, id));
  await db.delete(schema.acertos).where(eq(schema.acertos.id, id));
}
