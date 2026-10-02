import { asc, eq } from 'drizzle-orm';
import { Formulario } from '@/components/formulario';
import { Botao, BotaoLink, Cabecalho, Caixa, Campo, Cartao, Selecao, Selo, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { NOMES_DIA_SEMANA, referenciaMes } from '@/fatura';
import { hojeSP } from '@/lib/agenda';
import { exigirOperador } from '@/lib/auth';
import { listarContratos } from '@/lib/contratos';
import { dataCurta, linkWhatsApp, moeda, percentual } from '@/lib/formato';
import { mensagemFatura } from '@/lib/mensagens';
import { urlBase } from '@/lib/url';
import { gerarFaturaAcao, salvarContratoAcao } from './actions';

export const metadata = { title: 'Contratos' };

type Contrato = typeof schema.contratos.$inferSelect;
const DIAS = [1, 2, 3, 4, 5, 6, 0];
const dataBR = (d: string) => dataCurta(`${d}T12:00:00`);

function FormContrato({ c, obras }: { c?: Contrato; obras: { id: string; nome: string; clienteNome: string }[] }) {
  return (
    <Formulario action={salvarContratoAcao.bind(null, c?.id ?? null)} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Selecao rotulo="Obra · cliente" name="obraId" defaultValue={c?.obraId ?? ''} required className="col-span-2">
        <option value="">— escolha —</option>
        {obras.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome} · {o.clienteNome}
          </option>
        ))}
      </Selecao>
      <Campo rotulo="Saudação na fatura" name="saudacao" defaultValue={c?.saudacao ?? ''} placeholder="Querida Katiane" className="col-span-2" />
      <fieldset className="col-span-2 sm:col-span-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-cinza">Dias da semana</legend>
        <div className="flex flex-wrap gap-3">
          {DIAS.map((d) => (
            <Caixa key={d} rotulo={NOMES_DIA_SEMANA[d]} name="diasSemana" value={d} defaultChecked={c?.diasSemana.includes(d)} />
          ))}
        </div>
      </fieldset>
      <Campo rotulo="Diária Pix (R$)" name="diariaBase" inputMode="decimal" defaultValue={c ? Number(c.diariaBase) : 180} required />
      <Campo rotulo="Desconto antecipação (%)" name="descontoPercentual" inputMode="decimal" defaultValue={c ? Number(c.descontoAntecipacao) * 100 : 10} />
      <Campo rotulo="Diária em espécie (R$)" name="diariaEspecie" inputMode="decimal" defaultValue={c ? (c.diariaEspecie === null ? '' : Number(c.diariaEspecie)) : 160} />
      <Campo rotulo="Prazo (dias)" name="prazoDias" type="number" min={0} defaultValue={c?.prazoDias ?? 7} />
      <div className="col-span-2 flex flex-wrap items-center gap-4 sm:col-span-4">
        {c && <Caixa rotulo="Ativo" name="ativo" defaultChecked={c.ativo} />}
        <Botao type="submit" variante={c ? 'secundario' : 'primario'} className="ml-auto">
          {c ? 'Salvar contrato' : 'Cadastrar contrato'}
        </Botao>
      </div>
    </Formulario>
  );
}

export default async function Contratos() {
  const sessao = await exigirOperador();
  const [contratos, obras, base] = await Promise.all([
    listarContratos(sessao.empresaId),
    db
      .select({ id: schema.obras.id, nome: schema.obras.nome, clienteNome: schema.clientes.nome })
      .from(schema.obras)
      .innerJoin(schema.clientes, eq(schema.clientes.id, schema.obras.clienteId))
      .where(eq(schema.obras.empresaId, sessao.empresaId))
      .orderBy(asc(schema.clientes.nome), asc(schema.obras.nome)),
    urlBase(),
  ]);
  const mesAtual = hojeSP().slice(0, 7);

  return (
    <>
      <Cabecalho titulo="Contratos recorrentes" subtitulo="Diárias em dias fixos da semana e fatura mensal (modelo Katiane)" />
      <div className="space-y-4">
        {contratos.length === 0 && <Vazio>Nenhum contrato recorrente ainda.</Vazio>}
        {contratos.map(({ contrato: c, clienteNome, clienteTelefone, obraNome, faturas }) => (
          <Cartao
            key={c.id}
            titulo={
              <span className="flex flex-wrap items-center gap-2">
                {clienteNome} <span className="text-sm font-normal text-cinza">· {obraNome}</span>
                {!c.ativo && <Selo>Inativo</Selo>}
              </span>
            }
            acoes={
              <span className="text-sm text-cinza">
                {c.diasSemana.map((d) => NOMES_DIA_SEMANA[d].slice(0, 3)).join(', ')} · {moeda(c.diariaBase)}
                {Number(c.descontoAntecipacao) > 0 && ` −${percentual(Number(c.descontoAntecipacao))} Pix`}
                {c.diariaEspecie && ` · ${moeda(c.diariaEspecie)} espécie`}
              </span>
            }
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]" data-contrato={obraNome}>
              <div className="space-y-4">
                <ul className="divide-y divide-slate-100 text-sm">
                  {faturas.length === 0 && <li className="py-2 text-cinza">Nenhuma fatura gerada.</li>}
                  {faturas.map(({ fatura: f, cobrancaStatus }) => {
                    const link = `${base}/f/${f.tokenPublico}`;
                    const msg = mensagemFatura({
                      clienteNome,
                      saudacao: c.saudacao,
                      numero: f.numero,
                      referencia: referenciaMes(f.ano, f.mes),
                      valorPix: f.calculo.pix.total,
                      valorEspecie: f.calculo.especie?.total,
                      vencimento: dataBR(f.vencimento),
                      link,
                    });
                    return (
                      <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2" data-fatura={f.numero}>
                        <div>
                          <p className="font-semibold">
                            {f.numero} · {referenciaMes(f.ano, f.mes)}
                          </p>
                          <p className="text-xs text-cinza">
                            {f.calculo.diariasFaturadas} diária(s) ({f.faltas} falta(s)) · Pix {moeda(f.calculo.pix.total)}
                            {f.calculo.especie && ` · espécie ${moeda(f.calculo.especie.total)}`} · vence {dataBR(f.vencimento)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {cobrancaStatus === 'paga' ? <Selo cor="verde">Paga</Selo> : <Selo cor="azul">Em aberto</Selo>}
                          <BotaoLink href={`/api/faturas/${f.id}`} target="_blank" variante="secundario" className="px-3 py-1">
                            PDF
                          </BotaoLink>
                          <BotaoLink href={linkWhatsApp(clienteTelefone, msg)} target="_blank" variante="sucesso" className="px-3 py-1">
                            WhatsApp
                          </BotaoLink>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-azul">Editar contrato</summary>
                  <div className="mt-3">
                    <FormContrato c={c} obras={obras} />
                  </div>
                </details>
              </div>
              <Formulario action={gerarFaturaAcao.bind(null, c.id)} className="space-y-2 rounded-lg border border-borda p-3">
                <h3 className="text-sm font-bold">Gerar fatura</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Campo rotulo="Mês" name="mes" type="month" defaultValue={mesAtual} required />
                  <Campo rotulo="Faltas da equipe" name="faltas" type="number" min={0} defaultValue={0} />
                </div>
                <p className="text-xs text-cinza">Feriados (bloqueios da empresa toda na agenda) saem automaticamente. Gerar de novo no mesmo mês recalcula a fatura.</p>
                <Botao type="submit" className="w-full">
                  Gerar fatura
                </Botao>
              </Formulario>
            </div>
          </Cartao>
        ))}
        <Cartao titulo="Novo contrato">
          <FormContrato obras={obras} />
        </Cartao>
      </div>
    </>
  );
}
