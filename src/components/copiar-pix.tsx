'use client';

import { useState } from 'react';

/** QR Code + código Pix copia e cola com botão de copiar (página do cliente). */
export function CopiarPix({ codigo, qr, valor }: { codigo: string; qr: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      const campo = document.getElementById('pix-copia-e-cola') as HTMLTextAreaElement | null;
      campo?.select();
      document.execCommand('copy');
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-azul-claro p-3 sm:flex-row sm:items-center" data-pix>
      {/* QR para pagar pela câmera do app do banco (em outro aparelho). */}
      <img src={qr} alt={`QR Code Pix de ${valor}`} width={160} height={160} className="mx-auto shrink-0 rounded bg-white p-1 sm:mx-0" />
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <p>
          <strong>Pix copia e cola</strong> — no app do banco, escolha <em>Pix › Copia e cola</em> e cole o código. O valor de{' '}
          <strong>{valor}</strong> já vem preenchido.
        </p>
        <textarea id="pix-copia-e-cola" readOnly value={codigo} rows={3} className="w-full resize-none rounded border border-borda bg-white p-2 font-mono text-xs break-all" />
        <button type="button" onClick={copiar} className="rounded-lg bg-verde px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
          {copiado ? 'Código copiado ✓' : 'Copiar código Pix'}
        </button>
      </div>
    </div>
  );
}
