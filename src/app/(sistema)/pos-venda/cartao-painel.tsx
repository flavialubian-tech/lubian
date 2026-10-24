import Link from 'next/link';
import { Cartao, Selo, Vazio } from '@/components/ui';
import { dataCurta, linkWhatsApp } from '@/lib/formato';
import { mensagemIndicado } from '@/lib/mensagens';
import { pendenciasPosVenda, resumoAvaliacoes } from '@/lib/pos-venda';
import { estrelas } from '../orcamentos/[id]/pos-venda';
import { avaliacaoTratadaAcao, indicacaoContatadaAcao } from './actions';

/** Painel: obras quitadas para pedir avaliação, notas baixas para resolver e indicações para chamar. */
export async function CartaoPosVendaPainel({ empresaId }: { empresaId: string }) {
  const [{ pedir, baixas, indicados }, resumo] = await Promise.all([pendenciasPosVenda(empresaId), resumoAvaliacoes(empresaId)]);
  const vazio = !pedir.length && !baixas.length && !indicados.length;
  return (
    <Cartao
      titulo="Pós-venda"
      acoes={resumo.total > 0 && resumo.media != null ? <Selo cor="verde">★ {resumo.media.toFixed(1).replace('.', ',')} · {resumo.total} avaliação(ões)</Selo> : undefined}
    >
      {vazio ? (
        <Vazio>Nenhuma avaliação para pedir nem indicação para chamar.</Vazio>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm" data-posvenda-painel>
          {baixas.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link href={`/orcamentos/${b.orcamentoId}`} className="font-semibold text-azul hover:underline">
                  {b.clienteNome}
                </Link>
                <p className="truncate text-xs text-cinza">{b.comentario ?? 'Sem comentário'}</p>
              </div>
              <div className="shrink-0 text-right">
                <Selo cor="vermelho">{estrelas(b.nota)}</Selo>
                <form action={avaliacaoTratadaAcao.bind(null, b.id)}>
                  <button className="mt-1 text-xs font-semibold text-azul hover:underline">Já conversei</button>
                </form>
              </div>
            </li>
          ))}
          {pedir.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-3" data-pedir={o.numero}>
              <div className="min-w-0">
                <Link href={`/orcamentos/${o.id}`} className="font-semibold text-azul hover:underline">
                  {o.clienteNome}
                </Link>
                <p className="truncate text-xs text-cinza">
                  {o.numero} · {o.obraNome} · entregue {dataCurta(o.entregueEm)}
                </p>
              </div>
              <a href={`/api/orcamentos/${o.id}/pedir-avaliacao`} target="_blank" className="shrink-0 text-xs font-semibold text-verde hover:underline">
                Pedir avaliação
              </a>
            </li>
          ))}
          {indicados.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-3" data-indicado={i.nome}>
              <div className="min-w-0">
                <Link href={`/clientes/${i.clienteId}`} className="font-semibold text-azul hover:underline">
                  {i.nome}
                </Link>
                <p className="truncate text-xs text-cinza">
                  Indicação de {i.indicadorNome} · {i.telefone}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <a href={linkWhatsApp(i.telefone, mensagemIndicado({ indicadoNome: i.nome, indicadorNome: i.indicadorNome }))} target="_blank" className="text-xs font-semibold text-verde hover:underline">
                  Chamar no WhatsApp
                </a>
                <form action={indicacaoContatadaAcao.bind(null, i.id)}>
                  <button className="mt-1 text-xs text-cinza hover:underline">marcar como contatado</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
