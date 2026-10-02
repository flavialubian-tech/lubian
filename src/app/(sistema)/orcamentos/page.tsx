import Link from 'next/link';
import { StatusOrcamento } from '@/components/status-orcamento';
import { BotaoLink, Cabecalho, Cartao, Tabela, Vazio, cx } from '@/components/ui';
import { exigirOperador } from '@/lib/auth';
import { listarOrcamentos, ROTULO_STATUS, type StatusOrcamento as Status } from '@/lib/consultas';
import { dataCurta, moeda } from '@/lib/formato';

export const metadata = { title: 'Orçamentos' };

const FILTROS: { valor: string; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'cobrar', rotulo: 'Para cobrar' },
  ...(['rascunho', 'enviado', 'aprovado', 'recusado'] as Status[]).map((s) => ({ valor: s, rotulo: ROTULO_STATUS[s] })),
];

export default async function Orcamentos(props: PageProps<'/orcamentos'>) {
  const sessao = await exigirOperador();
  const { status = '' } = (await props.searchParams) as { status?: string };
  const todos = await listarOrcamentos(sessao.empresaId);
  const lista = todos.filter((o) => (status === 'cobrar' ? o.situacao.tipo !== 'ok' : !status || o.status === status));

  return (
    <>
      <Cabecalho titulo="Orçamentos" subtitulo="Funil: Rascunho → Enviado → Aprovado / Recusado" acoes={<BotaoLink href="/orcamentos/novo">+ Novo orçamento</BotaoLink>} />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor ? `/orcamentos?status=${f.valor}` : '/orcamentos'}
            className={cx(
              'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold',
              status === f.valor ? 'bg-azul text-white' : 'bg-white text-azul ring-1 ring-borda hover:bg-azul-claro',
            )}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>
      <Cartao>
        {lista.length === 0 ? (
          <Vazio>Nenhum orçamento neste filtro.</Vazio>
        ) : (
          <Tabela cabecalho={['Número', 'Cliente / obra', 'Situação', 'Enviado', 'Valor final']}>
            {lista.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <Link href={`/orcamentos/${o.id}`} className="font-semibold text-azul hover:underline">
                    {o.numero}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  {o.clienteNome}
                  <span className="block text-xs text-cinza">{o.obraNome}</span>
                </td>
                <td className="px-3 py-2.5">
                  <StatusOrcamento status={o.status} situacao={o.situacao} />
                </td>
                <td className="px-3 py-2.5 text-cinza">{dataCurta(o.enviadoEm)}</td>
                <td className="px-3 py-2.5 font-bold">{moeda(o.valorFinal)}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
