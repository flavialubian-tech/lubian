import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { obterSessao } from '@/lib/auth';
import { linkWhatsApp } from '@/lib/formato';
import { mensagemPedirAvaliacao } from '@/lib/mensagens';
import { orcamentoDoOperador } from '@/lib/orcamento-sessao';
import { registrarPedidoAvaliacao } from '@/lib/pos-venda';
import { urlBase } from '@/lib/url';

/** Abre o WhatsApp com o pedido de avaliação e registra o envio (some da lista "pedir avaliação" do Painel). */
export async function GET(_: Request, ctx: RouteContext<'/api/orcamentos/[id]/pedir-avaliacao'>) {
  const orc = await orcamentoDoOperador((await ctx.params).id);
  const sessao = await obterSessao();
  if (!orc || !sessao) return new Response('Não encontrado', { status: 404 });
  const [cliente, obra] = await Promise.all([
    db.query.clientes.findFirst({ where: eq(schema.clientes.id, orc.clienteId) }),
    db.query.obras.findFirst({ where: eq(schema.obras.id, orc.obraId) }),
  ]);
  if (!cliente) return new Response('Cliente não encontrado', { status: 404 });
  await registrarPedidoAvaliacao(orc.id, sessao.usuarioId);
  const mensagem = mensagemPedirAvaliacao({ clienteNome: cliente.nome, obraNome: obra?.nome ?? 'sua obra', link: `${await urlBase()}/p/${orc.tokenPublico}/avaliar` });
  return Response.redirect(linkWhatsApp(cliente.telefone, mensagem), 302);
}
