import { dadosRecibo, respostaPdf } from '@/lib/documentos-financeiros';
import { pagamentoPorToken } from '@/lib/recibo-publico';

/** Link público do recibo enviado ao cliente pelo WhatsApp (sem login). */
export async function GET(_: Request, ctx: RouteContext<'/r/[token]'>) {
  const pag = await pagamentoPorToken((await ctx.params).token);
  return respostaPdf(pag ? await dadosRecibo(pag.empresaId, pag.id) : null, 'recibo');
}
