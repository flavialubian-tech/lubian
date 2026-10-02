'use client';

import { useState } from 'react';
import { diaMes, nomeDia, normalizarDatas, somarDias } from '@/lib/agenda';
import { Rotulo } from './ui';

/** Escolha de dias de execução (contínuos ou alternados, ex.: qui + sex). */
export function SeletorDatas({ datas, aoMudar, rotulo = 'Datas previstas', name }: { datas: string[]; aoMudar?: (d: string[]) => void; rotulo?: string; name?: string }) {
  const [lista, setLista] = useState(datas);
  const [nova, setNova] = useState('');
  const mudar = (d: string[]) => {
    const n = normalizarDatas(d);
    setLista(n);
    aoMudar?.(n);
  };
  return (
    <div>
      <Rotulo htmlFor="nova-data">{rotulo}</Rotulo>
      {name && lista.map((d) => <input key={d} type="hidden" name={name} value={d} />)}
      <div className="flex flex-wrap gap-2">
        <input
          id="nova-data"
          type="date"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          className="rounded-lg border border-borda bg-white px-3 py-2 text-sm outline-none focus:border-azul"
        />
        <button type="button" className="rounded-lg border border-borda px-3 py-2 text-sm font-semibold text-azul hover:bg-slate-50" disabled={!nova} onClick={() => (mudar([...lista, nova]), setNova(''))}>
          Adicionar data
        </button>
        {lista.length > 0 && (
          <button type="button" className="px-2 text-sm font-semibold text-azul hover:underline" onClick={() => mudar([...lista, somarDias(lista.at(-1)!, 1)])}>
            + dia seguinte
          </button>
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {lista.map((d) => (
          <li key={d} className="inline-flex items-center gap-1 rounded-full bg-azul-claro px-3 py-1 text-xs font-semibold text-azul">
            {nomeDia(d)} {diaMes(d)}
            <button type="button" aria-label={`Remover ${diaMes(d)}`} className="ml-1 hover:text-vermelho" onClick={() => mudar(lista.filter((x) => x !== d))}>
              ✕
            </button>
          </li>
        ))}
        {!lista.length && <li className="text-xs text-cinza">Nenhuma data escolhida (a agenda é montada com estas datas na aprovação).</li>}
      </ul>
    </div>
  );
}
