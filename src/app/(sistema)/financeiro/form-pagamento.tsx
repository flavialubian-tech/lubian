'use client';

import { useState } from 'react';
import { Formulario, type EstadoForm } from '@/components/formulario';
import { Botao, Campo, Selecao } from '@/components/ui';

const FORMAS = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', transferencia: 'Transferência' };
const br = (v: number) => v.toFixed(2).replace('.', ',');

/** Valor sugerido = valor da cobrança; na fatura paga em dinheiro, o total em espécie. */
export function FormPagamento({
  action,
  valor,
  valorEspecie,
  hoje,
  rotulo = 'Registrar pagamento',
}: {
  action: (estado: EstadoForm, dados: FormData) => Promise<EstadoForm>;
  valor: number;
  valorEspecie?: number | null;
  hoje: string;
  rotulo?: string;
}) {
  const [forma, setForma] = useState('pix');
  const sugerido = forma === 'dinheiro' && valorEspecie ? valorEspecie : valor;
  return (
    <Formulario action={action} className="grid grid-cols-2 gap-2">
      <Campo key={sugerido} rotulo="Valor (R$)" name="valor" inputMode="decimal" defaultValue={br(sugerido)} required />
      <Selecao rotulo="Forma" name="forma" value={forma} onChange={(e) => setForma(e.target.value)}>
        {Object.entries(FORMAS).map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </Selecao>
      <Campo rotulo="Pago em" name="pagoEm" type="date" defaultValue={hoje} required />
      <Campo rotulo="Comprovante" name="comprovante" type="file" accept="image/*,application/pdf" className="[&_input]:py-1.5" />
      {valorEspecie ? <p className="col-span-2 text-xs text-cinza">Em dinheiro (espécie) o total da fatura é {br(valorEspecie)}.</p> : null}
      <Botao type="submit" variante="sucesso" className="col-span-2">
        {rotulo}
      </Botao>
    </Formulario>
  );
}
