'use server';

import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { campo, executarAcao, numeroBR } from '@/lib/acao';
import { exigirOperador } from '@/lib/auth';
import { lancarDespesa, removerDespesa, type CategoriaDespesa } from '@/lib/financeiro';

export async function lancarDespesaAcao(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    const orcamentoId = campo(f, 'orcamentoId');
    await lancarDespesa(sessao, {
      orcamentoId,
      categoria: (campo(f, 'categoria') ?? (orcamentoId ? 'outros' : 'geral')) as CategoriaDespesa,
      descricao: campo(f, 'descricao') ?? '',
      valor: numeroBR(campo(f, 'valor')),
      data: campo(f, 'data') ?? '',
    });
    revalidatePath('/despesas');
    if (orcamentoId) revalidatePath(`/orcamentos/${orcamentoId}`);
    return { ok: 'Despesa lançada' };
  });
}

export async function removerDespesaAcao(id: string) {
  const sessao = await exigirOperador();
  await removerDespesa(sessao, id);
  revalidatePath('/despesas');
}
