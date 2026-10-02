import Link from 'next/link';
import { Formulario } from '@/components/formulario';
import { Botao, Cabecalho, Campo, Cartao, Selecao, Tabela, Vazio } from '@/components/ui';
import { hojeSP } from '@/lib/agenda';
import { exigirOperador } from '@/lib/auth';
import { CATEGORIAS_DESPESA, listarDespesas, listarObrasAprovadas } from '@/lib/financeiro';
import { dataCurta, moeda } from '@/lib/formato';
import { limitesMes } from '@/lib/relatorios';
import { lancarDespesaAcao, removerDespesaAcao } from './actions';

export const metadata = { title: 'Despesas' };

export default async function Despesas(props: PageProps<'/despesas'>) {
  const sessao = await exigirOperador();
  const q = (await props.searchParams) as { mes?: string; orcamento?: string };
  const hoje = hojeSP();
  const mes = q.mes && /^\d{4}-\d{2}$/.test(q.mes) ? q.mes : hoje.slice(0, 7);
  const [obras, despesas] = await Promise.all([listarObrasAprovadas(sessao.empresaId), listarDespesas(sessao.empresaId, limitesMes(mes))]);
  const total = despesas.reduce((s, d) => s + d.valor, 0);
  const geral = despesas.filter((d) => !d.orcamentoId).reduce((s, d) => s + d.valor, 0);

  return (
    <>
      <Cabecalho titulo="Despesas" subtitulo="Custos reais por obra (Uber, marmitas, produtos, frete, andaime) e gerais da empresa" />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Cartao titulo="Lançar despesa">
          <Formulario action={lancarDespesaAcao} className="space-y-3">
            <Selecao rotulo="Obra" name="orcamentoId" defaultValue={q.orcamento ?? ''}>
              <option value="">Geral da empresa (sem obra)</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.numero} · {o.obraNome} ({o.clienteNome})
                </option>
              ))}
            </Selecao>
            <Selecao rotulo="Categoria" name="categoria" defaultValue="transporte">
              {Object.entries(CATEGORIAS_DESPESA).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </Selecao>
            <Campo rotulo="Descrição" name="descricao" placeholder="Ex.: Uber equipe ida e volta" required />
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Valor (R$)" name="valor" inputMode="decimal" required />
              <Campo rotulo="Data" name="data" type="date" defaultValue={hoje} required />
            </div>
            <Botao type="submit" className="w-full">
              Lançar despesa
            </Botao>
          </Formulario>
        </Cartao>

        <Cartao
          titulo={`Despesas de ${mes.split('-').reverse().join('/')}`}
          acoes={
            <form className="flex gap-2">
              <input type="month" name="mes" defaultValue={mes} className="rounded-lg border border-borda px-3 py-1.5 text-sm" />
              <button className="rounded-lg bg-azul px-3 py-1.5 text-sm font-semibold text-white">Ver</button>
            </form>
          }
        >
          <p className="mb-3 text-sm text-cinza">
            Total: <strong className="text-tinta">{moeda(total)}</strong> · obras {moeda(total - geral)} · geral {moeda(geral)}
          </p>
          {despesas.length === 0 ? (
            <Vazio>Nenhuma despesa neste mês.</Vazio>
          ) : (
            <Tabela cabecalho={['Data', 'Obra', 'Categoria', 'Descrição', 'Valor', '']}>
              {despesas.map((d) => (
                <tr key={d.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{dataCurta(`${d.data}T12:00:00`)}</td>
                  <td className="px-3 py-2">
                    {d.orcamentoId ? (
                      <Link href={`/orcamentos/${d.orcamentoId}`} className="text-azul hover:underline">
                        {d.obraNome}
                      </Link>
                    ) : (
                      <span className="text-cinza">Geral</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{CATEGORIAS_DESPESA[d.categoria]}</td>
                  <td className="px-3 py-2">{d.descricao}</td>
                  <td className="px-3 py-2 font-semibold">{moeda(d.valor)}</td>
                  <td className="px-3 py-2 text-right">
                    <form action={removerDespesaAcao.bind(null, d.id)}>
                      <button className="text-xs font-semibold text-vermelho hover:underline">remover</button>
                    </form>
                  </td>
                </tr>
              ))}
            </Tabela>
          )}
        </Cartao>
      </div>
    </>
  );
}
