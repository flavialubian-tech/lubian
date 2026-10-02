import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { obterSessao } from '@/lib/auth';
import { dadosFatura, respostaPdf } from '@/lib/documentos-financeiros';
import { podeOperar } from '@/lib/permissoes';

/** PDF da fatura mensal (Gestão/Administrativo). */
export async function GET(_: Request, ctx: RouteContext<'/api/faturas/[id]'>) {
  const sessao = await obterSessao();
  if (!sessao || !podeOperar(sessao.perfil)) return new Response('Não autorizado', { status: 401 });
  const fatura = await db.query.faturas.findFirst({
    where: and(eq(schema.faturas.id, (await ctx.params).id), eq(schema.faturas.empresaId, sessao.empresaId)),
  });
  return respostaPdf(fatura ? await dadosFatura(fatura.id) : null, 'fatura-mensal');
}
