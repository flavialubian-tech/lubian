'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { marcarPresencaAcao } from '@/app/minha-semana/actions';
import { cx } from '@/components/ui';

/**
 * Presente / falta de um profissional num dia de escala (líder em "Minha semana"; Gestão e Administrativo no
 * orçamento e no acerto). Clicar de novo no mesmo botão apaga o registro. Atualiza a tela (totais do acerto).
 */
export function BotoesPresenca({ alocacaoId, presenca }: { alocacaoId: string; presenca: 'presente' | 'falta' | null }) {
  const [atual, setAtual] = useState(presenca);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const marcar = (p: 'presente' | 'falta') =>
    iniciar(async () => {
      const novo = atual === p ? null : p;
      const r = await marcarPresencaAcao(alocacaoId, novo);
      if (r?.erro) return setErro(r.erro);
      setErro(undefined);
      setAtual(novo);
      router.refresh();
    });
  const estilo = (p: 'presente' | 'falta') =>
    cx(
      'rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-50',
      atual === p ? (p === 'presente' ? 'border-verde bg-verde text-white' : 'border-vermelho bg-vermelho text-white') : 'border-borda bg-white text-slate-600',
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-presenca={atual ?? 'sem'}>
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
