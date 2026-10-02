'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import type { EstadoForm } from '@/components/formulario';
import { db, schema } from '@/db';
import { criarSessao, encerrarSessao } from '@/lib/auth';
import { podeOperar } from '@/lib/permissoes';
import { conferirSenha } from '@/lib/senha';

export async function entrar(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const email = String(dados.get('email') ?? '').trim().toLowerCase();
  const senha = String(dados.get('senha') ?? '');
  const usuario = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.email, email) });
  if (!usuario || !usuario.ativo || !(await conferirSenha(senha, usuario.senhaHash))) {
    return { erro: 'E-mail ou senha incorretos' };
  }
  await criarSessao(usuario.id);
  redirect(podeOperar(usuario.perfil) ? '/' : '/minha-semana');
}

export async function sair() {
  await encerrarSessao();
  redirect('/login');
}
