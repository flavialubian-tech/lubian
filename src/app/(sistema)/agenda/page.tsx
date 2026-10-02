import { and, asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { Formulario } from '@/components/formulario';
import { Botao, BotaoLink, Cabecalho, Campo, Cartao, Selecao, cx } from '@/components/ui';
import { db, schema } from '@/db';
import { conflitosNaAgenda, diaMes, ehData, hojeSP, inicioSemana, intervalo, nomeDia, semanasDoMes, somarDias } from '@/lib/agenda';
import { exigirOperador } from '@/lib/auth';
import { listarAlocacoes, listarBloqueios, type AlocacaoAgenda } from '@/lib/operacao';
import { criarBloqueioAcao, removerBloqueioAcao } from './actions';

export const metadata = { title: 'Agenda' };

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ROTULO_STATUS = { pre_reserva: 'pré-reserva', confirmada: 'confirmada', concluida: 'concluída', cancelada: 'liberada' };

/** Cor do profissional; pré-reserva tracejada, confirmada sólida, concluída esmaecida. */
function Chip({ a, conflito, compacto }: { a: AlocacaoAgenda; conflito?: string; compacto?: boolean }) {
  const solido = a.status !== 'pre_reserva';
  return (
    <Link
      href={`/orcamentos/${a.orcamentoId}`}
      data-status={a.status}
      title={`${a.membroNome} · ${a.obraNome} (${a.clienteNome}) — ${ROTULO_STATUS[a.status]}${conflito ? ` — CONFLITO: ${conflito}` : ''}`}
      className={cx(
        'block rounded-md border-2 px-1.5 py-0.5 text-xs font-semibold',
        compacto && 'truncate',
        solido ? 'text-white' : 'border-dashed bg-white',
        a.status === 'concluida' && 'opacity-60',
        conflito && 'ring-2 ring-vermelho ring-offset-1',
      )}
      style={{ borderColor: a.membroCor, ...(solido ? { backgroundColor: a.membroCor } : { color: a.membroCor }) }}
    >
      {conflito && '⚠️ '}
      {a.membroNome}
      {!compacto && <span className="font-normal"> · {a.obraNome}</span>}
    </Link>
  );
}

export default async function Agenda(props: PageProps<'/agenda'>) {
  const sessao = await exigirOperador();
  const q = (await props.searchParams) as { visao?: string; data?: string; membro?: string };
  const visao = q.visao === 'mes' ? 'mes' : 'semana';
  const hoje = hojeSP();
  const base = q.data && ehData(q.data) ? q.data : hoje;
  const membroId = q.membro || undefined;

  const semanas = visao === 'mes' ? semanasDoMes(base) : [intervalo(inicioSemana(base), 7)];
  const dias = semanas.flat();
  const [de, ate] = [dias[0], dias.at(-1)!];

  const [membros, alocacoes, bloqueios] = await Promise.all([
    db.query.equipe.findMany({ where: and(eq(schema.equipe.empresaId, sessao.empresaId), eq(schema.equipe.ativo, true)), orderBy: [asc(schema.equipe.nome)] }),
    listarAlocacoes(sessao.empresaId, de, ate, { membroEquipeId: membroId }),
    listarBloqueios(sessao.empresaId, de, ate, membroId),
  ]);
  const conflitos = conflitosNaAgenda(alocacoes, bloqueios);
  const descricaoConflito = (id: string) =>
    conflitos
      .get(id)
      ?.map((c) => (c.tipo === 'bloqueio' ? c.motivo : (alocacoes.find((a) => a.orcamentoId === c.orcamentoId)?.obraNome ?? 'outra obra')))
      .join(', ');
  const doDia = (d: string) => alocacoes.filter((a) => a.data === d);
  const bloqueiosDoDia = (d: string) => bloqueios.filter((b) => b.dataInicio <= d && d <= b.dataFim);
  const totalConflitos = conflitos.size;

  const anterior = visao === 'mes' ? mesVizinho(base, -1) : somarDias(base, -7);
  const proximo = visao === 'mes' ? mesVizinho(base, 1) : somarDias(base, 7);
  const url = (p: { visao?: string; data?: string }) => {
    const s = new URLSearchParams({ visao: p.visao ?? visao, data: p.data ?? base, ...(membroId ? { membro: membroId } : {}) });
    return `/agenda?${s}`;
  };
  const titulo =
    visao === 'mes'
      ? `${MESES[Number(base.slice(5, 7)) - 1]} de ${base.slice(0, 4)}`
      : `Semana de ${diaMes(de)} a ${diaMes(ate)}`;

  return (
    <>
      <Cabecalho
        titulo="Agenda"
        subtitulo={<span className="inline-block first-letter:uppercase">{titulo}</span>}
        acoes={
          <>
            <BotaoLink href={url({ data: anterior })} variante="secundario" aria-label="Anterior">
              ←
            </BotaoLink>
            <BotaoLink href={url({ data: hoje })} variante="secundario">
              Hoje
            </BotaoLink>
            <BotaoLink href={url({ data: proximo })} variante="secundario" aria-label="Próximo">
              →
            </BotaoLink>
            <BotaoLink href={url({ visao: 'semana' })} variante={visao === 'semana' ? 'primario' : 'secundario'}>
              Semana
            </BotaoLink>
            <BotaoLink href={url({ visao: 'mes' })} variante={visao === 'mes' ? 'primario' : 'secundario'}>
              Mês
            </BotaoLink>
          </>
        }
      />

      <form className="mb-4 flex flex-wrap items-end gap-2" action="/agenda">
        <input type="hidden" name="visao" value={visao} />
        <input type="hidden" name="data" value={base} />
        <Selecao name="membro" defaultValue={membroId ?? ''} rotulo="Profissional">
          <option value="">Todos</option>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </Selecao>
        <Botao type="submit" variante="secundario">
          Filtrar
        </Botao>
        <ul className="ml-auto flex flex-wrap items-center gap-3 text-xs">
          {membros.map((m) => (
            <li key={m.id} className="flex items-center gap-1">
              <span className="inline-block size-3 rounded-full" style={{ backgroundColor: m.cor }} />
              {m.nome}
            </li>
          ))}
          <li className="text-cinza">tracejado = pré-reserva · sólido = confirmada</li>
        </ul>
      </form>

      {totalConflitos > 0 && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-vermelho">
          ⚠️ {totalConflitos} escala(s) em conflito: profissional em duas obras no mesmo dia ou em dia bloqueado.
        </p>
      )}

      {/* Computador: grade da semana ou do mês */}
      <div data-grade className="hidden overflow-hidden rounded-xl border border-borda bg-white md:block">
        <div className="grid grid-cols-7 border-b border-borda bg-slate-50 text-xs font-semibold uppercase tracking-wide text-cinza">
          {semanas[0].map((d) => (
            <div key={d} className="px-2 py-2">
              {nomeDia(d).slice(0, 3)}
              {visao === 'semana' && <span className="ml-1 normal-case">{diaMes(d)}</span>}
            </div>
          ))}
        </div>
        {semanas.map((semana) => (
          <div key={semana[0]} className="grid grid-cols-7 divide-x divide-slate-100 border-b border-slate-100 last:border-b-0">
            {semana.map((d) => (
              <div
                key={d}
                data-dia={d}
                className={cx(
                  'space-y-1 p-1.5',
                  visao === 'semana' ? 'min-h-48' : 'min-h-24',
                  visao === 'mes' && d.slice(0, 7) !== base.slice(0, 7) && 'bg-slate-50/70 text-cinza',
                  d === hoje && 'bg-azul-claro/40',
                )}
              >
                {visao === 'mes' && <p className={cx('text-xs font-bold', d === hoje && 'text-azul')}>{Number(d.slice(8))}</p>}
                {bloqueiosDoDia(d).map((b) => (
                  <p key={b.id} className="truncate rounded-md bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700" title={b.motivo}>
                    🚫 {b.membroNome ?? 'Todos'}: {b.motivo}
                  </p>
                ))}
                {doDia(d).map((a) => (
                  <Chip key={a.id} a={a} conflito={descricaoConflito(a.id)} compacto={visao === 'mes'} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Celular: lista por dia */}
      <div className="space-y-3 md:hidden">
        {dias
          .filter((d) => visao === 'semana' || doDia(d).length || bloqueiosDoDia(d).length)
          .map((d) => (
            <section key={d} className={cx('rounded-xl border border-borda bg-white p-3', d === hoje && 'border-azul')}>
              <h3 className="mb-2 text-sm font-bold">
                {nomeDia(d)} {diaMes(d)}
              </h3>
              <div className="space-y-1">
                {bloqueiosDoDia(d).map((b) => (
                  <p key={b.id} className="rounded-md bg-slate-200 px-2 py-1 text-xs">
                    🚫 {b.membroNome ?? 'Todos'}: {b.motivo}
                  </p>
                ))}
                {doDia(d).map((a) => (
                  <Chip key={a.id} a={a} conflito={descricaoConflito(a.id)} />
                ))}
                {!doDia(d).length && !bloqueiosDoDia(d).length && <p className="text-xs text-cinza">Livre</p>}
              </div>
            </section>
          ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Cartao titulo="Novo bloqueio (folga, feriado, indisponibilidade)">
          <Formulario action={criarBloqueioAcao} className="grid grid-cols-2 gap-3">
            <Selecao rotulo="Quem" name="membroEquipeId" defaultValue={membroId ?? ''} className="col-span-2">
              <option value="">Empresa toda (feriado)</option>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Selecao>
            <Campo rotulo="De" name="dataInicio" type="date" defaultValue={base} required />
            <Campo rotulo="Até" name="dataFim" type="date" defaultValue={base} required />
            <Campo rotulo="Motivo" name="motivo" placeholder="Folga, feriado, médico…" required className="col-span-2" />
            <Botao type="submit" className="col-span-2">
              Criar bloqueio
            </Botao>
          </Formulario>
        </Cartao>
        <Cartao titulo="Bloqueios no período">
          {bloqueios.length === 0 ? (
            <p className="text-sm text-cinza">Nenhum bloqueio.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {bloqueios.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <strong>{b.membroNome ?? 'Empresa toda'}</strong> · {diaMes(b.dataInicio)}
                    {b.dataFim !== b.dataInicio && ` a ${diaMes(b.dataFim)}`} — {b.motivo}
                  </span>
                  <form action={removerBloqueioAcao.bind(null, b.id)}>
                    <button className="text-xs font-semibold text-vermelho hover:underline">Remover</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  );
}

function mesVizinho(d: string, delta: number) {
  const [a, m] = d.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1 + delta, 1));
  return t.toISOString().slice(0, 10);
}
