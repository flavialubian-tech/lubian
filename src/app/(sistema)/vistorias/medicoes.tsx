'use client';

import { useState } from 'react';
import type { Medicao } from '@/db/schema';

/** Lista editável de ambientes e metragens; envia o JSON num campo oculto. */
export function EditorMedicoes({ inicial }: { inicial: Medicao[] }) {
  const [linhas, setLinhas] = useState<{ ambiente: string; m2: string }[]>(
    inicial.length ? inicial.map((m) => ({ ambiente: m.ambiente, m2: String(m.m2) })) : [{ ambiente: '', m2: '' }],
  );
  const num = (v: string) => Number(v.replace(',', '.')) || 0;
  const total = linhas.reduce((s, l) => s + num(l.m2), 0);
  const atualizar = (i: number, campo: 'ambiente' | 'm2', valor: string) =>
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));

  return (
    <div>
      <input type="hidden" name="medicoes" value={JSON.stringify(linhas.map((l) => ({ ambiente: l.ambiente, m2: num(l.m2) })))} />
      <div className="space-y-2">
        {linhas.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-borda px-3 py-2 text-sm"
              placeholder="Ambiente (ex.: Sala, Suíte, Varanda)"
              value={l.ambiente}
              onChange={(e) => atualizar(i, 'ambiente', e.target.value)}
            />
            <input
              className="w-24 rounded-lg border border-borda px-3 py-2 text-sm"
              placeholder="m²"
              inputMode="decimal"
              value={l.m2}
              onChange={(e) => atualizar(i, 'm2', e.target.value)}
            />
            <button type="button" className="px-2 text-cinza hover:text-vermelho" aria-label="Remover" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <button type="button" className="font-semibold text-azul" onClick={() => setLinhas((ls) => [...ls, { ambiente: '', m2: '' }])}>
          + Ambiente
        </button>
        <span className="font-bold">Total: {total.toLocaleString('pt-BR')} m²</span>
      </div>
    </div>
  );
}
