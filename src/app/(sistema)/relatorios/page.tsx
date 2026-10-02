import Link from 'next/link';
import { Cabecalho, Cartao, Tabela, Vazio, cx } from '@/components/ui';
import { hojeSP } from '@/lib/agenda';
import { exigirOperador } from '@/lib/auth';
import { moeda, percentual } from '@/lib/formato';
import { EMOJI_SEMAFORO } from '@/lib/lucro';
import { faturamentoDoMes, lucroPorObra, rankingDeParceiros } from '@/lib/relatorios';

export const metadata = { title: 'Relatórios' };

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export default async function Relatorios(props: PageProps<'/relatorios'>) {
  const sessao = await exigirOperador();
  const q = (await props.searchParams) as { mes?: string };
  const hoje = hojeSP();
  const mes = q.mes && /^\d{4}-\d{2}$/.test(q.mes) ? q.mes : hoje.slice(0, 7);
  const [fat, obras, ranking] = await Promise.all([
    faturamentoDoMes(sessao.empresaId, mes, hoje),
    lucroPorObra(sessao.empresaId, mes),
    rankingDeParceiros(sessao.empresaId),
  ]);
  const nomeMes = `${MESES[Number(mes.slice(5)) - 1]}/${mes.slice(0, 4)}`;
  const totalLucro = obras.reduce((s, o) => s + o.real.lucro, 0);

  return (
    <>
      <Cabecalho
        titulo="Relatórios"
        subtitulo={`Faturamento, lucro real por obra e parceiros · ${nomeMes}`}
        acoes={
          <form className="flex gap-2">
            <input type="month" name="mes" defaultValue={mes} className="rounded-lg border border-borda px-3 py-1.5 text-sm" />
            <button className="rounded-lg bg-azul px-3 py-1.5 text-sm font-semibold text-white">Ver</button>
          </form>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { rotulo: 'Recebido no mês', valor: fat.recebido, cor: 'text-verde' },
          { rotulo: 'A receber (até o fim do mês)', valor: fat.aReceber, cor: 'text-azul' },
          { rotulo: 'Em atraso', valor: fat.vencido, cor: fat.vencido > 0 ? 'text-vermelho' : 'text-azul' },
        ].map((i) => (
          <div key={i.rotulo} className="rounded-xl border border-borda bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cinza">{i.rotulo}</p>
            <p className={cx('mt-1 text-2xl font-extrabold', i.cor)}>{moeda(i.valor)}</p>
          </div>
        ))}
      </div>

      <Cartao titulo="Lucro real por obra" className="mb-6" acoes={<span className="text-sm text-cinza">Total: {moeda(totalLucro)}</span>}>
        {obras.length === 0 ? (
          <Vazio>Nenhuma obra com execução, pagamento ou despesa neste mês.</Vazio>
        ) : (
          <Tabela cabecalho={['Obra', 'Valor final', 'Recebido', 'Diárias', 'Despesas', 'Lucro real', 'Markup real']}>
            {obras.map((o) => (
              <tr key={o.id} data-lucro-obra={o.obraNome}>
                <td className="px-3 py-2">
                  <Link href={`/orcamentos/${o.id}`} className="font-semibold text-azul hover:underline">
                    {o.obraNome}
                  </Link>
                  <p className="text-xs text-cinza">
                    {o.numero} · {o.clienteNome}
                  </p>
                </td>
                <td className="px-3 py-2">{moeda(o.valorFinal)}</td>
                <td className="px-3 py-2">{moeda(o.real.recebido)}</td>
                <td className="px-3 py-2">{moeda(o.real.diarias)}</td>
                <td className="px-3 py-2" data-despesas>
                  {moeda(o.real.despesas)}
                </td>
                <td className={cx('px-3 py-2 font-bold', o.real.semaforo === 'vermelho' && 'text-vermelho')}>
                  {EMOJI_SEMAFORO[o.real.semaforo]} {moeda(o.real.lucro)}
                </td>
                <td className="px-3 py-2">{o.real.markup === null ? '—' : percentual(o.real.markup)}</td>
              </tr>
            ))}
          </Tabela>
        )}
        <p className="mt-3 text-xs text-cinza">Lucro real = pagamentos recebidos − (diárias das presenças + despesas). 🟢 markup ≥ 30% · 🟡 0–30% · 🔴 prejuízo.</p>
      </Cartao>

      <Cartao titulo="Ranking de parceiros">
        {ranking.length === 0 ? (
          <Vazio>Nenhum parceiro (arquiteto, construtora, imobiliária) cadastrado.</Vazio>
        ) : (
          <Tabela cabecalho={['#', 'Parceiro', 'Obras indicadas', 'Enviados', 'Aprovados', 'Conversão', 'Faturamento']}>
            {ranking.map((p, i) => (
              <tr key={p.parceiroId}>
                <td className="px-3 py-2 text-cinza">{i + 1}</td>
                <td className="px-3 py-2">
                  <Link href={`/clientes/${p.parceiroId}`} className="font-semibold text-azul hover:underline">
                    {p.nome}
                  </Link>
                </td>
                <td className="px-3 py-2">{p.obras}</td>
                <td className="px-3 py-2">{p.enviados}</td>
                <td className="px-3 py-2">{p.aprovados}</td>
                <td className="px-3 py-2">{percentual(p.conversao)}</td>
                <td className="px-3 py-2 font-semibold">{moeda(p.faturamento)}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
