import Link from 'next/link';
import { Cartao, Selo } from '@/components/ui';
import type { schema } from '@/db';
import { dataCurta, dataHora, linkWhatsApp } from '@/lib/formato';
import { mensagemIndicado } from '@/lib/mensagens';
import { estadoPosVenda } from '@/lib/pos-venda';
import { notaBaixa } from '@/lib/pos-venda-regras';
import { avaliacaoTratadaAcao, indicacaoContatadaAcao } from '../../pos-venda/actions';

type Orcamento = typeof schema.orcamentos.$inferSelect;

export const estrelas = (nota: number) => '★'.repeat(nota) + '☆'.repeat(5 - nota);

/** Pós-venda de uma obra entregue: pedir avaliação, ver a nota e as indicações. */
export async function CartaoPosVenda({ orc, clienteNome }: { orc: Orcamento; clienteNome: string }) {
  const { avaliacao: a, indicados, pedidoEm, quitado } = await estadoPosVenda(orc.id);
  return (
    <Cartao titulo="Pós-venda" className="mb-6" acoes={a ? <Selo cor={notaBaixa(a.nota) ? 'vermelho' : 'verde'}>{estrelas(a.nota)}</Selo> : undefined}>
      {a ? (
        <div className="space-y-3 text-sm" data-posvenda-avaliacao>
          <p>
            <span className="text-lg text-amber-500">{estrelas(a.nota)}</span> · avaliado em {dataHora(a.criadoEm)}
          </p>
          {a.comentario && <blockquote className="rounded-lg bg-slate-50 px-3 py-2 italic">“{a.comentario}”</blockquote>}
          {notaBaixa(a.nota) &&
            (a.tratadoEm ? (
              <p className="text-xs text-cinza">Conversa com o cliente registrada em {dataCurta(a.tratadoEm)}.</p>
            ) : (
              <form action={avaliacaoTratadaAcao.bind(null, a.id)} className="rounded-lg bg-red-50 px-3 py-2">
                <p className="font-semibold text-vermelho">Nota baixa: converse com o cliente para entender e resolver.</p>
                <button className="mt-1 text-xs font-semibold text-azul hover:underline">Marcar como resolvido</button>
              </form>
            ))}
          {indicados.length > 0 && (
            <div>
              <p className="font-semibold">Indicações</p>
              <ul className="mt-1 space-y-1">
                {indicados.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-2">
                    <Link href={`/clientes/${i.clienteId}`} className="text-azul hover:underline">
                      {i.nome}
                    </Link>
                    <span className="text-xs text-cinza">{i.telefone}</span>
                    {i.contatadoEm ? (
                      <Selo cor="verde">Contatado</Selo>
                    ) : (
                      <>
                        <a href={linkWhatsApp(i.telefone, mensagemIndicado({ indicadoNome: i.nome, indicadorNome: clienteNome }))} target="_blank" className="text-xs font-semibold text-verde hover:underline">
                          Chamar no WhatsApp
                        </a>
                        <form action={indicacaoContatadaAcao.bind(null, i.id)}>
                          <button className="text-xs text-cinza hover:underline">marcar como contatado</button>
                        </form>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="text-cinza">
            {quitado ? 'Obra quitada.' : 'Serviço entregue.'} Peça a avaliação: o cliente dá as estrelas, pode indicar conhecidos e, com 4 ou 5 estrelas, é
            convidado a avaliar a Lubian no Google.
          </p>
          <a
            href={`/api/orcamentos/${orc.id}/pedir-avaliacao`}
            target="_blank"
            className="inline-flex items-center rounded-lg bg-verde px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
            data-pedir-avaliacao
          >
            Pedir avaliação pelo WhatsApp
          </a>
          {pedidoEm && <p className="text-xs text-cinza">Pedido enviado em {dataHora(pedidoEm)}; aguardando a resposta do cliente.</p>}
        </div>
      )}
    </Cartao>
  );
}
