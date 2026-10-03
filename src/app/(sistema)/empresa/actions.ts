'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { db, schema } from '@/db';
import { campo, executarAcao } from '@/lib/acao';
import { exigirGestao } from '@/lib/auth';
import { erroChavePix } from '@/lib/pix';

/** Dados da empresa usados nos documentos e no Pix (só a Gestão altera). */
export async function salvarEmpresa(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirGestao();
  return executarAcao(async () => {
    const nome = campo(f, 'nome');
    const chavePix = campo(f, 'chavePix');
    if (!nome) return { erro: 'Informe o nome da empresa' };
    const erroPix = chavePix ? erroChavePix(chavePix) : null;
    if (erroPix) return { erro: `Chave Pix: ${erroPix}` };
    await db
      .update(schema.empresas)
      .set({
        nome,
        cnpj: campo(f, 'cnpj'),
        telefone: campo(f, 'telefone'),
        endereco: campo(f, 'endereco'),
        cidade: campo(f, 'cidade'),
        chavePix,
      })
      .where(eq(schema.empresas.id, sessao.empresaId));
    revalidatePath('/', 'layout');
    return { ok: 'Dados salvos. O Pix das mensagens, do link do cliente e das faturas já usa a nova chave.' };
  });
}
