'use server';

import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { campo, executarAcao } from '@/lib/acao';
import { exigirGestao, exigirOperador } from '@/lib/auth';
import {
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
