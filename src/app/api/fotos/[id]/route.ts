import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { lerArquivo } from '@/lib/arquivos';
import { obterSessao } from '@/lib/auth';

export async function GET(_: Request, ctx: RouteContext<'/api/fotos/[id]'>) {
  const sessao = await obterSessao();
  if (!sessao) return new Response('Não autorizado', { status: 401 });
  const { id } = await ctx.params;
  const [foto] = await db
    .select({ arquivo: schema.vistoriaFotos.arquivo })
    .from(schema.vistoriaFotos)
    .innerJoin(schema.vistorias, eq(schema.vistorias.id, schema.vistoriaFotos.vistoriaId))
    .where(and(eq(schema.vistoriaFotos.id, id), eq(schema.vistorias.empresaId, sessao.empresaId)));
  if (!foto) return new Response('Não encontrada', { status: 404 });
  const { conteudo, tipo } = await lerArquivo(foto.arquivo);
  return new Response(new Uint8Array(conteudo), { headers: { 'Content-Type': tipo, 'Cache-Control': 'private, max-age=86400' } });
}
