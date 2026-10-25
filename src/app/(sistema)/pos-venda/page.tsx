import Link from 'next/link';
import { Cabecalho, Cartao, Selo, Tabela, Vazio } from '@/components/ui';
import { exigirOperador } from '@/lib/auth';
import { dataCurta, linkWhatsApp } from '@/lib/formato';
import { mensagemIndicado } from '@/lib/mensagens';
import { listarAvaliacoes, listarIndicacoes, resumoAvaliacoes } from '@/lib/pos-venda';
import { notaBaixa } from '@/lib/pos-venda-regras';
import { estrelas } from '../orcamentos/[id]/pos-venda';
import { avaliacaoTratadaAcao, indicacaoContatadaAcao } from './actions';

export const metadata = { title: 'Pós-venda' };

export default async function PosVenda() {
  const sessao = await exigirOperador();
  const [avaliacoes, indicacoes, resumo] = await Promise.all([
    listarAvaliacoes(sessao.empresaId),
    listarIndicacoes(sessao.empresaId),
    resumoAvaliacoes(sessao.empresaId),
  ]);
  const porNota = [5, 4, 3, 2, 1].map((n) => ({ n, total: avaliacoes.filter((a) => a.nota === n).length }));

  return (
    <>
      <Cabecalho titulo="Pós-venda" subtitulo="Avaliações dos clientes e indicações recebidas" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-borda bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-cinza">Nota média</p>
          <p className="mt-1 text-2xl font-extrabold text-azul">{resumo.media != null ? `★ ${resumo.media.toFixed(1).replace('.', ',')}` : '—'}</p>
          <p className="text-xs text-cinza">{resumo.total} avaliação(ões)</p>
        </div>
        <div className="rounded-xl border border-borda bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-cinza">Notas</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {porNota.map(({ n, total }) => (
              <li key={n} className="flex justify-between">
                <span className="text-amber-500">{estrelas(n)}</span>
                <span className="font-semibold">{total}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-borda bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-cinza">Indicações</p>
          <p className="mt-1 text-2xl font-extrabold text-azul">{indicacoes.length}</p>
          <p className="text-xs text-cinza">{indicacoes.filter((i) => !i.contatadoEm).length} para chamar</p>
        </div>
        <div className="rounded-xl border border-borda bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-cinza">Indicações que viraram orçamento</p>
          <p className="mt-1 text-2xl font-extrabold text-verde">{indicacoes.filter((i) => i.orcamentos > 0).length}</p>
          <p className="text-xs text-cinza">de {indicacoes.length}</p>
        </div>
      </div>

      <Cartao titulo="Avaliações" className="mb-6">
        {avaliacoes.length === 0 ? (
          <Vazio>Nenhuma avaliação ainda. Peça pelo Painel ou pelo orçamento, depois da entrega.</Vazio>
        ) : (
          <Tabela cabecalho={['Data', 'Cliente / obra', 'Nota', 'Comentário', 'Indicou']}>
            {avaliacoes.map((a) => (
              <tr key={a.id} data-avaliacao={a.clienteNome}>
                <td className="px-3 py-2 whitespace-nowrap">{dataCurta(a.criadoEm)}</td>
                <td className="px-3 py-2">
                  <Link href={`/clientes/${a.clienteId}`} className="font-semibold text-azul hover:underline">
                    {a.clienteNome}
                  </Link>
                  <Link href={`/orcamentos/${a.orcamentoId}`} className="block text-xs text-cinza hover:underline">
                    {a.numero} · {a.obraNome}
                  </Link>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={notaBaixa(a.nota) ? 'text-vermelho' : 'text-amber-500'}>{estrelas(a.nota)}</span>
                  {notaBaixa(a.nota) &&
                    (a.tratadoEm ? (
                      <span className="block text-xs text-cinza">resolvido {dataCurta(a.tratadoEm)}</span>
                    ) : (
                      <form action={avaliacaoTratadaAcao.bind(null, a.id)}>
                        <button className="text-xs font-semibold text-azul hover:underline">Já conversei</button>
                      </form>
                    ))}
                </td>
                <td className="px-3 py-2 text-sm">{a.comentario ? <span className="italic">“{a.comentario}”</span> : <span className="text-cinza">—</span>}</td>
                <td className="px-3 py-2 text-center">{a.indicacoes || '—'}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>

      <Cartao titulo="Indicações">
        {indicacoes.length === 0 ? (
          <Vazio>Nenhuma indicação ainda.</Vazio>
        ) : (
          <Tabela cabecalho={['Data', 'Indicado(a)', 'Indicado por', 'Situação', '']}>
            {indicacoes.map((i) => (
              <tr key={i.id} data-indicacao={i.nome}>
                <td className="px-3 py-2 whitespace-nowrap">{dataCurta(i.criadoEm)}</td>
                <td className="px-3 py-2">
                  <Link href={`/clientes/${i.clienteId}`} className="font-semibold text-azul hover:underline">
                    {i.nome}
                  </Link>
                  <span className="block text-xs text-cinza">{i.telefone}</span>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/clientes/${i.indicadoPorId}`} className="hover:underline">
                    {i.indicadorNome}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {i.orcamentos > 0 ? <Selo cor="verde">Pediu orçamento</Selo> : i.contatadoEm ? <Selo cor="azul">Contatado</Selo> : <Selo cor="amarelo">Chamar</Selo>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  <a href={linkWhatsApp(i.telefone, mensagemIndicado({ indicadoNome: i.nome, indicadorNome: i.indicadorNome }))} target="_blank" className="text-xs font-semibold text-verde hover:underline">
                    WhatsApp
                  </a>
                  {!i.contatadoEm && (
                    <form action={indicacaoContatadaAcao.bind(null, i.id)} className="inline">
                      <button className="ml-2 text-xs text-cinza hover:underline">marcar contatado</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
