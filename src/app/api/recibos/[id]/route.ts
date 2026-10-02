import { obterSessao } from '@/lib/auth';
import { dadosRecibo, respostaPdf } from '@/lib/documentos-financeiros';
import { podeOperar } from '@/lib/permissoes';

/** Recibo de sinal ou de quitação de um pagamento (Gestão/Administrativo). `?baixar=1` força o download. */
export async function GET(req: Request, ctx: RouteContext<'/api/recibos/[id]'>) {
  const sessao = await obterSessao();
  if (!sessao || !podeOperar(sessao.perfil)) return new Response('Não autorizado', { status: 401 });
  const doc = await dadosRecibo(sessao.empresaId, (await ctx.params).id);
  return respostaPdf(doc, 'recibo', new URL(req.url).searchParams.has('baixar'));
}
