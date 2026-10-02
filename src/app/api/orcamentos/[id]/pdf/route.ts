import { orcamentoDoOperador } from '@/lib/orcamento-sessao';
import { respostaPdfOrcamento } from '@/lib/pdf-orcamento';

export async function GET(_: Request, ctx: RouteContext<'/api/orcamentos/[id]/pdf'>) {
  const orc = await orcamentoDoOperador((await ctx.params).id);
  if (!orc) return new Response('Não encontrado', { status: 404 });
  return respostaPdfOrcamento(orc);
}
