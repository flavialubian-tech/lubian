import { and, asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { BotaoExcluir } from '@/components/botao-excluir';
import { Formulario } from '@/components/formulario';
import { Botao, Cabecalho, Campo, Cartao, Selo, Tabela, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { trabalhou } from '@/lib/acerto';
import { extratoAcerto, listarAcertos } from '@/lib/acertos';
import { diaMes, ehData, hojeSP, nomeDia } from '@/lib/agenda';
import { exigirOperador } from '@/lib/auth';
import { dataCurta, moeda } from '@/lib/formato';
import { BotaoAcao } from '../../orcamentos/[id]/acoes-cliente';
import { fecharAcertoAcao, lancarValeAcao, marcarAcertoPagoAcao, removerValeAcao } from './actions';

export const metadata = { title: 'Acerto da equipe' };

const dataBR = (d: string) => dataCurta(`${d}T12:00:00`);
const PRESENCA = { presente: <Selo cor="verde">Presente</Selo>, falta: <Selo cor="vermelho">Falta</Selo> };

export default async function Acerto(props: PageProps<'/equipe/acerto'>) {
  const sessao = await exigirOperador();
  const q = (await props.searchParams) as { membro?: string; de?: string; ate?: string };
  const hoje = hojeSP();
  const de = q.de && ehData(q.de) ? q.de : `${hoje.slice(0, 7)}-01`;
  const ate = q.ate && ehData(q.ate) ? q.ate : hoje;
  const membros = await db.query.equipe.findMany({
    where: and(eq(schema.equipe.empresaId, sessao.empresaId), eq(schema.equipe.ativo, true)),
    orderBy: asc(schema.equipe.nome),
  });
  const membroId = membros.some((m) => m.id === q.membro) ? q.membro! : membros[0]?.id;
  const [extrato, acertos] = membroId ? await Promise.all([extratoAcerto(sessao.empresaId, membroId, de, ate), listarAcertos(sessao.empresaId, membroId)]) : [null, []];
  const r = extrato?.resultado;

  return (
    <>
      <Cabecalho titulo="Acerto da equipe" subtitulo="Dias trabalhados (presença) × diária de cada obra − vales" />
      <Cartao className="mb-6">
        <form className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="membro" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-cinza">
              Profissional
            </label>
            <select id="membro" name="membro" defaultValue={membroId} className="w-full rounded-lg border border-borda bg-white px-3 py-2 text-sm">
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          <Campo rotulo="De" name="de" type="date" defaultValue={de} />
          <Campo rotulo="Até" name="ate" type="date" defaultValue={ate} />
          <Botao type="submit" className="col-span-2 sm:col-span-1">
            Ver extrato
          </Botao>
        </form>
      </Cartao>

      {!extrato || !r ? (
        <Vazio>Cadastre a equipe primeiro.</Vazio>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Cartao titulo={`Extrato de ${extrato.membro.nome} · ${dataBR(de)} a ${dataBR(ate)}`}>
            {extrato.alocacoes.length === 0 ? (
              <Vazio>Nenhuma escala no período.</Vazio>
            ) : (
              <Tabela cabecalho={['Dia', 'Obra', 'Presença', 'Diária']}>
                {extrato.alocacoes.map((a, i) => {
                  const linha = r.linhas.find((l) => l.data === a.data && l.numero === a.numero);
                  return (
                    <tr key={i} className={trabalhou(a) ? '' : 'text-cinza'}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {nomeDia(a.data).slice(0, 3)} {diaMes(a.data)}
                      </td>
                      <td className="px-3 py-2">
                        {a.obraNome} <span className="text-xs text-cinza">{a.numero}</span>
                      </td>
                      <td className="px-3 py-2">{a.presenca ? PRESENCA[a.presenca] : <Selo>Sem registro</Selo>}</td>
                      <td className="px-3 py-2 text-right font-semibold">{linha ? moeda(linha.diaria) : '—'}</td>
                    </tr>
                  );
                })}
              </Tabela>
            )}
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Diárias trabalhadas ({r.diarias})</dt>
                <dd className="font-semibold">{moeda(r.totalDiarias)}</dd>
              </div>
              <div className="flex justify-between text-vermelho">
                <dt>Vales em aberto</dt>
                <dd className="font-semibold">− {moeda(r.totalVales)}</dd>
              </div>
              <div className="flex justify-between border-t border-borda pt-2 text-base font-extrabold text-azul">
                <dt>Líquido a pagar</dt>
                <dd>{moeda(r.liquido)}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <BotaoAcao
                acao={fecharAcertoAcao.bind(null, extrato.membro.id, de, ate)}
                rotulo="Fechar acerto"
                variante="primario"
                confirmar={`Fechar o acerto de ${extrato.membro.nome} (${moeda(r.liquido)})? Os vales entram neste acerto.`}
              />
            </div>
          </Cartao>

          <div className="space-y-6">
            <Cartao titulo="Vales em aberto">
              {extrato.vales.length === 0 ? (
                <p className="mb-3 text-sm text-cinza">Nenhum vale em aberto.</p>
              ) : (
                <ul className="mb-3 divide-y divide-slate-100 text-sm">
                  {extrato.vales.map((v) => (
                    <li key={v.id} className="flex items-center justify-between py-2">
                      <span>
                        {dataBR(v.data)} {v.descricao && <span className="text-cinza">· {v.descricao}</span>}
                      </span>
                      <span className="flex items-center gap-2">
                        <strong>{moeda(v.valor)}</strong>
                        <form action={removerValeAcao.bind(null, v.id)}>
                          <button className="text-xs text-vermelho hover:underline">remover</button>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Formulario action={lancarValeAcao.bind(null, extrato.membro.id)} className="grid grid-cols-2 gap-2">
                <Campo rotulo="Valor (R$)" name="valor" inputMode="decimal" required />
                <Campo rotulo="Data" name="data" type="date" defaultValue={hoje} required />
                <Campo rotulo="Descrição" name="descricao" placeholder="Adiantamento" className="col-span-2" />
                <Botao type="submit" variante="secundario" className="col-span-2">
                  Lançar vale
                </Botao>
              </Formulario>
            </Cartao>

            <Cartao titulo="Acertos fechados">
              {acertos.length === 0 ? (
                <p className="text-sm text-cinza">Nenhum acerto fechado.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {acertos.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                      <Link href={`/equipe/acerto/${a.id}`} className="text-azul hover:underline">
                        {dataBR(a.de)} a {dataBR(a.ate)}
                      </Link>
                      <span className="flex items-center gap-2">
                        <strong>{moeda(a.liquido)}</strong>
                        {a.pagoEm ? (
                          <Selo cor="verde">Pago</Selo>
                        ) : (
                          <form action={marcarAcertoPagoAcao.bind(null, a.id)}>
                            <button className="text-xs font-semibold text-verde hover:underline">Marcar como pago</button>
                          </form>
                        )}
                        <BotaoExcluir tipo="acerto" id={a.id} rotulo="Desfazer" confirmar="Desfazer este acerto? Os vales voltam a ficar em aberto e o período pode ser fechado de novo." />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
          </div>
        </div>
      )}
    </>
  );
}
