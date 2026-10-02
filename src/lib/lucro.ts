/**
 * Lucro real da obra: pagamentos recebidos − (diárias das presenças + despesas reais).
 * Markup real = lucro ÷ custo real. Semáforo: 🟢 ≥ 30% · 🟡 0–30% · 🔴 prejuízo.
 */
import { MARKUP_MINIMO_PADRAO } from '../precificacao';

export type Semaforo = 'verde' | 'amarelo' | 'vermelho';

export interface LucroReal {
  recebido: number;
  diarias: number;
  despesas: number;
  custoReal: number;
  lucro: number;
  /** null quando ainda não há custo lançado. */
  markup: number | null;
  semaforo: Semaforo;
}

const c = (v: number) => Math.round(v * 100);

export function semaforo(lucro: number, markup: number | null, meta = MARKUP_MINIMO_PADRAO): Semaforo {
  if (lucro < 0) return 'vermelho';
  if (markup === null || markup >= meta) return 'verde';
  return 'amarelo';
}

export function calcularLucroReal(e: { recebido: number; diarias: number; despesas: number }, meta = MARKUP_MINIMO_PADRAO): LucroReal {
  const custo = c(e.diarias) + c(e.despesas);
  const lucro = c(e.recebido) - custo;
  const markup = custo > 0 ? lucro / custo : null;
  return {
    recebido: c(e.recebido) / 100,
    diarias: c(e.diarias) / 100,
    despesas: c(e.despesas) / 100,
    custoReal: custo / 100,
    lucro: lucro / 100,
    markup,
    semaforo: semaforo(lucro, markup, meta),
  };
}

export const EMOJI_SEMAFORO: Record<Semaforo, string> = { verde: '🟢', amarelo: '🟡', vermelho: '🔴' };

export interface OrcamentoParaRanking {
  parceiroId: string | null;
  obraId: string;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
  enviado: boolean;
  valorFinal: number;
}

export interface LinhaRanking {
  parceiroId: string;
  obras: number;
  enviados: number;
  aprovados: number;
  conversao: number;
  faturamento: number;
}

/**
 * Ranking de parceiros: obras indicadas, orçamentos enviados/aprovados, conversão e faturamento
 * (valor final dos aprovados). Ordena por faturamento e depois por obras.
 */
export function rankingParceiros(orcamentos: OrcamentoParaRanking[], obrasPorParceiro: Map<string, Set<string>>): LinhaRanking[] {
  const linhas = new Map<string, LinhaRanking>();
  const linha = (id: string) => {
    if (!linhas.has(id)) linhas.set(id, { parceiroId: id, obras: obrasPorParceiro.get(id)?.size ?? 0, enviados: 0, aprovados: 0, conversao: 0, faturamento: 0 });
    return linhas.get(id)!;
  };
  for (const id of obrasPorParceiro.keys()) linha(id);
  for (const o of orcamentos) {
    if (!o.parceiroId) continue;
    const l = linha(o.parceiroId);
    if (o.enviado) l.enviados++;
    if (o.status === 'aprovado') {
      l.aprovados++;
      l.faturamento = (c(l.faturamento) + c(o.valorFinal)) / 100;
    }
  }
  for (const l of linhas.values()) l.conversao = l.enviados ? l.aprovados / l.enviados : 0;
  return [...linhas.values()].sort((a, b) => b.faturamento - a.faturamento || b.obras - a.obras);
}
