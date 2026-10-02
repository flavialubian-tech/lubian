'use client';

import { useState, useTransition } from 'react';
import { cx } from '@/components/ui';
import { marcarPresencaAcao } from './actions';

/** Botões do líder: presente / falta de um profissional no dia. */
export function BotoesPresenca({ alocacaoId, presenca }: { alocacaoId: string; presenca: 'presente' | 'falta' | null }) {
  const [atual, setAtual] = useState(presenca);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const marcar = (p: 'presente' | 'falta') =>
    iniciar(async () => {
      const novo = atual === p ? null : p;
      const r = await marcarPresencaAcao(alocacaoId, novo);
      if (r?.erro) return setErro(r.erro);
      setErro(undefined);
      setAtual(novo);
    });
  const estilo = (p: 'presente' | 'falta') =>
    cx(
      'rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-50',
      atual === p ? (p === 'presente' ? 'border-verde bg-verde text-white' : 'border-vermelho bg-vermelho text-white') : 'border-borda bg-white text-slate-600',
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <button type="button" disabled={pendente} className={estilo('presente')} onClick={() => marcar('presente')}>
        Presente
      </button>
      <button type="button" disabled={pendente} className={estilo('falta')} onClick={() => marcar('falta')}>
        Falta
      </button>
      {erro && <span className="text-xs text-vermelho">{erro}</span>}
    </span>
  );
}
