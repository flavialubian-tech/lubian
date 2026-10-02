import { orcamentoDoOperador } from '@/lib/orcamento-sessao';
import { htmlDoOrcamento } from '@/lib/pdf-orcamento';

export async function GET(_: Request, ctx: RouteContext<'/api/orcamentos/[id]/previa'>) {
  const orc = await orcamentoDoOperador((await ctx.params).id);
  if (!orc) return new Response('Não encontrado', { status: 404 });
  return new Response(await htmlDoOrcamento(orc), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
