'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { EstadoForm } from '@/components/formulario';
import { campo, executarAcao, numeroBR } from '@/lib/acao';
import { fecharAcerto, lancarVale, marcarAcertoPago, removerVale } from '@/lib/acertos';
import { hojeSP } from '@/lib/agenda';
import { exigirOperador } from '@/lib/auth';

export async function lancarValeAcao(membroEquipeId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await lancarVale(sessao, { membroEquipeId, valor: numeroBR(campo(f, 'valor')), data: campo(f, 'data') ?? '', descricao: campo(f, 'descricao') });
    revalidatePath('/equipe/acerto');
    return { ok: 'Vale lançado' };
  });
}

export async function removerValeAcao(id: string) {
  const sessao = await exigirOperador();
  await removerVale(sessao, id);
  revalidatePath('/equipe/acerto');
}

export async function fecharAcertoAcao(membroEquipeId: string, de: string, ate: string): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  let id = '';
  const estado = await executarAcao(async () => {
    id = await fecharAcerto(sessao, membroEquipeId, de, ate);
    revalidatePath('/equipe/acerto');
  });
  if (id) redirect(`/equipe/acerto/${id}`);
  return estado;
}

export async function marcarAcertoPagoAcao(id: string) {
  const sessao = await exigirOperador();
  await marcarAcertoPago(sessao, id, hojeSP());
  revalidatePath('/equipe/acerto');
  revalidatePath(`/equipe/acerto/${id}`);
}
