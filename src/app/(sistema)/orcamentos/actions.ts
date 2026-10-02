'use server';

import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { campo, executarAcao, numeroBR } from '@/lib/acao';
import { exigirGestao, exigirOperador } from '@/lib/auth';
import { lancarDespesa, registrarSinal } from '@/lib/financeiro';
import { lerPagamento } from '@/lib/form-pagamento';
import { liberarPreReserva, marcarEntregue, reagendar } from '@/lib/operacao';
import {
  aprovarManualmente,
  enviarOrcamento,
  liberarMarkup,
  recusarOrcamento,
  registrarFollowUp,
  salvarOrcamento,
  type SalvarOrcamentoInput,
} from '@/lib/orcamentos';

const ctx = (s: { empresaId: string; usuarioId: string }) => ({ empresaId: s.empresaId, usuarioId: s.usuarioId });

export async function salvarOrcamentoAcao(id: string | null, entrada: SalvarOrcamentoInput): Promise<EstadoForm & { id?: string }> {
  const sessao = await exigirOperador();
  let novoId: string | undefined;
  const estado = await executarAcao(async () => {
    novoId = await salvarOrcamento(ctx(sessao), id, entrada);
    revalidatePath('/orcamentos');
    if (id) revalidatePath(`/orcamentos/${id}`);
  });
  return estado?.erro ? estado : { ok: 'Orçamento salvo', id: novoId };
}

export async function enviarAcao(id: string): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await enviarOrcamento(ctx(sessao), id);
    revalidatePath(`/orcamentos/${id}`);
    return { ok: 'Orçamento marcado como enviado' };
  });
}

export async function followUpAcao(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await registrarFollowUp(ctx(sessao), id, campo(f, 'nota') ?? '');
    revalidatePath(`/orcamentos/${id}`);
    return { ok: 'Follow-up registrado' };
  });
}

export async function recusarAcao(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await recusarOrcamento(ctx(sessao), id, campo(f, 'motivo') ?? '');
    revalidatePath(`/orcamentos/${id}`);
    return { ok: 'Orçamento marcado como recusado' };
  });
}

export async function liberarAcao(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirGestao();
  return executarAcao(async () => {
    await liberarMarkup(ctx(sessao), id, campo(f, 'justificativa') ?? '');
    revalidatePath(`/orcamentos/${id}`);
    return { ok: 'Envio liberado pela Gestão' };
  });
}

export async function aprovarManualAcao(id: string): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await aprovarManualmente(ctx(sessao), id);
    revalidatePath(`/orcamentos/${id}`);
    revalidatePath('/agenda');
    return { ok: 'Aprovação registrada: agenda em pré-reserva' };
  });
}

export async function registrarSinalAcao(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    // Sem revalidatePath: o formulário baixa o recibo e depois atualiza a tela (router.refresh).
    const pagamentoId = await registrarSinal(ctx(sessao), id, await lerPagamento(sessao.empresaId, f));
    return { ok: 'Sinal registrado: agenda confirmada.', link: { href: `/api/recibos/${pagamentoId}?baixar=1`, rotulo: 'Baixar recibo do sinal (PDF)', baixar: true } };
  });
}

export async function reagendarAcao(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await reagendar(ctx(sessao), id, f.getAll('datas').map(String));
    revalidatePath(`/orcamentos/${id}`);
    revalidatePath('/agenda');
    return { ok: 'Datas atualizadas na agenda' };
  });
}

export async function liberarPreReservaAcao(id: string): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await liberarPreReserva(ctx(sessao), id);
    revalidatePath(`/orcamentos/${id}`);
    revalidatePath('/agenda');
    return { ok: 'Pré-reserva liberada' };
  });
}

export async function entregueAcao(id: string): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await marcarEntregue(ctx(sessao), id);
    revalidatePath(`/orcamentos/${id}`);
    revalidatePath('/agenda');
    return { ok: 'Serviço marcado como entregue' };
  });
}

export async function lancarDespesaObraAcao(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await lancarDespesa(ctx(sessao), {
      orcamentoId: id,
      categoria: (campo(f, 'categoria') ?? 'outros') as 'outros',
      descricao: campo(f, 'descricao') ?? '',
      valor: numeroBR(campo(f, 'valor')),
      data: campo(f, 'data') ?? '',
    });
    revalidatePath(`/orcamentos/${id}`);
    revalidatePath('/despesas');
    return { ok: 'Despesa lançada' };
  });
}
