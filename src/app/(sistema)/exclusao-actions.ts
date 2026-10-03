'use server';

import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { executarAcao } from '@/lib/acao';
import { exigirOperador } from '@/lib/auth';
import * as exclusao from '@/lib/exclusao';

const FUNCOES = {
  pagamento: exclusao.excluirPagamento,
  fatura: exclusao.excluirFatura,
  contrato: exclusao.excluirContrato,
  orcamento: exclusao.excluirOrcamento,
  vistoria: exclusao.excluirVistoria,
  obra: exclusao.excluirObra,
  cliente: exclusao.excluirCliente,
  membro: exclusao.excluirMembroEquipe,
  servico: exclusao.excluirServico,
  acerto: exclusao.excluirAcerto,
};
export type TipoExclusao = keyof typeof FUNCOES;

/** Exclui um registro (com confirmação na tela) e atualiza todo o sistema. */
export async function excluirAcao(tipo: TipoExclusao, id: string): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    await FUNCOES[tipo]({ empresaId: sessao.empresaId, usuarioId: sessao.usuarioId }, id);
    revalidatePath('/', 'layout');
    return { ok: 'Excluído.' };
  });
}
