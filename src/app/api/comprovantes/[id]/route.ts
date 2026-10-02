import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { lerArquivo } from '@/lib/arquivos';
import { obterSessao } from '@/lib/auth';
import { podeOperar } from '@/lib/permissoes';

/** Comprovante de um pagamento (só Gestão/Administrativo da mesma empresa). */
export async function GET(_: Request, ctx: RouteContext<'/api/comprovantes/[id]'>) {
  const sessao = await obterSessao();
  if (!sessao || !podeOperar(sessao.perfil)) return new Response('Não autorizado', { status: 401 });
  const { id } = await ctx.params;
  const pagamento = await db.query.pagamentos.findFirst({
    where: and(eq(schema.pagamentos.id, id), eq(schema.pagamentos.empresaId, sessao.empresaId)),
  });
  if (!pagamento?.comprovante) return new Response('Não encontrado', { status: 404 });
  const { conteudo, tipo } = await lerArquivo(pagamento.comprovante);
  return new Response(new Uint8Array(conteudo), { headers: { 'Content-Type': tipo, 'Cache-Control': 'private, max-age=86400' } });
}
