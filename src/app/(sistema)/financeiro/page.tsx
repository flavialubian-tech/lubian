import Link from 'next/link';
import { BotaoLink, Cabecalho, Cartao, Selo, Tabela, Vazio, cx } from '@/components/ui';
import { hojeSP } from '@/lib/agenda';
import { exigirOperador } from '@/lib/auth';
import { buscarEmpresa } from '@/lib/empresa';
import { situacaoCobranca } from '@/lib/cobranca';
import { listarCobrancas, listarPagamentos, type CobrancaListada } from '@/lib/financeiro';
import { dataCurta, linkWhatsApp, moeda } from '@/lib/formato';
import { mensagemCobranca } from '@/lib/mensagens';
import { FORMAS_PAGAMENTO } from '@/lib/operacao';
import { pixDaEmpresa } from '@/lib/pix';
import { limitesMes } from '@/lib/relatorios';
import { registrarPagamentoAcao } from './actions';
import { FormPagamento } from './form-pagamento';

export const metadata = { title: 'Financeiro' };

const FILTROS = { abertas: 'Em aberto', vencidas: 'Vencidas', pagas: 'Pagas', todas: 'Todas' } as const;
type Filtro = keyof typeof FILTROS;
const ROTULO_TIPO = { sinal: 'Sinal', saldo: 'Saldo', fatura: 'Fatura' };
const dataBR = (d: string) => dataCurta(`${d}T12:00:00`);

function SeloSituacao({ c, hoje }: { c: CobrancaListada; hoje: string }) {
  const s = situacaoCobranca(c, hoje);
  if (s === 'vencida') return <Selo cor="vermelho">Vencida</Selo>;
  if (s === 'vence_hoje') return <Selo cor="amarelo">Vence hoje</Selo>;
  if (s === 'paga') return <Selo cor="verde">Paga</Selo>;
  if (s === 'cancelada') return <Selo>Cancelada</Selo>;
  return <Selo cor="azul">Em aberto</Selo>;
}

function mensagem(c: CobrancaListada, empresa: Parameters<typeof pixDaEmpresa>[0]) {
  const referencia = c.orcamentoNumero ?? c.faturaNumero;
  return mensagemCobranca({
    clienteNome: c.clienteNome,
    descricao: c.descricao,
    referencia,
    valor: c.valor,
    vencimento: dataBR(c.vencimento),
    pix: pixDaEmpresa(empresa, c.valor, referencia ?? undefined),
  });
}

export default async function Financeiro(props: PageProps<'/financeiro'>) {
  const sessao = await exigirOperador();
  const q = (await props.searchParams) as { ver?: string; q?: string };
  const ver: Filtro = q.ver && q.ver in FILTROS ? (q.ver as Filtro) : 'abertas';
  const busca = (q.q ?? '').trim().toLowerCase();
  const hoje = hojeSP();
  const mes = limitesMes(hoje.slice(0, 7));

  const [todas, pagosMes, pagosHoje, empresa] = await Promise.all([
    listarCobrancas(sessao.empresaId),
    listarPagamentos(sessao.empresaId, mes),
    listarPagamentos(sessao.empresaId, {}).then((l) => l.filter((p) => hojeSP(p.criadoEm) === hoje)),
    buscarEmpresa(sessao.empresaId),
  ]);
  // Baixas feitas hoje continuam na lista "Em aberto", já com o recibo.
  const reciboHoje = new Map(pagosHoje.map((p) => [p.cobrancaId, p]));
  const abertas = todas.filter((c) => c.status === 'aberta');
  const vencidas = abertas.filter((c) => c.vencimento < hoje);
  const soma = (l: { valor: number }[]) => l.reduce((s, c) => s + c.valor, 0);

  const lista = todas
    .filter((c) =>
      ver === 'abertas' ? c.status === 'aberta' || reciboHoje.has(c.id) : ver === 'vencidas' ? c.status === 'aberta' && c.vencimento < hoje : ver === 'pagas' ? c.status === 'paga' : true,
    )
    .filter((c) => !busca || [c.clienteNome, c.obraNome, c.orcamentoNumero, c.faturaNumero, c.descricao].some((t) => t?.toLowerCase().includes(busca)));
  if (ver === 'pagas' || ver === 'todas') lista.reverse();

  const indicadores = [
    { rotulo: 'A receber', valor: moeda(soma(abertas)), detalhe: `${abertas.length} cobrança(s) em aberto` },
    { rotulo: 'Vencido', valor: moeda(soma(vencidas)), detalhe: `${vencidas.length} cobrança(s)`, alerta: vencidas.length > 0 },
    { rotulo: 'Recebido no mês', valor: moeda(soma(pagosMes)), detalhe: `${pagosMes.length} pagamento(s)` },
  ];

  return (
    <>
      <Cabecalho titulo="Financeiro" subtitulo="Contas a receber, baixa de pagamentos e recibos" />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {indicadores.map((i) => (
          <div key={i.rotulo} className="rounded-xl border border-borda bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cinza">{i.rotulo}</p>
            <p className={cx('mt-1 text-xl font-extrabold sm:text-2xl', i.alerta ? 'text-vermelho' : 'text-azul')}>{i.valor}</p>
            <p className="text-xs text-cinza">{i.detalhe}</p>
          </div>
        ))}
      </div>

      <Cartao
        titulo="Contas a receber"
        className="mb-6"
        acoes={
          <form className="flex flex-wrap gap-2">
            <select name="ver" defaultValue={ver} className="rounded-lg border border-borda bg-white px-3 py-1.5 text-sm">
              {Object.entries(FILTROS).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
            <input name="q" defaultValue={q.q} placeholder="Cliente, obra, nº…" className="w-40 rounded-lg border border-borda px-3 py-1.5 text-sm" />
            <button className="rounded-lg bg-azul px-3 py-1.5 text-sm font-semibold text-white">Filtrar</button>
          </form>
        }
      >
        {lista.length === 0 ? (
          <Vazio>Nenhuma cobrança neste filtro.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lista.map((c) => {
              const vencida = c.status === 'aberta' && c.vencimento < hoje;
              return (
                <li key={c.id} className="py-3" data-cobranca={c.obraNome ?? ''} data-tipo={c.tipo}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {c.clienteNome} <span className="font-normal text-cinza">· {ROTULO_TIPO[c.tipo]}</span>
                      </p>
                      <p className="truncate text-xs text-cinza">
                        {c.descricao}
                        {c.orcamentoId && (
                          <>
                            {' · '}
                            <Link href={`/orcamentos/${c.orcamentoId}`} className="text-azul hover:underline">
                              {c.orcamentoNumero}
                            </Link>
                          </>
                        )}
                        {c.obraNome && ` · ${c.obraNome}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className={cx('text-sm font-bold', vencida && 'text-vermelho')}>{moeda(c.valor)}</p>
                        <p className={cx('text-xs', vencida ? 'font-semibold text-vermelho' : 'text-cinza')}>vence {dataBR(c.vencimento)}</p>
                      </div>
                      <SeloSituacao c={c} hoje={hoje} />
                    </div>
                  </div>
                  {reciboHoje.has(c.id) && (
                    <a href={`/api/recibos/${reciboHoje.get(c.id)!.id}`} target="_blank" className="mt-1 inline-block text-xs font-semibold text-azul hover:underline" data-recibo>
                      Recibo {reciboHoje.get(c.id)!.reciboNumero} (PDF)
                    </a>
                  )}
                  {c.status === 'aberta' && (
                    <details className="mt-2 rounded-lg border border-borda p-3 open:bg-slate-50">
                      <summary className="cursor-pointer text-sm font-semibold text-azul">Registrar pagamento</summary>
                      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                        <FormPagamento action={registrarPagamentoAcao.bind(null, c.id)} valor={c.valor} valorEspecie={c.valorEspecie} hoje={hoje} />
                        <a href={linkWhatsApp(c.clienteTelefone, mensagem(c, empresa))} target="_blank" className="self-start text-xs font-semibold text-verde hover:underline">
                          Cobrar no WhatsApp
                        </a>
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Pagos no mês">
        {pagosMes.length === 0 ? (
          <Vazio>Nenhum pagamento registrado neste mês.</Vazio>
        ) : (
          <Tabela cabecalho={['Data', 'Cliente', 'Referência', 'Forma', 'Valor', 'Documentos']}>
            {pagosMes.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2 whitespace-nowrap">{dataBR(p.pagoEm)}</td>
                <td className="px-3 py-2">{p.clienteNome}</td>
                <td className="px-3 py-2 text-cinza">
                  {p.descricao ?? ROTULO_TIPO[p.tipo]}
                  {p.orcamentoNumero && ` · ${p.orcamentoNumero}`}
                </td>
                <td className="px-3 py-2">{FORMAS_PAGAMENTO[p.forma]}</td>
                <td className="px-3 py-2 font-semibold">{moeda(p.valor)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <BotaoLink href={`/api/recibos/${p.id}`} target="_blank" variante="fantasma" className="px-2 py-1">
                    Recibo {p.reciboNumero ?? ''}
                  </BotaoLink>
                  {p.comprovante && (
                    <a href={`/api/comprovantes/${p.id}`} target="_blank" className="text-xs font-semibold text-azul hover:underline">
                      comprovante
                    </a>
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
