import { BotaoExcluir } from '@/components/botao-excluir';
import { Formulario } from '@/components/formulario';
import { Botao, Campo, Cartao, Selecao, Selo, cx } from '@/components/ui';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { hojeSP } from '@/lib/agenda';
import { situacaoCobranca } from '@/lib/cobranca';
import { buscarEmpresa } from '@/lib/empresa';
import { CATEGORIAS_DESPESA, listarCobrancas, listarPagamentos } from '@/lib/financeiro';
import { dataCurta, linkWhatsApp, moeda, percentual } from '@/lib/formato';
import { EMOJI_SEMAFORO } from '@/lib/lucro';
import { mensagemCobrarSaldo } from '@/lib/mensagens';
import { pixDaEmpresa } from '@/lib/pix';
import { custosReais } from '@/lib/relatorios';
import { urlBase } from '@/lib/url';
import { custoProdutos } from '@/precificacao';
import { registrarPagamentoAcao } from '../../financeiro/actions';
import { FormPagamento } from '../../financeiro/form-pagamento';
import { lancarDespesaObraAcao } from '../actions';

type Orcamento = typeof schema.orcamentos.$inferSelect;
const dataBR = (d: string) => dataCurta(`${d}T12:00:00`);

/** Contas a receber, Previsto × Realizado e lucro real de um orçamento aprovado. */
export async function CartaoFinanceiroObra({ orc }: { orc: Orcamento }) {
  const hoje = hojeSP();
  const [cobrancas, pagamentos, custos, cliente, obra, empresa, base] = await Promise.all([
    listarCobrancas(orc.empresaId, { orcamentoId: orc.id }),
    listarPagamentos(orc.empresaId, { orcamentoId: orc.id }),
    custosReais(orc.empresaId, [orc.id]),
    db.query.clientes.findFirst({ where: eq(schema.clientes.id, orc.clienteId) }),
    db.query.obras.findFirst({ where: eq(schema.obras.id, orc.obraId) }),
    buscarEmpresa(orc.empresaId),
    urlBase(),
  ]);
  // Cobrança do saldo depois da entrega (o recibo de cada pagamento vai por /api/recibos/[id]/whatsapp).
  const whatsSaldo = (valor: number) =>
    linkWhatsApp(
      cliente?.telefone,
      mensagemCobrarSaldo({ clienteNome: cliente?.nome ?? '', obraNome: obra?.nome ?? 'sua obra', valor, link: `${base}/p/${orc.tokenPublico}`, pix: pixDaEmpresa(empresa, valor, orc.numero) }),
    );
  const real = custos.get(orc.id)!;
  const pagamentoDe = new Map(pagamentos.map((p) => [p.cobrancaId, p]));
  const r = orc.resultado;
  const cv = orc.precificacao.custosVariaveis;
  const d = real.despesasPorCategoria;
  const linhas = [
    { rotulo: 'Força-tarefa (diárias)', previsto: r.forcaTarefa, realizado: real.diarias },
    { rotulo: 'Transporte', previsto: cv.transporte ?? 0, realizado: d.transporte ?? 0 },
    { rotulo: 'Alimentação', previsto: cv.alimentacao ?? 0, realizado: d.alimentacao ?? 0 },
    { rotulo: 'Produtos e fretes', previsto: (cv.produtosFretes ?? 0) + custoProdutos(orc.precificacao.produtos), realizado: d.produtos ?? 0 },
    { rotulo: 'Locação', previsto: cv.locacao ?? 0, realizado: d.locacao ?? 0 },
    { rotulo: 'Outros', previsto: cv.outros ?? 0, realizado: d.outros ?? 0 },
  ];

  return (
    <Cartao titulo="Financeiro da obra" className="mb-6" acoes={<Selo cor={real.semaforo === 'vermelho' ? 'vermelho' : real.semaforo === 'amarelo' ? 'amarelo' : 'verde'}>{EMOJI_SEMAFORO[real.semaforo]} Lucro real {moeda(real.lucro)}</Selo>}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 text-sm">
          <h3 className="font-bold">Contas a receber</h3>
          {cobrancas.map((c) => {
            const s = situacaoCobranca(c, hoje);
            const p = pagamentoDe.get(c.id);
            return (
              <div key={c.id} className="rounded-lg border border-borda p-3" data-cobranca-obra={c.tipo}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.descricao}</p>
                    <p className={cx('text-xs', s === 'vencida' ? 'font-semibold text-vermelho' : 'text-cinza')}>vence {dataBR(c.vencimento)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{moeda(c.valor)}</p>
                    {s === 'paga' ? <Selo cor="verde">Paga</Selo> : s === 'cancelada' ? <Selo>Cancelada</Selo> : s === 'vencida' ? <Selo cor="vermelho">Vencida</Selo> : <Selo cor="azul">Em aberto</Selo>}
                  </div>
                </div>
                {c.status === 'paga' && p && (
                  <a href={`/api/recibos/${p.id}`} target="_blank" className="mt-1 inline-block text-xs font-semibold text-azul hover:underline">
                    {c.tipo === 'sinal' ? 'Recibo de sinal' : 'Recibo de quitação'} {p.reciboNumero} (PDF)
                  </a>
                )}
                {c.status === 'paga' && p && (
                  <a href={`/api/recibos/${p.id}/whatsapp`} target="_blank" className="ml-3 inline-block text-xs font-semibold text-verde hover:underline" data-whats-recibo>
                    📲 Enviar recibo pelo WhatsApp
                  </a>
                )}
                {c.status === 'paga' && p && <BotaoExcluir tipo="pagamento" id={p.id} rotulo="Excluir pagamento" confirmar={"Excluir este pagamento lançado por engano? O recibo deixa de valer, a cobrança volta para \"em aberto\" e, se for o sinal, a agenda volta para pré-reserva."} className="ml-3" />}
                {c.status === 'aberta' && c.tipo === 'saldo' && orc.entregueEm && (
                  <a
                    href={whatsSaldo(Number(c.valor))}
                    target="_blank"
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-verde px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                    data-whats-saldo
                  >
                    📲 Cobrar saldo pelo WhatsApp (serviço finalizado + Pix)
                  </a>
                )}
                {c.status === 'aberta' && c.tipo === 'saldo' && orc.entregueEm && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-azul">Registrar quitação</summary>
                    <div className="mt-2">
                      <FormPagamento action={registrarPagamentoAcao.bind(null, c.id)} valor={c.valor} hoje={hoje} rotulo="Registrar quitação" />
                    </div>
                  </details>
                )}
              </div>
            );
          })}
          <p className="text-xs text-cinza">
            Recebido: <strong>{moeda(real.recebido)}</strong> de {moeda(r.valorFinal)}
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <h3 className="font-bold">Previsto × Realizado</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borda text-left text-xs uppercase text-cinza">
                <th className="py-1">Custo</th>
                <th className="py-1 text-right">Previsto</th>
                <th className="py-1 text-right">Realizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((l) => (
                <tr key={l.rotulo}>
                  <td className="py-1">{l.rotulo}</td>
                  <td className="py-1 text-right">{moeda(l.previsto)}</td>
                  <td className={cx('py-1 text-right', l.realizado > l.previsto && 'font-semibold text-vermelho')}>{moeda(l.realizado)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-1">Custo total</td>
                <td className="py-1 text-right">{moeda(r.custoOperacional)}</td>
                <td className="py-1 text-right">{moeda(real.custoReal)}</td>
              </tr>
              <tr>
                <td className="py-1">Receita</td>
                <td className="py-1 text-right">{moeda(r.valorFinal)}</td>
                <td className="py-1 text-right">{moeda(real.recebido)}</td>
              </tr>
              <tr className="font-bold">
                <td className="py-1">Lucro (markup)</td>
                <td className="py-1 text-right">
                  {moeda(r.valorFinal - r.custoOperacional)} ({percentual(r.markupEfetivo)})
                </td>
                <td className="py-1 text-right">
                  {EMOJI_SEMAFORO[real.semaforo]} {moeda(real.lucro)} {real.markup !== null && `(${percentual(real.markup)})`}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-cinza">Diárias realizadas = presenças marcadas na escala × diária do projeto.</p>
          <Formulario action={lancarDespesaObraAcao.bind(null, orc.id)} className="grid grid-cols-2 gap-2 border-t border-borda pt-3">
            <Selecao rotulo="Categoria" name="categoria" defaultValue="transporte">
              {Object.entries(CATEGORIAS_DESPESA)
                .filter(([v]) => v !== 'geral')
                .map(([v, rot]) => (
                  <option key={v} value={v}>
                    {rot}
                  </option>
                ))}
            </Selecao>
            <Campo rotulo="Valor (R$)" name="valor" inputMode="decimal" required />
            <Campo rotulo="Descrição" name="descricao" placeholder="Uber, marmitas, andaime…" required />
            <Campo rotulo="Data" name="data" type="date" defaultValue={hoje} required />
            <Botao type="submit" variante="secundario" className="col-span-2">
              Lançar despesa
            </Botao>
          </Formulario>
        </div>
      </div>
    </Cartao>
  );
}
