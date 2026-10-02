import { orcamentoPublico } from '@/lib/orcamento-sessao';
import { respostaPdfOrcamento } from '@/lib/pdf-orcamento';

export async function GET(_: Request, ctx: RouteContext<'/p/[token]/pdf'>) {
  const orc = await orcamentoPublico((await ctx.params).token);
  if (!orc) return new Response('Não encontrado', { status: 404 });
  return respostaPdfOrcamento(orc);
}
