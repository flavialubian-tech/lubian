import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { Formulario } from '@/components/formulario';
import { SeletorDatas } from '@/components/seletor-datas';
import { Botao, Campo, Cartao, Selecao, Selo } from '@/components/ui';
import { db, schema } from '@/db';
import { cobrarSinal, conflitos, diaMes, hojeSP, mapearForcaTarefa, nomeDia } from '@/lib/agenda';
import { dataCurta, dataHora, moeda } from '@/lib/formato';
import { FORMAS_PAGAMENTO, listarAlocacoes, listarBloqueios, sinalDoOrcamento } from '@/lib/operacao';
import { entregueAcao, liberarPreReservaAcao, reagendarAcao, registrarSinalAcao } from '../actions';
import { BotaoAcao } from './acoes-cliente';

type Orcamento = typeof schema.orcamentos.$inferSelect;

export const SELO_ALOCACAO = {
  pre_reserva: <Selo cor="amarelo">Pré-reserva</Selo>,
  confirmada: <Selo cor="verde">Confirmada</Selo>,
  concluida: <Selo cor="azul">Concluída</Selo>,
  cancelada: <Selo>Liberada</Selo>,
};

/** Agenda, sinal e entrega de um orçamento aprovado (D3). */
export async function CartaoOperacao({ orc }: { orc: Orcamento }) {
  const datas = orc.datasPrevistas;
  const [sinal, minhas, membros, todasAlocacoes] = await Promise.all([
    sinalDoOrcamento(orc.id),
    db.query.alocacoes.findMany({ where: eq(schema.alocacoes.orcamentoId, orc.id) }),
    db.query.equipe.findMany({ where: and(eq(schema.equipe.empresaId, orc.empresaId), eq(schema.equipe.ativo, true)) }),
    datas.length ? listarAlocacoes(orc.empresaId, datas[0], datas.at(-1)!) : Promise.resolve([]),
  ]);
  const bloqueios = datas.length ? await listarBloqueios(orc.empresaId, datas[0], datas.at(-1)!) : [];
  const nome = new Map(membros.map((m) => [m.id, m.nome]));
  const { naoEncontrados } = mapearForcaTarefa(
    orc.precificacao.equipe.map((m) => m.nome),
    membros,
  );
  const ativas = minhas.filter((a) => a.status !== 'cancelada');
  const avisos = conflitos(
    todasAlocacoes,
    ativas.map((a) => ({ ...a, orcamentoId: orc.id })),
    bloqueios,
  );
  const outros = new Map(todasAlocacoes.map((a) => [a.orcamentoId, `${a.numero} · ${a.obraNome}`]));
  const status = orc.entregueEm ? 'concluida' : ativas.length === 0 ? (minhas.length ? 'cancelada' : null) : sinal ? 'confirmada' : 'pre_reserva';
  const r = orc.resultado;

  return (
    <Cartao titulo="Agenda, sinal e entrega" className="mb-6" acoes={status && SELO_ALOCACAO[status]}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 text-sm">
          <h3 className="font-bold">Escala</h3>
          {datas.length === 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">Sem datas previstas: escolha as datas abaixo para montar a agenda.</p>}
          {naoEncontrados.length > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
              Sem cadastro na equipe (fora da agenda): {naoEncontrados.join(', ')}.
            </p>
          )}
          <ul className="space-y-1">
            {datas.map((d) => (
              <li key={d}>
                <strong>
                  {nomeDia(d)} {diaMes(d)}
                </strong>
                :{' '}
                {ativas
                  .filter((a) => a.data === d)
                  .map((a) => nome.get(a.membroEquipeId) ?? '?')
                  .join(', ') || <span className="text-cinza">ninguém escalado</span>}
              </li>
            ))}
          </ul>
          {avisos.map((c, i) => (
            <p key={i} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-vermelho">
              ⚠️ Conflito: {nome.get(c.membroEquipeId)} em {diaMes(c.data)} —{' '}
              {c.tipo === 'bloqueio' ? (
                `bloqueio: ${c.motivo}`
              ) : (
                <Link href={`/orcamentos/${c.orcamentoId}`} className="underline">
                  {outros.get(c.orcamentoId) ?? 'outra obra'}
                </Link>
              )}
            </p>
          ))}
          {datas.length > 0 && (
            <Link href={`/agenda?data=${datas[0]}`} className="inline-block font-semibold text-azul hover:underline">
              Ver na agenda →
            </Link>
          )}
          {!orc.entregueEm && (
            <Formulario action={reagendarAcao.bind(null, orc.id)} className="space-y-2 border-t border-borda pt-3">
              <SeletorDatas datas={datas} name="datas" rotulo="Alterar datas" />
              <Botao type="submit" variante="secundario" className="w-full">
                Salvar datas
              </Botao>
            </Formulario>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <h3 className="font-bold">Sinal de 50%</h3>
          {sinal ? (
            <div className="space-y-1">
              <p className="font-semibold text-verde">
                ✓ Sinal pago: {moeda(sinal.valor)} · {FORMAS_PAGAMENTO[sinal.forma]} · {dataCurta(`${sinal.pagoEm}T12:00:00`)}
              </p>
              {sinal.comprovante && (
                <a href={`/api/comprovantes/${sinal.id}`} target="_blank" className="font-semibold text-azul hover:underline">
                  Ver comprovante
                </a>
              )}
            </div>
          ) : (
            <>
              {cobrarSinal({ aprovadoEm: orc.aprovadoEm, sinalPago: false, entregue: !!orc.entregueEm }) && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-800">Pré-reserva sem sinal há mais de 2 dias: cobrar o cliente.</p>
              )}
              <Formulario action={registrarSinalAcao.bind(null, orc.id)} className="grid grid-cols-2 gap-2">
                <Campo rotulo="Valor (R$)" name="valor" inputMode="decimal" defaultValue={r.sinal.toFixed(2).replace('.', ',')} required />
                <Selecao rotulo="Forma" name="forma" defaultValue="pix">
                  {Object.entries(FORMAS_PAGAMENTO).map(([v, rot]) => (
                    <option key={v} value={v}>
                      {rot}
                    </option>
                  ))}
                </Selecao>
                <Campo rotulo="Pago em" name="pagoEm" type="date" defaultValue={hojeSP()} required />
                <Campo rotulo="Comprovante" name="comprovante" type="file" accept="image/*,application/pdf" className="[&_input]:py-1.5" />
                <Botao type="submit" variante="sucesso" className="col-span-2">
                  Registrar sinal pago
                </Botao>
              </Formulario>
              {ativas.length > 0 && (
                <BotaoAcao
                  acao={liberarPreReservaAcao.bind(null, orc.id)}
                  rotulo="Liberar pré-reserva"
                  variante="perigo"
                  confirmar="Liberar a equipe destas datas? O cliente perde a reserva."
                />
              )}
            </>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <h3 className="font-bold">Entrega</h3>
          {orc.entregueEm ? (
            <p className="font-semibold text-verde">✓ Serviço entregue em {dataHora(orc.entregueEm)}. Quitação liberada ({moeda(r.saldo)}).</p>
          ) : (
            <>
              <p className="text-cinza">Ao terminar a obra, marque a entrega: a escala fica concluída e libera a cobrança da quitação ({moeda(r.saldo)}).</p>
              <BotaoAcao acao={entregueAcao.bind(null, orc.id)} rotulo="Serviço entregue" variante="primario" confirmar="Confirmar a entrega do serviço?" />
            </>
          )}
        </div>
      </div>
    </Cartao>
  );
}
