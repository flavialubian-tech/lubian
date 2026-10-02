'use server';

import type { EstadoForm } from '@/components/formulario';
import { executarAcao } from '@/lib/acao';
import { exigirOperador } from '@/lib/auth';
import { registrarPagamento } from '@/lib/financeiro';
import { lerPagamento } from '@/lib/form-pagamento';

/** Dá baixa na cobrança e já devolve o recibo em PDF para baixar. */
export async function registrarPagamentoAcao(cobrancaId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    // Sem revalidatePath: o formulário baixa o recibo e depois atualiza a tela (router.refresh).
    const id = await registrarPagamento(sessao, cobrancaId, await lerPagamento(sessao.empresaId, f));
    return { ok: 'Pagamento registrado.', link: { href: `/api/recibos/${id}?baixar=1`, rotulo: 'Baixar recibo (PDF)', baixar: true } };
  });
}
