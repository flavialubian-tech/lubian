'use server';

import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { executarAcao } from '@/lib/acao';
import { exigirSessao } from '@/lib/auth';
import { marcarPresenca } from '@/lib/operacao';

export async function marcarPresencaAcao(alocacaoId: string, presenca: 'presente' | 'falta' | null): Promise<EstadoForm> {
  const sessao = await exigirSessao();
  return executarAcao(async () => {
    await marcarPresenca(sessao, alocacaoId, presenca);
    revalidatePath('/minha-semana');
    revalidatePath('/agenda');
  });
}
