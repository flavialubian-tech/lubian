import { unstable_rethrow } from 'next/navigation';
import { ZodError } from 'zod';
import type { EstadoForm } from '@/components/formulario';
import { ErroNegocio } from './erros';

/** Executa uma Server Action e transforma erros esperados em mensagem para o formulário. */
export async function executarAcao(fn: () => Promise<EstadoForm | void>): Promise<EstadoForm> {
  try {
    return (await fn()) ?? undefined;
  } catch (e) {
    unstable_rethrow(e); // deixa redirect()/notFound() seguirem
    if (e instanceof ErroNegocio) return { erro: e.message };
    if (e instanceof ZodError) {
      const i = e.issues[0];
      return { erro: i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message };
    }
    console.error(e);
    return { erro: 'Não foi possível concluir. Tente novamente.' };
  }
}

/** Lê um campo de texto do FormData ('' vira null). */
export const campo = (f: FormData, nome: string) => {
  const v = f.get(nome);
  return typeof v === 'string' && v.trim() ? v.trim() : null;
};

/** "1.234,56", "1234,56" ou "1234.56" → "1234.56" */
export const numeroBR = (v: string | null) => (v?.includes(',') ? v.replace(/\./g, '').replace(',', '.') : (v ?? ''));
