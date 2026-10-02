'use client';

import { useActionState, type ReactNode } from 'react';

export type EstadoForm = { erro?: string; ok?: string } | undefined;

/** Formulário ligado a uma Server Action que devolve { erro } ou { ok }. */
export function Formulario({
  action,
  children,
  className,
}: {
  action: (estado: EstadoForm, dados: FormData) => Promise<EstadoForm>;
  children: ReactNode;
  className?: string;
}) {
  const [estado, executar, pendente] = useActionState(action, undefined);
  return (
    <form action={executar} className={className} aria-busy={pendente}>
      {estado?.erro && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-vermelho">{estado.erro}</p>}
      {estado?.ok && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-verde">{estado.ok}</p>}
      <fieldset disabled={pendente} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
