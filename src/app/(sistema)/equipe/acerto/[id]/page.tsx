import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BotaoImprimir } from '@/components/botao-imprimir';
import { Cabecalho, Cartao, Selo, Tabela } from '@/components/ui';
import { db, schema } from '@/db';
import { obterAcerto } from '@/lib/acertos';
import { diaMes, nomeDia } from '@/lib/agenda';
import { exigirOperador } from '@/lib/auth';
import { dataCurta, moeda } from '@/lib/formato';
import { marcarAcertoPagoAcao } from '../actions';

export const metadata = { title: 'Extrato de acerto' };

const dataBR = (d: string) => dataCurta(`${d}T12:00:00`);

/** Extrato/recibo de pagamento do profissional (interno), pronto para imprimir. */
export default async function ExtratoAcerto(props: PageProps<'/equipe/acerto/[id]'>) {
  const sessao = await exigirOperador();
  const dados = await obterAcerto(sessao.empresaId, (await props.params).id);
  if (!dados) notFound();
  const { acerto: a, membro, linhas, vales } = dados;
  const empresa = await db.query.empresas.findFirst({ where: eq(schema.empresas.id, sessao.empresaId) });

  return (
    <>
      <Cabecalho
        titulo={`Extrato de acerto · ${membro.nome}`}
        subtitulo={`${empresa?.nome ?? ''} · período de ${dataBR(a.de)} a ${dataBR(a.ate)}`}
        acoes={
          <>
            <Link href={`/equipe/acerto?membro=${membro.id}`} className="self-center text-sm font-semibold text-azul hover:underline print:hidden">
              ← Voltar
            </Link>
            {!a.pagoEm && (
              <form action={marcarAcertoPagoAcao.bind(null, a.id)} className="print:hidden">
                <button className="rounded-lg bg-verde px-4 py-2 text-sm font-semibold text-white">Marcar como pago</button>
              </form>
            )}
            <BotaoImprimir />
          </>
        }
      />
      <Cartao titulo="Dias trabalhados" className="mb-4" acoes={a.pagoEm ? <Selo cor="verde">Pago em {dataBR(a.pagoEm)}</Selo> : <Selo cor="amarelo">A pagar</Selo>}>
        <Tabela cabecalho={['Dia', 'Obra', 'Orçamento', 'Diária']}>
          {linhas.map((l, i) => (
            <tr key={i}>
              <td className="px-3 py-2">
                {nomeDia(l.data)} {diaMes(l.data)}
              </td>
              <td className="px-3 py-2">{l.obraNome}</td>
              <td className="px-3 py-2 text-cinza">{l.numero}</td>
              <td className="px-3 py-2 text-right">{moeda(l.diaria)}</td>
            </tr>
          ))}
        </Tabela>
      </Cartao>
      {vales.length > 0 && (
        <Cartao titulo="Vales (adiantamentos)" className="mb-4">
          <ul className="divide-y divide-slate-100 text-sm">
            {vales.map((v) => (
              <li key={v.id} className="flex justify-between py-2">
                <span>
                  {dataBR(v.data)} {v.descricao && `· ${v.descricao}`}
                </span>
                <span>− {moeda(v.valor)}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
      <Cartao>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Diárias ({a.diarias})</dt>
            <dd>{moeda(a.totalDiarias)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Vales</dt>
            <dd>− {moeda(a.totalVales)}</dd>
          </div>
          <div className="flex justify-between border-t border-borda pt-2 text-lg font-extrabold text-azul">
            <dt>Líquido</dt>
            <dd>{moeda(a.liquido)}</dd>
          </div>
        </dl>
        <p className="mt-10 hidden border-t border-tinta pt-1 text-center text-sm print:block">
          {membro.nome} — recebi o valor líquido acima
        </p>
      </Cartao>
    </>
  );
}
