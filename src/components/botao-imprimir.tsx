'use client';

import { Botao } from './ui';

export function BotaoImprimir({ rotulo = 'Imprimir' }: { rotulo?: string }) {
  return (
    <Botao type="button" variante="secundario" className="print:hidden" onClick={() => window.print()}>
      {rotulo}
    </Botao>
  );
}
