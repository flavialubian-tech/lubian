'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Botao } from '@/components/ui';
import { enviarAcao } from '../actions';

/** Abre o WhatsApp com a mensagem pronta e marca o orçamento como enviado. */
export function BotaoEnviarWhatsApp({ id, linkWhatsApp, rotulo, bloqueado }: { id: string; linkWhatsApp: string; rotulo: string; bloqueado: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  return (
    <div>
      <Botao
        type="button"
        variante="sucesso"
        className="w-full"
        disabled={bloqueado || pendente}
        onClick={() => {
          window.open(linkWhatsApp, '_blank', 'noopener');
          iniciar(async () => {
            const r = await enviarAcao(id);
            setErro(r?.erro);
            router.refresh();
          });
        }}
      >
        {pendente ? 'Registrando…' : rotulo}
      </Botao>
      {erro && <p className="mt-2 text-sm text-vermelho">{erro}</p>}
    </div>
  );
}

export function BotaoMarcarEnviado({ id, bloqueado }: { id: string; bloqueado: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={bloqueado || pendente}
      className="text-xs font-semibold text-azul hover:underline disabled:opacity-50"
      onClick={() =>
        iniciar(async () => {
          await enviarAcao(id);
          router.refresh();
        })
      }
    >
      Marcar como enviado sem abrir o WhatsApp
    </button>
  );
}

export function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={url} className="min-w-0 flex-1 rounded-lg border border-borda bg-slate-50 px-3 py-2 text-xs" onFocus={(e) => e.target.select()} />
      <Botao
        type="button"
        variante="secundario"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
      >
        {copiado ? '✓' : 'Copiar'}
      </Botao>
    </div>
  );
}

/** Botão que executa uma Server Action sem formulário e atualiza a tela. */
export function BotaoAcao({
  acao,
  rotulo,
  variante = 'secundario',
  confirmar,
}: {
  acao: () => Promise<{ erro?: string; ok?: string } | undefined>;
  rotulo: string;
  variante?: 'primario' | 'secundario' | 'perigo' | 'sucesso';
  confirmar?: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();
  return (
    <div>
      <Botao
        type="button"
        variante={variante}
        className="w-full"
        disabled={pendente}
        onClick={() => {
          if (confirmar && !window.confirm(confirmar)) return;
          iniciar(async () => {
            const r = await acao();
            setErro(r?.erro);
            router.refresh();
          });
        }}
      >
        {pendente ? 'Registrando…' : rotulo}
      </Botao>
      {erro && <p className="mt-2 text-sm text-vermelho">{erro}</p>}
    </div>
  );
}
