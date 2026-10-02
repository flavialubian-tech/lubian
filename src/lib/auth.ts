import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db, schema } from '@/db';
import { ehGestao, podeOperar, type Perfil } from './permissoes';

export const COOKIE_SESSAO = 'lubian_sessao';
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export interface Sessao {
  usuarioId: string;
  empresaId: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

export async function criarSessao(usuarioId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiraEm = new Date(Date.now() + DURACAO_MS);
  await db.insert(schema.sessoes).values({ id: hashToken(token), usuarioId, expiraEm });
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiraEm,
  });
}

export async function encerrarSessao() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) await db.delete(schema.sessoes).where(eq(schema.sessoes.id, hashToken(token)));
  jar.delete(COOKIE_SESSAO);
}

/** Sessão do usuário logado (ou null). Memorizada por requisição. */
export const obterSessao = cache(async (): Promise<Sessao | null> => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const [linha] = await db
    .select({
      usuarioId: schema.usuarios.id,
      empresaId: schema.usuarios.empresaId,
      nome: schema.usuarios.nome,
      email: schema.usuarios.email,
      perfil: schema.usuarios.perfil,
      ativo: schema.usuarios.ativo,
    })
    .from(schema.sessoes)
    .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.sessoes.usuarioId))
    .where(and(eq(schema.sessoes.id, hashToken(token)), gt(schema.sessoes.expiraEm, new Date())));
  if (!linha || !linha.ativo) return null;
  const { ativo: _, ...sessao } = linha;
  return sessao;
});

export async function exigirSessao(): Promise<Sessao> {
  const s = await obterSessao();
  if (!s) redirect('/login');
  return s;
}

/** Gestão ou Administrativo. Líderes e auxiliares vão para a área da equipe. */
export async function exigirOperador(): Promise<Sessao> {
  const s = await exigirSessao();
  if (!podeOperar(s.perfil)) redirect('/minha-semana');
  return s;
}

export async function exigirGestao(): Promise<Sessao> {
  const s = await exigirSessao();
  if (!ehGestao(s.perfil)) redirect('/');
  return s;
}
