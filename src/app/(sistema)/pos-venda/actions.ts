'use server';

import { revalidatePath } from 'next/cache';
import { exigirOperador } from '@/lib/auth';
import { marcarAvaliacaoTratada, marcarIndicacaoContatada } from '@/lib/pos-venda';

export async function indicacaoContatadaAcao(id: string) {
  const sessao = await exigirOperador();
  await marcarIndicacaoContatada(sessao.empresaId, id);
  revalidatePath('/', 'layout');
}

export async function avaliacaoTratadaAcao(id: string) {
  const sessao = await exigirOperador();
  await marcarAvaliacaoTratada(sessao.empresaId, id);
  revalidatePath('/', 'layout');
}
