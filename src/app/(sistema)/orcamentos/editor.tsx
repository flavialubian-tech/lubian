'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { SeletorDatas } from '@/components/seletor-datas';
import { AreaTexto, Botao, Campo, Cartao, Rotulo, Selecao, cx } from '@/components/ui';
import type { ConteudoOrcamento } from '@/db/schema';
import { textoCronograma } from '@/lib/agenda';
import { moeda, percentual } from '@/lib/formato';
import type { SalvarOrcamentoInput } from '@/lib/orcamentos';
import { calcularOrcamento, distribuirValorTabela, MARKUP_MINIMO_PADRAO, type EntradaOrcamento } from '@/precificacao';
import { salvarOrcamentoAcao } from './actions';

export interface OpcoesEditor {
  obras: { id: string; nome: string; clienteId: string; clienteNome: string }[];
  servicos: { id: string; nome: string; exigeNr35: boolean }[];
  equipe: { id: string; nome: string; diaria: number; nr35: boolean }[];
}

export interface EstadoEditor {
  obraId: string;
  clienteId: string;
  servicoId: string | null;
  vistoriaId: string | null;
  validadeDias: number;
  datasPrevistas: string[];
  precificacao: EntradaOrcamento;
  conteudo: ConteudoOrcamento;
}

const linhas = (t: string) => t.split('\n');
const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Campo numérico que aceita vírgula e mantém o texto enquanto a pessoa digita. */
function CampoNumero({ rotulo, valor, aoMudar, sufixo, className }: { rotulo?: ReactNode; valor: number | undefined; aoMudar: (n: number) => void; sufixo?: string; className?: string }) {
  const [texto, setTexto] = useState(valor ? String(valor).replace('.', ',') : '');
  return (
    <div className={className}>
      {rotulo && <Rotulo>{rotulo}</Rotulo>}
      <div className="relative">
        <input
          inputMode="decimal"
          className="w-full rounded-lg border border-borda bg-white px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/15"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            aoMudar(num(e.target.value));
          }}
        />
        {sufixo && <span className="pointer-events-none absolute top-2 right-3 text-sm text-cinza">{sufixo}</span>}
      </div>
    </div>
  );
}

export function EditorOrcamento({ id, inicial, opcoes, somenteLeitura }: { id: string | null; inicial: EstadoEditor; opcoes: OpcoesEditor; somenteLeitura?: boolean }) {
  const router = useRouter();
  const [estado, setEstado] = useState(inicial);
  const [mensagem, setMensagem] = useState<{ erro?: string; ok?: string }>();
  const [salvando, iniciar] = useTransition();
  const { precificacao: p, conteudo: c } = estado;

  const set = (parcial: Partial<EstadoEditor>) => setEstado((e) => ({ ...e, ...parcial }));
  const setP = (parcial: Partial<EntradaOrcamento>) => setEstado((e) => ({ ...e, precificacao: { ...e.precificacao, ...parcial } }));
  const setC = (parcial: Partial<ConteudoOrcamento>) => setEstado((e) => ({ ...e, conteudo: { ...e.conteudo, ...parcial } }));

  const calculo = useMemo(() => {
    try {
      return { r: calcularOrcamento({ ...p, markupMinimo: MARKUP_MINIMO_PADRAO }) };
    } catch (e) {
      return { erro: (e as Error).message };
    }
  }, [p]);
  const r = calculo.r;

  const escopoValido = c.escopo.filter((i) => i.titulo.trim());
  const valoresEscopo = r && escopoValido.length ? distribuirValorTabela(r.valorTabela, escopoValido.map((i) => i.peso || 1)) : [];
  const servico = opcoes.servicos.find((s) => s.id === estado.servicoId);
  const semNr35 = servico?.exigeNr35
    ? p.equipe.filter((m) => !opcoes.equipe.find((e) => e.nome === m.nome)?.nr35).map((m) => m.nome)
    : [];

  function salvar() {
    setMensagem(undefined);
    const entrada: SalvarOrcamentoInput = { ...estado };
    iniciar(async () => {
      const res = await salvarOrcamentoAcao(id, entrada);
      if (res?.erro) return setMensagem({ erro: res.erro });
      if (!id && res?.id) return router.push(`/orcamentos/${res.id}`);
      setMensagem({ ok: 'Orçamento salvo ✓' });
      router.refresh();
    });
  }

  const custos: [keyof EntradaOrcamento['custosVariaveis'], string][] = [
    ['transporte', 'Uber / Transporte'],
    ['alimentacao', 'Alimentação / Marmitas'],
    ['produtosFretes', 'Produtos / Fretes'],
    ['locacao', 'Locação (andaimes, máquinas)'],
    ['outros', 'Outros'],
  ];

  return (
    <fieldset disabled={somenteLeitura || salvando} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <Cartao titulo="1. Cliente, obra e serviço">
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao
              rotulo="Obra"
              value={estado.obraId}
              className="sm:col-span-2"
              onChange={(e) => {
                const obra = opcoes.obras.find((o) => o.id === e.target.value);
                set({ obraId: e.target.value, clienteId: obra?.clienteId ?? '' });
                if (obra && !c.localTexto) setC({ localTexto: obra.nome });
              }}
            >
              <option value="">Escolha…</option>
              {opcoes.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.clienteNome} — {o.nome}
                </option>
              ))}
            </Selecao>
            <Selecao
              rotulo="Serviço"
              value={estado.servicoId ?? ''}
              onChange={(e) => {
                const s = opcoes.servicos.find((x) => x.id === e.target.value);
                set({ servicoId: e.target.value || null });
                if (s && !c.tipoServico) setC({ tipoServico: s.nome });
              }}
            >
              <option value="">—</option>
              {opcoes.servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Selecao>
            <CampoNumero rotulo="Validade (dias)" valor={estado.validadeDias} aoMudar={(n) => set({ validadeDias: Math.round(n) })} />
            <div className="sm:col-span-2">
              <SeletorDatas datas={estado.datasPrevistas} aoMudar={(datasPrevistas) => set({ datasPrevistas })} />
            </div>
          </div>
        </Cartao>

        <Cartao titulo="2. Força-Tarefa (diárias)">
          <div className="space-y-2">
            {p.equipe.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_70px_auto] items-end gap-2">
                <Selecao
                  rotulo={i === 0 ? 'Profissional' : undefined}
                  value={opcoes.equipe.find((e) => e.nome === m.nome)?.id ?? ''}
                  onChange={(e) => {
                    const membro = opcoes.equipe.find((x) => x.id === e.target.value);
                    if (!membro) return;
                    setP({ equipe: p.equipe.map((x, j) => (j === i ? { ...x, nome: membro.nome, diaria: membro.diaria } : x)) });
                  }}
                >
                  <option value="">{m.nome || 'Escolha…'}</option>
                  {opcoes.equipe.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome} ({moeda(e.diaria)})
                    </option>
                  ))}
                </Selecao>
                <CampoNumero
                  key={`d${i}-${m.nome}`}
                  rotulo={i === 0 ? 'Diária R$' : undefined}
                  valor={m.diaria}
                  aoMudar={(n) => setP({ equipe: p.equipe.map((x, j) => (j === i ? { ...x, diaria: n } : x)) })}
                />
                <CampoNumero rotulo={i === 0 ? 'Dias' : undefined} valor={m.dias} aoMudar={(n) => setP({ equipe: p.equipe.map((x, j) => (j === i ? { ...x, dias: n } : x)) })} />
                <button type="button" className="px-2 pb-2 text-cinza hover:text-vermelho" aria-label="Remover" onClick={() => setP({ equipe: p.equipe.filter((_, j) => j !== i) })}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-3 text-sm font-semibold text-azul" onClick={() => setP({ equipe: [...p.equipe, { nome: '', diaria: 0, dias: p.equipe[0]?.dias ?? 1 }] })}>
            + Profissional
          </button>
          {semNr35.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              ⚠️ Serviço em altura: {semNr35.join(', ')} sem habilitação NR-35 cadastrada.
            </p>
          )}
        </Cartao>

        <Cartao titulo="3. Custos variáveis da obra">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {custos.map(([chave, rotulo]) => (
              <CampoNumero key={chave} rotulo={rotulo} valor={p.custosVariaveis[chave]} aoMudar={(n) => setP({ custosVariaveis: { ...p.custosVariaveis, [chave]: n } })} />
            ))}
          </div>
        </Cartao>

        <Cartao titulo="4. Markup e ancoragem">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Rotulo>Markup sobre o custo: {Math.round(p.markup * 100)}%</Rotulo>
              <input type="range" min={0.3} max={0.45} step={0.01} value={p.markup} onChange={(e) => setP({ markup: Number(e.target.value) })} className="w-full accent-azul" />
              <div className="flex justify-between text-xs text-cinza">
                <span>30%</span>
                <span>45%</span>
              </div>
            </div>
            <Selecao
              rotulo="Arredondar valor final"
              value={p.arredondamento ? `${p.arredondamento.modo}-${p.arredondamento.passo}` : ''}
              onChange={(e) => {
                const [modo, passo] = e.target.value.split('-');
                setP({ arredondamento: e.target.value ? { modo: modo as 'baixo' | 'proximo' | 'cima', passo: Number(passo) } : undefined });
              }}
            >
              <option value="">Não arredondar (centavos)</option>
              <option value="baixo-1">Real inteiro, para baixo</option>
              <option value="proximo-5">Múltiplo de R$ 5</option>
              <option value="proximo-10">Múltiplo de R$ 10</option>
            </Selecao>
            <Selecao
              rotulo="Ancoragem (Valor de Tabela)"
              value={p.ancoragem.tipo}
              onChange={(e) => {
                const tipo = e.target.value as EntradaOrcamento['ancoragem']['tipo'];
                setP({
                  ancoragem:
                    tipo === 'nenhuma'
                      ? { tipo }
                      : tipo === 'desconto_percentual'
                        ? { tipo, percentual: 0.15 }
                        : tipo === 'desconto_valor'
                          ? { tipo, valor: 500 }
                          : { tipo, valor: Math.ceil(((r?.valorFinal ?? 0) * 1.25) / 10) * 10 },
                });
              }}
            >
              <option value="desconto_valor">Desconto fixo em R$ (parceria)</option>
              <option value="desconto_percentual">Desconto em %</option>
              <option value="valor_tabela">Digitar o Valor de Tabela</option>
              <option value="nenhuma">Sem desconto</option>
            </Selecao>
            {p.ancoragem.tipo === 'desconto_valor' && (
              <CampoNumero key="dv" rotulo="Desconto (R$)" valor={p.ancoragem.valor} aoMudar={(n) => setP({ ancoragem: { tipo: 'desconto_valor', valor: n } })} />
            )}
            {p.ancoragem.tipo === 'desconto_percentual' && (
              <CampoNumero
                key="dp"
                rotulo="Desconto (%)"
                sufixo="%"
                valor={Math.round(p.ancoragem.percentual * 1000) / 10}
                aoMudar={(n) => setP({ ancoragem: { tipo: 'desconto_percentual', percentual: Math.min(n, 90) / 100 } })}
              />
            )}
            {p.ancoragem.tipo === 'valor_tabela' && (
              <CampoNumero key="vt" rotulo="Valor de Tabela (R$)" valor={p.ancoragem.valor} aoMudar={(n) => setP({ ancoragem: { tipo: 'valor_tabela', valor: n } })} />
            )}
            <Campo rotulo="Nome do desconto no PDF" value={c.rotuloDesconto} onChange={(e) => setC({ rotuloDesconto: e.target.value })} />
          </div>
        </Cartao>

        <Cartao titulo="5. Apresentação técnica (o que vai no PDF)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Tipo de serviço" value={c.tipoServico} onChange={(e) => setC({ tipoServico: e.target.value })} />
            <Campo rotulo="Cronograma" value={c.cronograma} onChange={(e) => setC({ cronograma: e.target.value })} placeholder={textoCronograma(estado.datasPrevistas) || '02 Dias (Sábado e Domingo)'} />
            <Campo rotulo="Local" value={c.localTexto} onChange={(e) => setC({ localTexto: e.target.value })} />
            <Campo rotulo="Área de intervenção" value={c.areaTexto} onChange={(e) => setC({ areaTexto: e.target.value })} placeholder="140 m²" />
            <Campo rotulo="Equipe" value={c.equipeTexto} onChange={(e) => setC({ equipeTexto: e.target.value })} />
            <Campo rotulo="Descrição do subtotal" value={c.descricaoSubtotal} onChange={(e) => setC({ descricaoSubtotal: e.target.value })} />
            <Campo rotulo="Título das informações do imóvel" className="sm:col-span-2" value={c.informacoes.titulo} onChange={(e) => setC({ informacoes: { ...c.informacoes, titulo: e.target.value } })} />
            <AreaTexto
              rotulo="Informações do imóvel (uma por linha)"
              className="sm:col-span-2"
              rows={4}
              value={c.informacoes.itens.join('\n')}
              onChange={(e) => setC({ informacoes: { ...c.informacoes, itens: linhas(e.target.value) } })}
            />
          </div>

          <div className="mt-6 rounded-lg border border-red-100 bg-red-50/40 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-red-900">
              <input type="checkbox" className="accent-vermelho" checked={!!c.parecer} onChange={(e) => setC({ parecer: e.target.checked ? { titulo: 'Parecer Técnico: ', texto: '' } : null })} />
              Incluir Parecer Técnico (alerta de superfícies sensíveis)
            </label>
            {c.parecer && (
              <div className="mt-3 space-y-3">
                <Campo value={c.parecer.titulo} onChange={(e) => setC({ parecer: { ...c.parecer!, titulo: e.target.value } })} />
                <AreaTexto rows={3} value={c.parecer.texto} onChange={(e) => setC({ parecer: { ...c.parecer!, texto: e.target.value } })} />
              </div>
            )}
          </div>

          <h3 className="mt-6 mb-2 text-sm font-bold text-azul">Escopo técnico itemizado</h3>
          <p className="mb-3 text-xs text-cinza">O Valor de Tabela é dividido entre os itens conforme o peso (múltiplos de R$ 5).</p>
          <div className="space-y-3">
            {c.escopo.map((item, i) => {
              const idx = escopoValido.indexOf(item);
              const setItem = (parcial: Partial<typeof item>) => setC({ escopo: c.escopo.map((x, j) => (j === i ? { ...x, ...parcial } : x)) });
              return (
                <div key={i} className="rounded-lg border-l-4 border-azul bg-slate-50 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_80px_auto]">
                    <Campo placeholder={`Item ${i + 1}: título`} value={item.titulo} onChange={(e) => setItem({ titulo: e.target.value })} />
                    <CampoNumero valor={item.peso} aoMudar={(n) => setItem({ peso: n })} sufixo="peso" />
                    <span className="self-center text-right text-sm font-bold text-azul">{idx >= 0 && valoresEscopo[idx] !== undefined ? moeda(valoresEscopo[idx]) : '—'}</span>
                  </div>
                  <Campo className="mt-2" placeholder="Subtítulo (ex.: Foco Principal da Vistoria)" value={item.meta} onChange={(e) => setItem({ meta: e.target.value })} />
                  <AreaTexto className="mt-2" rows={2} placeholder="Atividades (uma por linha)" value={item.itens.join('\n')} onChange={(e) => setItem({ itens: linhas(e.target.value) })} />
                  <button type="button" className="mt-1 text-xs text-vermelho hover:underline" onClick={() => setC({ escopo: c.escopo.filter((_, j) => j !== i) })}>
                    Remover item
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" className="mt-3 text-sm font-semibold text-azul" onClick={() => setC({ escopo: [...c.escopo, { titulo: '', meta: '', itens: [''], peso: 1 }] })}>
            + Item de escopo
          </button>

          <details className="mt-6 rounded-lg border border-borda p-3">
            <summary className="cursor-pointer text-sm font-semibold text-azul">Textos padrão (investimento, incluídos, responsabilidades)</summary>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!c.valorAgregado} onChange={(e) => setC({ valorAgregado: e.target.checked ? { titulo: 'Entendendo o seu Investimento (Proteção do Projeto)', texto: '' } : null })} />
                Incluir bloco &quot;Entendendo o seu Investimento&quot;
              </label>
              {c.valorAgregado && (
                <>
                  <Campo value={c.valorAgregado.titulo} onChange={(e) => setC({ valorAgregado: { ...c.valorAgregado!, titulo: e.target.value } })} />
                  <AreaTexto rows={4} value={c.valorAgregado.texto} onChange={(e) => setC({ valorAgregado: { ...c.valorAgregado!, texto: e.target.value } })} />
                </>
              )}
              {(['incluidos', 'responsabilidades'] as const).map((chave) => (
                <div key={chave}>
                  <Rotulo>{chave === 'incluidos' ? 'Estão incluídos neste orçamento' : 'Responsabilidade do contratante'}</Rotulo>
                  {c[chave].map((it, i) => (
                    <div key={i} className="mb-2 grid grid-cols-[160px_1fr_auto] gap-2">
                      <Campo value={it.rotulo} onChange={(e) => setC({ [chave]: c[chave].map((x, j) => (j === i ? { ...x, rotulo: e.target.value } : x)) })} />
                      <Campo value={it.texto} onChange={(e) => setC({ [chave]: c[chave].map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
                      <button type="button" className="px-2 text-cinza hover:text-vermelho" onClick={() => setC({ [chave]: c[chave].filter((_, j) => j !== i) })}>
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className="text-xs font-semibold text-azul" onClick={() => setC({ [chave]: [...c[chave], { rotulo: '', texto: '' }] })}>
                    + Linha
                  </button>
                </div>
              ))}
            </div>
          </details>
        </Cartao>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Cartao titulo="Resumo financeiro">
          {calculo.erro || !r ? (
            <p className="text-sm text-vermelho">{calculo.erro ?? 'Preencha a força-tarefa'}</p>
          ) : (
            <dl className="space-y-1.5 text-sm">
              <Linha rotulo="Força-Tarefa" valor={moeda(r.forcaTarefa)} />
              <Linha rotulo="Custos variáveis" valor={moeda(r.custosVariaveis)} />
              <Linha rotulo="Custo operacional" valor={moeda(r.custoOperacional)} forte />
              <Linha rotulo={`Markup efetivo`} valor={percentual(r.markupEfetivo)} destaque={r.abaixoDoMinimo ? 'vermelho' : 'verde'} />
              <div className="my-2 border-t border-borda" />
              <Linha rotulo="Valor de Tabela" valor={moeda(r.valorTabela)} />
              <Linha rotulo={`${c.rotuloDesconto || 'Desconto'} (${Math.round(r.descontoPercentual * 100)}%)`} valor={`− ${moeda(r.desconto)}`} destaque="verde" />
              <div className="flex items-baseline justify-between pt-1">
                <dt className="font-extrabold text-azul">VALOR FINAL</dt>
                <dd className="text-xl font-black text-azul">{moeda(r.valorFinal)}</dd>
              </div>
              <Linha rotulo="Sinal 50% (reserva)" valor={moeda(r.sinal)} />
              <Linha rotulo="Saldo 50% (entrega)" valor={moeda(r.saldo)} />
              <Linha rotulo="Lucro previsto" valor={moeda(r.valorFinal - r.custoOperacional)} forte />
            </dl>
          )}
          {r?.abaixoDoMinimo && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-vermelho">
              Markup abaixo de 30%: dá para salvar, mas o envio ao cliente exige liberação da Gestão.
            </p>
          )}
          {!somenteLeitura && (
            <div className="mt-4 space-y-2">
              {mensagem?.erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-vermelho">{mensagem.erro}</p>}
              {mensagem?.ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-verde">{mensagem.ok}</p>}
              <Botao type="button" className="w-full" onClick={salvar} disabled={!estado.obraId || !r}>
                {salvando ? 'Salvando…' : id ? 'Salvar alterações' : 'Criar orçamento'}
              </Botao>
            </div>
          )}
        </Cartao>
      </aside>
    </fieldset>
  );
}

function Linha({ rotulo, valor, forte, destaque }: { rotulo: string; valor: string; forte?: boolean; destaque?: 'verde' | 'vermelho' }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-cinza">{rotulo}</dt>
      <dd className={cx('whitespace-nowrap', forte && 'font-bold', destaque === 'verde' && 'font-semibold text-verde', destaque === 'vermelho' && 'font-bold text-vermelho')}>{valor}</dd>
    </div>
  );
}
