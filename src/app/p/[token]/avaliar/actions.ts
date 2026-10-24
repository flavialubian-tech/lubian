'use server';

import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { campo, executarAcao } from '@/lib/acao';
import { responderAvaliacao } from '@/lib/pos-venda';

/** Avaliação enviada pelo cliente (sem login: o token do link identifica o orçamento). */
export async function avaliarAcao(token: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return executarAcao(async () => {
    await responderAvaliacao(token, {
      nota: Number(f.get('nota') ?? 0),
      comentario: campo(f, 'comentario') ?? undefined,
      indicacoes: [1, 2].map((i) => ({ nome: campo(f, `indicadoNome${i}`) ?? '', telefone: campo(f, `indicadoTelefone${i}`) ?? '' })),
    });
    revalidatePath(`/p/${token}/avaliar`);
    revalidatePath(`/p/${token}`);
    return { ok: 'Avaliação enviada. Muito obrigada!' };
  });
}
