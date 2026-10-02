'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { excluirAcao, type TipoExclusao } from '@/app/(sistema)/exclusao-actions';

/** Botão "Excluir" com confirmação; depois volta para a lista (`voltarPara`) ou atualiza a tela. */
export function BotaoExcluir({
  tipo,
  id,
  confirmar,
  voltarPara,
  rotulo = 'Excluir',
  className,
}: {
  tipo: TipoExclusao;
  id: string;
  confirmar: string;
  voltarPara?: string;
  rotulo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  return (
    <span className={className}>
      <button
        type="button"
        disabled={pendente}
        data-excluir={tipo}
        className="text-xs font-semibold text-vermelho hover:underline disabled:opacity-50"
        onClick={() => {
          if (!window.confirm(`${confirmar}\n\nEsta ação não pode ser desfeita.`)) return;
          iniciar(async () => {
            const r = await excluirAcao(tipo, id);
            if (r?.erro) return setErro(r.erro);
            setErro(undefined);
            if (voltarPara) router.push(voltarPara);
            else router.refresh();
          });
        }}
      >
        {pendente ? 'Excluindo…' : `🗑 ${rotulo}`}
      </button>
      {erro && <span className="mt-1 block text-xs font-medium text-vermelho">{erro}</span>}
    </span>
  );
}
