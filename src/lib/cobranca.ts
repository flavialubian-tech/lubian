/**
 * Contas a receber de um orçamento aprovado (funções puras).
 *   Padrão: sinal (vence na aprovação) + saldo (vence na entrega).
 *   Condição especial do cliente (ex.: CREDCREA): 100% em N dias úteis após a entrega.
 */
import { normalizarDatas } from './agenda';
import { somarDiasUteis, type Feriado } from './dias-uteis';

export type TipoCobranca = 'sinal' | 'saldo' | 'fatura';
export type StatusCobranca = 'aberta' | 'paga' | 'cancelada';

export const DESCRICAO_COBRANCA = {
  sinal: 'Sinal de Reserva da Agenda',
  saldo: 'Saldo Final - Conclusão do Serviço',
  integral: 'Valor Integral do Serviço',
};

export interface NovaCobranca {
  tipo: 'sinal' | 'saldo';
  descricao: string;
  valor: number;
  vencimento: string;
}

/** Data da entrega prevista = último dia das alocações (ou a aprovação, sem datas). */
export const entregaPrevista = (datasPrevistas: string[], aprovacao: string) => normalizarDatas(datasPrevistas).at(-1) ?? aprovacao;

/** Vencimento da cobrança final a partir da data de entrega. */
export const vencimentoFinal = (entrega: string, prazoDiasUteis: number | null | undefined, feriados: Feriado[] = []) =>
  prazoDiasUteis ? somarDiasUteis(entrega, prazoDiasUteis, feriados) : entrega;

export function planoCobrancas(e: {
  resultado: { valorFinal: number; sinal: number; saldo: number };
  aprovacao: string;
  datasPrevistas: string[];
  prazoDiasUteis?: number | null;
  feriados?: Feriado[];
}): NovaCobranca[] {
  const entrega = entregaPrevista(e.datasPrevistas, e.aprovacao);
  if (e.prazoDiasUteis) {
    return [{ tipo: 'saldo', descricao: DESCRICAO_COBRANCA.integral, valor: e.resultado.valorFinal, vencimento: vencimentoFinal(entrega, e.prazoDiasUteis, e.feriados) }];
  }
  const plano: NovaCobranca[] = [];
  if (e.resultado.sinal > 0) plano.push({ tipo: 'sinal', descricao: DESCRICAO_COBRANCA.sinal, valor: e.resultado.sinal, vencimento: e.aprovacao });
  if (e.resultado.saldo > 0) plano.push({ tipo: 'saldo', descricao: DESCRICAO_COBRANCA.saldo, valor: e.resultado.saldo, vencimento: entrega });
  return plano;
}

/** Situação para a tela: aberta, vencida (aberta com vencimento antes de hoje), paga ou cancelada. */
export function situacaoCobranca(c: { status: StatusCobranca; vencimento: string }, hoje: string) {
  if (c.status !== 'aberta') return c.status;
  if (c.vencimento < hoje) return 'vencida' as const;
  if (c.vencimento === hoje) return 'vence_hoje' as const;
  return 'aberta' as const;
}
