'use server';

import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { campo, executarAcao } from '@/lib/acao';
import { exigirOperador } from '@/lib/auth';
import { criarBloqueio, removerBloqueio } from '@/lib/operacao';

export async function criarBloqueioAcao(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    const dataInicio = campo(f, 'dataInicio') ?? '';
    await criarBloqueio(sessao, {
      membroEquipeId: campo(f, 'membroEquipeId'),
      dataInicio,
      dataFim: campo(f, 'dataFim') ?? dataInicio,
      motivo: campo(f, 'motivo') ?? '',
    });
    revalidatePath('/agenda');
    return { ok: 'Bloqueio criado' };
  });
}

export async function removerBloqueioAcao(id: string) {
  const sessao = await exigirOperador();
  await removerBloqueio(sessao, id);
  revalidatePath('/agenda');
}
