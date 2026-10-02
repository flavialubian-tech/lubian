import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { obterSessao } from './auth';
import { podeOperar } from './permissoes';

/** Orçamento da empresa do usuário logado (para rotas de API). */
export async function orcamentoDoOperador(id: string) {
  const sessao = await obterSessao();
  if (!sessao || !podeOperar(sessao.perfil)) return null;
  return db.query.orcamentos.findFirst({ where: and(eq(schema.orcamentos.id, id), eq(schema.orcamentos.empresaId, sessao.empresaId)) });
}

/** Orçamento pelo link do cliente — rascunhos não ficam visíveis. */
export async function orcamentoPublico(token: string) {
  const orc = await db.query.orcamentos.findFirst({ where: eq(schema.orcamentos.tokenPublico, token) });
  return orc && orc.status !== 'rascunho' ? orc : null;
}
