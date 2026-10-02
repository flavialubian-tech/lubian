'use server';

import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { campo, executarAcao } from '@/lib/acao';
import { exigirGestao, exigirOperador } from '@/lib/auth';
import { salvarArquivo } from '@/lib/arquivos';
import { liberarPreReserva, marcarEntregue, reagendar, registrarSinal } from '@/lib/operacao';
import {
  aprovarManualmente,
  enviarOrcamento,
  liberarMarkup,
  recusarOrcamento,
  registrarFollowUp,
  salvarOrcamento,
  type SalvarOrcamentoInput,
} from '@/lib/orcamentos';

/** "1.234,56", "1234,56" ou "1234.56" → 1234.56 */
const numeroBR = (v: string | null) => (v?.includes(',') ? v.replace(/\./g, '').replace(',', '.') : (v ?? ''));

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
    const arquivo = f.get('comprovante');
    const comprovante = arquivo instanceof File && arquivo.size > 0 ? await salvarArquivo(sessao.empresaId, arquivo, { aceitaPdf: true }) : null;
    await registrarSinal(ctx(sessao), id, {
      valor: numeroBR(campo(f, 'valor')),
      forma: (campo(f, 'forma') ?? 'pix') as 'pix',
      pagoEm: campo(f, 'pagoEm') ?? '',
      comprovante,
    });
    revalidatePath(`/orcamentos/${id}`);
    revalidatePath('/agenda');
    return { ok: 'Sinal registrado: agenda confirmada' };
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
