'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { EstadoForm } from '@/components/formulario';
import { db, schema } from '@/db';
import { campo, executarAcao } from '@/lib/acao';
import { exigirGestao, exigirSessao } from '@/lib/auth';
import { conferirSenha, gerarHashSenha } from '@/lib/senha';

const perfil = z.enum(['gestao', 'administrativo', 'lider', 'auxiliar']);

export async function salvarUsuario(id: string | null, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirGestao();
  return executarAcao(async () => {
    const nome = campo(f, 'nome');
    const email = campo(f, 'email')?.toLowerCase();
    const senha = campo(f, 'senha');
    if (!nome || !email) return { erro: 'Informe nome e e-mail' };
    if (!id && (!senha || senha.length < 8)) return { erro: 'A senha inicial precisa ter ao menos 8 caracteres' };
    if (senha && senha.length < 8) return { erro: 'A senha precisa ter ao menos 8 caracteres' };
    const existente = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.email, email) });
    if (existente && existente.id !== id) return { erro: 'Já existe um usuário com este e-mail' };

    const membroEquipeId = campo(f, 'membroEquipeId');
    const valores = {
      nome,
      email,
      perfil: perfil.parse(f.get('perfil')),
      membroEquipeId,
      ativo: id ? f.get('ativo') === 'on' || id === sessao.usuarioId : true,
      ...(senha ? { senhaHash: await gerarHashSenha(senha) } : {}),
    };
    if (id === sessao.usuarioId && valores.perfil !== 'gestao') return { erro: 'Você não pode remover o seu próprio acesso de Gestão' };

    if (id) {
      await db.update(schema.usuarios).set(valores).where(and(eq(schema.usuarios.id, id), eq(schema.usuarios.empresaId, sessao.empresaId)));
      if (!valores.ativo) await db.delete(schema.sessoes).where(eq(schema.sessoes.usuarioId, id));
    } else {
      await db.insert(schema.usuarios).values({ ...valores, senhaHash: valores.senhaHash!, empresaId: sessao.empresaId });
    }
    revalidatePath('/usuarios');
    return { ok: id ? 'Usuário salvo' : 'Usuário criado' };
  });
}

export async function trocarMinhaSenha(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirSessao();
  return executarAcao(async () => {
    const atual = String(f.get('atual') ?? '');
    const nova = String(f.get('nova') ?? '');
    if (nova.length < 8) return { erro: 'A nova senha precisa ter ao menos 8 caracteres' };
    if (nova !== f.get('confirmacao')) return { erro: 'A confirmação não confere' };
    const usuario = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, sessao.usuarioId) });
    if (!usuario || !(await conferirSenha(atual, usuario.senhaHash))) return { erro: 'Senha atual incorreta' };
    await db.update(schema.usuarios).set({ senhaHash: await gerarHashSenha(nova) }).where(eq(schema.usuarios.id, sessao.usuarioId));
    return { ok: 'Senha alterada' };
  });
}
