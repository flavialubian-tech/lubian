import { faturaPorToken } from '@/lib/contratos';
import { dadosFatura, respostaPdf } from '@/lib/documentos-financeiros';

/** Link público da fatura enviado ao cliente pelo WhatsApp (sem login). */
export async function GET(_: Request, ctx: RouteContext<'/f/[token]'>) {
  const fatura = await faturaPorToken((await ctx.params).token);
  return respostaPdf(fatura ? await dadosFatura(fatura.id) : null, 'fatura-mensal');
}
