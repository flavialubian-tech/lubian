'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { executarAcao } from '@/lib/acao';
import { aprovarPeloCliente } from '@/lib/orcamentos';

export async function aprovarAcao(token: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  return executarAcao(async () => {
    if (f.get('concordo') !== 'on') return { erro: 'Marque a confirmação para aprovar' };
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip');
    await aprovarPeloCliente(token, ip);
    revalidatePath(`/p/${token}`);
  });
}
