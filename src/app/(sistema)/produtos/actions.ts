'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { db, schema } from '@/db';
import { campo, executarAcao, numeroBR } from '@/lib/acao';
import { exigirOperador } from '@/lib/auth';

export async function salvarProduto(id: string | null, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    const nome = campo(f, 'nome');
    if (!nome) return { erro: 'Informe o nome do produto' };
    const preco = Number(numeroBR(campo(f, 'precoUnitario') ?? '0'));
    if (!Number.isFinite(preco) || preco < 0) return { erro: 'Preço inválido' };
    const fornecedorId = campo(f, 'fornecedorId');
    if (fornecedorId) {
      const ok = await db.query.fornecedores.findFirst({ where: and(eq(schema.fornecedores.id, fornecedorId), eq(schema.fornecedores.empresaId, sessao.empresaId)) });
      if (!ok) return { erro: 'Fornecedor não encontrado' };
    }
    const valores = {
      nome,
      unidade: campo(f, 'unidade') ?? 'unidade',
      precoUnitario: preco.toFixed(2),
      fornecedorId,
      observacoes: campo(f, 'observacoes'),
      ativo: id ? f.get('ativo') === 'on' : true,
    };
    if (id) {
      const atual = await db.query.produtos.findFirst({ where: and(eq(schema.produtos.id, id), eq(schema.produtos.empresaId, sessao.empresaId)) });
      if (!atual) return { erro: 'Produto não encontrado' };
      const mudouPreco = Number(atual.precoUnitario) !== preco;
      await db
        .update(schema.produtos)
        .set({ ...valores, ...(mudouPreco ? { precoAtualizadoEm: new Date() } : {}) })
        .where(eq(schema.produtos.id, id));
    } else {
      await db.insert(schema.produtos).values({ ...valores, empresaId: sessao.empresaId });
    }
    revalidatePath('/produtos');
    return { ok: id ? 'Salvo' : 'Produto cadastrado' };
  });
}

export async function salvarFornecedor(id: string | null, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    const nome = campo(f, 'nome');
    if (!nome) return { erro: 'Informe o nome do fornecedor' };
    const valores = { nome, telefone: campo(f, 'telefone'), observacoes: campo(f, 'observacoes') };
    if (id) {
      await db.update(schema.fornecedores).set(valores).where(and(eq(schema.fornecedores.id, id), eq(schema.fornecedores.empresaId, sessao.empresaId)));
    } else {
      await db.insert(schema.fornecedores).values({ ...valores, empresaId: sessao.empresaId });
    }
    revalidatePath('/produtos');
    return { ok: id ? 'Salvo' : 'Fornecedor cadastrado' };
  });
}
