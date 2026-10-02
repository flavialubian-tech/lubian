import { orcamentoPublico } from '@/lib/orcamento-sessao';
import { htmlDoOrcamento } from '@/lib/pdf-orcamento';

export async function GET(_: Request, ctx: RouteContext<'/p/[token]/documento'>) {
  const orc = await orcamentoPublico((await ctx.params).token);
  if (!orc) return new Response('Não encontrado', { status: 404 });
  return new Response(await htmlDoOrcamento(orc), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
