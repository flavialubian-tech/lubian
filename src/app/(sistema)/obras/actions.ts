'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { EstadoForm } from '@/components/formulario';
import { db, schema } from '@/db';
import { campo, executarAcao } from '@/lib/acao';
import { exigirOperador } from '@/lib/auth';

export async function salvarObra(id: string | null, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  let destino = '';
  const estado = await executarAcao(async () => {
    const nome = campo(f, 'nome');
    const clienteId = campo(f, 'clienteId');
    if (!nome) return { erro: 'Informe a identificação da obra' };
    if (!clienteId) return { erro: 'Escolha o cliente' };
    const doEmpresa = async (cid: string | null) =>
      !cid || !!(await db.query.clientes.findFirst({ where: and(eq(schema.clientes.id, cid), eq(schema.clientes.empresaId, sessao.empresaId)) }));
    const parceiroId = campo(f, 'parceiroId');
    if (!(await doEmpresa(clienteId)) || !(await doEmpresa(parceiroId))) return { erro: 'Cliente inválido' };

    const area = campo(f, 'areaM2');
    const valores = {
      nome,
      clienteId,
      parceiroId,
      endereco: campo(f, 'endereco'),
      tipoImovel: campo(f, 'tipoImovel'),
      areaM2: area ? String(Number(area.replace(',', '.'))) : null,
      contatoLocal: campo(f, 'contatoLocal'),
      observacoes: campo(f, 'observacoes'),
    };
    if (valores.areaM2 === 'NaN') return { erro: 'Área inválida' };
    if (id) {
      const r = await db
        .update(schema.obras)
        .set(valores)
        .where(and(eq(schema.obras.id, id), eq(schema.obras.empresaId, sessao.empresaId)))
        .returning({ id: schema.obras.id });
      if (!r.length) return { erro: 'Obra não encontrada' };
      revalidatePath(`/obras/${id}`);
      return { ok: 'Obra salva' };
    }
    const [nova] = await db.insert(schema.obras).values({ ...valores, empresaId: sessao.empresaId }).returning({ id: schema.obras.id });
    destino = `/obras/${nova.id}`;
  });
  if (destino) redirect(destino);
  return estado;
}
