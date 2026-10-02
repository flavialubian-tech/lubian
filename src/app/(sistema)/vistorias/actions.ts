'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { EstadoForm } from '@/components/formulario';
import { db, schema } from '@/db';
import { campo, executarAcao } from '@/lib/acao';
import { apagarArquivo, salvarArquivo } from '@/lib/arquivos';
import { exigirOperador, type Sessao } from '@/lib/auth';

const medicoesSchema = z.array(z.object({ ambiente: z.string().trim(), m2: z.coerce.number().min(0) }));

/** Serviço só pode ser da própria empresa. */
async function servicoValido(sessao: Sessao, servicoId: string | null) {
  if (!servicoId) return null;
  const s = await db.query.servicos.findFirst({ where: and(eq(schema.servicos.id, servicoId), eq(schema.servicos.empresaId, sessao.empresaId)) });
  return s?.id ?? null;
}

async function vistoriaDaEmpresa(sessao: Sessao, id: string) {
  const v = await db.query.vistorias.findFirst({ where: and(eq(schema.vistorias.id, id), eq(schema.vistorias.empresaId, sessao.empresaId)) });
  if (!v) throw new Error('Vistoria não encontrada');
  return v;
}

export async function criarVistoria(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  let destino = '';
  const estado = await executarAcao(async () => {
    const obraId = campo(f, 'obraId');
    const obra = obraId && (await db.query.obras.findFirst({ where: and(eq(schema.obras.id, obraId), eq(schema.obras.empresaId, sessao.empresaId)) }));
    if (!obra) return { erro: 'Escolha a obra' };
    const data = campo(f, 'data');
    const [nova] = await db
      .insert(schema.vistorias)
      .values({
        empresaId: sessao.empresaId,
        obraId: obra.id,
        servicoId: await servicoValido(sessao, campo(f, 'servicoId')),
        data: data ? new Date(`${data}T12:00:00-03:00`) : new Date(),
        responsavelId: sessao.usuarioId,
      })
      .returning({ id: schema.vistorias.id });
    destino = `/vistorias/${nova.id}`;
  });
  if (destino) redirect(destino);
  return estado;
}

export async function salvarVistoria(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await vistoriaDaEmpresa(sessao, id);
    const medicoes = medicoesSchema.parse(JSON.parse(String(f.get('medicoes') ?? '[]'))).filter((m) => m.ambiente || m.m2);
    const data = campo(f, 'data');
    await db
      .update(schema.vistorias)
      .set({
        servicoId: await servicoValido(sessao, campo(f, 'servicoId')),
        data: data ? new Date(`${data}T12:00:00-03:00`) : undefined,
        medicoes,
        nivelSujeira: campo(f, 'nivelSujeira'),
        necessitaAndaime: f.get('necessitaAndaime') === 'on',
        observacoes: campo(f, 'observacoes'),
      })
      .where(eq(schema.vistorias.id, id));
    revalidatePath(`/vistorias/${id}`);
    return { ok: 'Vistoria salva' };
  });
}

export async function enviarFotos(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await vistoriaDaEmpresa(sessao, id);
    const arquivos = f.getAll('fotos').filter((a): a is File => a instanceof File && a.size > 0);
    if (!arquivos.length) return { erro: 'Escolha ao menos uma foto' };
    const legenda = campo(f, 'legenda');
    for (const arquivo of arquivos) {
      const chave = await salvarArquivo(sessao.empresaId, arquivo);
      await db.insert(schema.vistoriaFotos).values({ vistoriaId: id, arquivo: chave, legenda });
    }
    revalidatePath(`/vistorias/${id}`);
    return { ok: `${arquivos.length} foto(s) adicionada(s)` };
  });
}

export async function apagarFoto(vistoriaId: string, fotoId: string) {
  const sessao = await exigirOperador();
  await vistoriaDaEmpresa(sessao, vistoriaId);
  const [foto] = await db
    .delete(schema.vistoriaFotos)
    .where(and(eq(schema.vistoriaFotos.id, fotoId), eq(schema.vistoriaFotos.vistoriaId, vistoriaId)))
    .returning();
  if (foto) await apagarArquivo(foto.arquivo);
  revalidatePath(`/vistorias/${vistoriaId}`);
}
