import Link from 'next/link';
import { StatusOrcamento } from '@/components/status-orcamento';
import { BotaoLink, Cabecalho, Cartao, Vazio } from '@/components/ui';
import { exigirOperador } from '@/lib/auth';
import { listarOrcamentos } from '@/lib/consultas';
import { dataCurta, moeda, percentual } from '@/lib/formato';

export const metadata = { title: 'Painel' };

export default async function Painel() {
  const sessao = await exigirOperador();
  const todos = await listarOrcamentos(sessao.empresaId);

  const agora = new Date();
  const doMes = (d: Date | null) => d && d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
  const cobrar = todos.filter((o) => o.situacao.tipo !== 'ok');
  const emAberto = todos.filter((o) => o.status === 'enviado');
  const aprovadosMes = todos.filter((o) => o.status === 'aprovado' && doMes(o.aprovadoEm));
  const enviadosMes = todos.filter((o) => o.enviadoEm && doMes(o.enviadoEm));
  const conversao = enviadosMes.length ? enviadosMes.filter((o) => o.status === 'aprovado').length / enviadosMes.length : 0;

  const indicadores = [
    { rotulo: 'Aprovado no mês', valor: moeda(aprovadosMes.reduce((s, o) => s + o.valorFinal, 0)), detalhe: `${aprovadosMes.length} orçamento(s)` },
    { rotulo: 'Em negociação', valor: moeda(emAberto.reduce((s, o) => s + o.valorFinal, 0)), detalhe: `${emAberto.length} enviado(s)` },
    { rotulo: 'Conversão do mês', valor: percentual(conversao), detalhe: `${enviadosMes.length} enviado(s) no mês` },
    { rotulo: 'Para cobrar hoje', valor: String(cobrar.length), detalhe: 'follow-ups e expirados' },
  ];

  return (
    <>
      <Cabecalho
        titulo={`Olá, ${sessao.nome}!`}
        subtitulo="Resumo comercial da Lubian Limpezas"
        acoes={<BotaoLink href="/orcamentos/novo">+ Novo orçamento</BotaoLink>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map((i) => (
          <div key={i.rotulo} className="rounded-xl border border-borda bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-cinza">{i.rotulo}</p>
            <p className="mt-1 text-xl font-extrabold text-azul sm:text-2xl">{i.valor}</p>
            <p className="text-xs text-cinza">{i.detalhe}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="Para cobrar hoje">
          {cobrar.length === 0 ? (
            <Vazio>Nenhum follow-up pendente. 👏</Vazio>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cobrar.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/orcamentos/${o.id}`} className="font-semibold text-azul hover:underline">
                      {o.clienteNome}
                    </Link>
                    <p className="truncate text-xs text-cinza">
                      {o.numero} · {o.obraNome} · enviado {dataCurta(o.enviadoEm)}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusOrcamento status={o.status} situacao={o.situacao} />
                    <p className="mt-1 text-sm font-bold">{moeda(o.valorFinal)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Últimos orçamentos" acoes={<BotaoLink href="/orcamentos" variante="fantasma">Ver todos</BotaoLink>}>
          {todos.length === 0 ? (
            <Vazio>Nenhum orçamento ainda.</Vazio>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todos.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/orcamentos/${o.id}`} className="font-semibold text-azul hover:underline">
                      {o.numero} · {o.clienteNome}
                    </Link>
                    <p className="truncate text-xs text-cinza">{o.obraNome}</p>
                  </div>
                  <div className="text-right">
                    <StatusOrcamento status={o.status} situacao={o.situacao} />
                    <p className="mt-1 text-sm font-bold">{moeda(o.valorFinal)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  );
}
