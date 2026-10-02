import Image from 'next/image';
import Link from 'next/link';
import { Selo } from '@/components/ui';
import { diaMes, hojeSP, intervalo, nomeDia } from '@/lib/agenda';
import { exigirSessao } from '@/lib/auth';
import { listarAlocacoes } from '@/lib/operacao';
import { podeOperar } from '@/lib/permissoes';
import logo from '../../../assets/logo-lubian.png';
import { sair } from '../login/actions';
import { BotoesPresenca } from './presenca';

export const metadata = { title: 'Minha semana' };

const STATUS = {
  pre_reserva: <Selo cor="amarelo">Pré-reserva (aguardando sinal)</Selo>,
  confirmada: <Selo cor="verde">Confirmada</Selo>,
  concluida: <Selo cor="azul">Concluída</Selo>,
  cancelada: <Selo>Cancelada</Selo>,
};
const PRESENCA = { presente: <Selo cor="verde">Presente</Selo>, falta: <Selo cor="vermelho">Falta</Selo> };

const linkMaps = (endereco: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

export default async function MinhaSemana() {
  const sessao = await exigirSessao();
  const hoje = hojeSP();
  const dias = intervalo(hoje, 7);
  const membroId = sessao.membroEquipeId;
  const todas = membroId ? await listarAlocacoes(sessao.empresaId, dias[0], dias[6]) : [];
  const minhas = todas.filter((a) => a.membroEquipeId === membroId);
  const ehLider = sessao.perfil === 'lider' || podeOperar(sessao.perfil);

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <header className="mb-6 flex items-center gap-3">
        <Image src={logo} alt="Lubian Limpezas" width={48} height={48} />
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-azul">Olá, {sessao.nome}!</h1>
          <p className="text-sm text-cinza">Sua escala dos próximos 7 dias</p>
        </div>
        {podeOperar(sessao.perfil) && (
          <Link href="/" className="text-sm font-semibold text-azul hover:underline">
            Sistema
          </Link>
        )}
      </header>

      {!membroId ? (
        <p className="rounded-lg border border-dashed border-borda p-6 text-center text-sm text-cinza">
          Seu usuário ainda não está ligado a um profissional da equipe. Fale com a Gestão.
        </p>
      ) : (
        <ol className="space-y-3">
          {dias.map((d) => {
            const doDia = minhas.filter((a) => a.data === d);
            return (
              <li key={d} className={`rounded-xl border bg-white p-4 shadow-sm ${d === hoje ? 'border-azul' : 'border-borda'}`}>
                <h2 className="text-sm font-bold">
                  {d === hoje ? 'Hoje · ' : ''}
                  {nomeDia(d)} {diaMes(d)}
                </h2>
                {doDia.length === 0 && <p className="mt-1 text-sm text-cinza">Sem obra escalada.</p>}
                {doDia.map((a) => {
                  const equipeDoDia = todas.filter((x) => x.orcamentoId === a.orcamentoId && x.data === d);
                  return (
                    <div key={a.id} className="mt-2 space-y-2 text-sm" data-obra={a.obraNome}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-azul">{a.obraNome}</p>
                        {STATUS[a.status]}
                      </div>
                      <p className="text-cinza">Cliente: {a.clienteNome}</p>
                      {a.obraEndereco ? (
                        <a href={linkMaps(a.obraEndereco)} target="_blank" rel="noopener" className="block font-semibold text-azul hover:underline">
                          📍 {a.obraEndereco} (abrir no Maps)
                        </a>
                      ) : (
                        <p className="text-cinza">📍 Endereço não cadastrado</p>
                      )}
                      <ul className="space-y-1 border-t border-slate-100 pt-2">
                        {equipeDoDia.map((x) => (
                          <li key={x.id} className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-2">
                              <span className="inline-block size-3 rounded-full" style={{ backgroundColor: x.membroCor }} />
                              {x.membroNome}
                              {x.membroEquipeId === membroId && <span className="text-xs text-cinza">(você)</span>}
                            </span>
                            {ehLider && d <= hoje ? <BotoesPresenca alocacaoId={x.id} presenca={x.presenca} /> : x.presenca && PRESENCA[x.presenca]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </li>
            );
          })}
        </ol>
      )}

      <form action={sair} className="mt-6 text-center">
        <button className="text-sm font-semibold text-azul hover:underline">Sair</button>
      </form>
    </main>
  );
}
