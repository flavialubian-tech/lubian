'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, type ReactNode } from 'react';

export type EstadoForm = { erro?: string; ok?: string; link?: { href: string; rotulo: string; baixar?: boolean; pagina?: boolean } } | undefined;

/** Formulário ligado a uma Server Action que devolve { erro } ou { ok } (e um link, ex.: o recibo em PDF). */
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
  const router = useRouter();
  const link = estado?.link;
  // Documento gerado (recibo): começa o download e só então atualiza a tela (a ação não revalida,
  // senão o formulário sumiria antes do download). Com `pagina` (PDF feito pelo navegador) não há o que
  // baixar: só atualiza, e o recibo fica no link da lista.
  useEffect(() => {
    if (!link?.baixar) return;
    if (link.pagina) return router.refresh();
    const a = document.createElement('a');
    a.href = link.href;
    a.download = '';
    a.click();
    router.refresh();
  }, [link, router]);
  return (
    <form action={executar} className={className} aria-busy={pendente}>
      {estado?.erro && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-vermelho">{estado.erro}</p>}
      {estado?.ok && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-verde">
          {estado.ok}
          {link && (
            <>
              {' '}
              <a href={link.href} target="_blank" className="font-bold underline" data-link-gerado>
                {link.rotulo}
              </a>
            </>
          )}
        </p>
      )}
      <fieldset disabled={pendente} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
