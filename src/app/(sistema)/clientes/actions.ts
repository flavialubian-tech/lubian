'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { EstadoForm } from '@/components/formulario';
import { db, schema } from '@/db';
import { campo, executarAcao } from '@/lib/acao';
import { exigirOperador } from '@/lib/auth';
import { TIPOS_CLIENTE } from '@/lib/rotulos';

const tipoSchema = z.enum(Object.keys(TIPOS_CLIENTE) as [keyof typeof TIPOS_CLIENTE]);

export async function salvarCliente(id: string | null, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  let destino = '';
  const estado = await executarAcao(async () => {
    const nome = campo(f, 'nome');
    if (!nome) return { erro: 'Informe o nome do cliente' };
    const indicadoPorId = campo(f, 'indicadoPorId');
    if (indicadoPorId) {
      const parceiro = await db.query.clientes.findFirst({
        where: and(eq(schema.clientes.id, indicadoPorId), eq(schema.clientes.empresaId, sessao.empresaId)),
      });
      if (!parceiro) return { erro: 'Parceiro inválido' };
    }
    const valores = {
      nome,
      tipo: tipoSchema.parse(f.get('tipo')),
      documento: campo(f, 'documento'),
      telefone: campo(f, 'telefone'),
      email: campo(f, 'email'),
      saudacao: campo(f, 'saudacao'),
      enderecoCobranca: campo(f, 'enderecoCobranca'),
      indicadoPorId: indicadoPorId && indicadoPorId !== id ? indicadoPorId : null,
      prazoPagamento: campo(f, 'prazoPagamento'),
      observacoes: campo(f, 'observacoes'),
    };
    if (id) {
      const r = await db
        .update(schema.clientes)
        .set(valores)
        .where(and(eq(schema.clientes.id, id), eq(schema.clientes.empresaId, sessao.empresaId)))
        .returning({ id: schema.clientes.id });
      if (!r.length) return { erro: 'Cliente não encontrado' };
      revalidatePath(`/clientes/${id}`);
      return { ok: 'Cliente salvo' };
    }
    const [novo] = await db
      .insert(schema.clientes)
      .values({ ...valores, empresaId: sessao.empresaId })
      .returning({ id: schema.clientes.id });
    destino = `/clientes/${novo.id}`;
  });
  if (destino) redirect(destino);
  return estado;
}
