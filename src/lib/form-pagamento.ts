import 'server-only';
import { campo, numeroBR } from './acao';
import { salvarArquivo } from './arquivos';

type Forma = 'pix' | 'dinheiro' | 'cartao' | 'transferencia';

/** Lê valor, forma, data e comprovante do formulário de pagamento (sinal, saldo, fatura). */
export async function lerPagamento(empresaId: string, f: FormData) {
  const arquivo = f.get('comprovante');
  return {
    valor: numeroBR(campo(f, 'valor')),
    forma: (campo(f, 'forma') ?? 'pix') as Forma,
    pagoEm: campo(f, 'pagoEm') ?? '',
    comprovante: arquivo instanceof File && arquivo.size > 0 ? await salvarArquivo(empresaId, arquivo, { aceitaPdf: true }) : null,
  };
}
