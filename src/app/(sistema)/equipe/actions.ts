'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { db, schema } from '@/db';
import { campo, executarAcao } from '@/lib/acao';
import { exigirOperador } from '@/lib/auth';

export async function salvarMembro(id: string | null, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    const nome = campo(f, 'nome');
    const diaria = Number((campo(f, 'diariaPadrao') ?? '').replace(',', '.'));
    if (!nome) return { erro: 'Informe o nome' };
    if (!Number.isFinite(diaria) || diaria <= 0) return { erro: 'Informe a diária padrão' };
    const valores = {
      nome,
      funcao: f.get('funcao') === 'lider' ? ('lider' as const) : ('auxiliar' as const),
      telefone: campo(f, 'telefone'),
      cor: campo(f, 'cor') ?? '#1e3a8a',
      diariaPadrao: diaria.toFixed(2),
      nr35: f.get('nr35') === 'on',
      ativo: id ? f.get('ativo') === 'on' : true,
    };
    if (id) {
      await db.update(schema.equipe).set(valores).where(and(eq(schema.equipe.id, id), eq(schema.equipe.empresaId, sessao.empresaId)));
    } else {
      await db.insert(schema.equipe).values({ ...valores, empresaId: sessao.empresaId });
    }
    revalidatePath('/equipe');
    return { ok: id ? 'Salvo' : 'Profissional cadastrado' };
  });
}
