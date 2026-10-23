import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { obterSessao } from '@/lib/auth';
import { podeOperar } from '@/lib/permissoes';
import { whatsAppDoRecibo } from '@/lib/recibo-publico';

/** Abre o WhatsApp com a mensagem do recibo (montada só no clique; cria o link público na primeira vez). */
export async function GET(_: Request, ctx: RouteContext<'/api/recibos/[id]/whatsapp'>) {
  const sessao = await obterSessao();
  if (!sessao || !podeOperar(sessao.perfil)) return new Response('Não autorizado', { status: 401 });
  const id = (await ctx.params).id;
  const pag = await db.query.pagamentos.findFirst({ where: and(eq(schema.pagamentos.id, id), eq(schema.pagamentos.empresaId, sessao.empresaId)), columns: { id: true } });
  const link = pag ? await whatsAppDoRecibo(pag.id) : null;
  if (!link) return new Response('Recibo não encontrado', { status: 404 });
  return Response.redirect(link, 302);
}
