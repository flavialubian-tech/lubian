'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { db, schema } from '@/db';
import { campo, executarAcao } from '@/lib/acao';
import { exigirOperador } from '@/lib/auth';

const numero = (v: string | null) => (v ? Number(v.replace(',', '.')).toFixed(2) : null);

export async function salvarServico(id: string | null, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    const nome = campo(f, 'nome');
    if (!nome) return { erro: 'Informe o nome do serviço' };
    const valores = {
      nome,
      descricao: campo(f, 'descricao'),
      precoM2Min: numero(campo(f, 'precoM2Min')),
      precoM2Max: numero(campo(f, 'precoM2Max')),
      exigeNr35: f.get('exigeNr35') === 'on',
      ativo: id ? f.get('ativo') === 'on' : true,
    };
    if ([valores.precoM2Min, valores.precoM2Max].includes('NaN')) return { erro: 'Preço por m² inválido' };
    if (id) {
      await db.update(schema.servicos).set(valores).where(and(eq(schema.servicos.id, id), eq(schema.servicos.empresaId, sessao.empresaId)));
    } else {
      await db.insert(schema.servicos).values({ ...valores, empresaId: sessao.empresaId });
    }
    revalidatePath('/servicos');
    return { ok: id ? 'Salvo' : 'Serviço cadastrado' };
  });
}
