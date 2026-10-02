/**
 * Recibos de Sinal (reserva de agenda) e de Quitação.
 * O texto da declaração e o valor por extenso são montados automaticamente.
 */
import { valorPorExtenso } from './extenso';

export type TipoRecibo = 'sinal' | 'quitacao';

export interface Pagamento {
  descricao: string;
  /** Ex.: "Pix", "Dinheiro", "Transferência" */
  forma: string;
  valor: number;
  pago: boolean;
}

export interface EntradaRecibo {
  tipo: TipoRecibo;
  servico: string;
  /** Como o local aparece no texto, ex.: "no Edifício Vila Zenaide (Apto 2702)". */
  localNoTexto: string;
  pagamentos: Pagamento[];
}

export interface ResultadoRecibo {
  titulo: string;
  status: string;
  rotuloTotal: string;
  total: number;
  pendente: number;
  declaracao: string;
  linhas: { descricao: string; valor: number; pendente: boolean }[];
}

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function montarRecibo(e: EntradaRecibo): ResultadoRecibo {
  const pagos = e.pagamentos.filter((p) => p.pago);
  const soma = (ps: Pagamento[]) => Math.round(ps.reduce((s, p) => s + p.valor * 100, 0)) / 100;
  const total = soma(pagos);
  const pendente = soma(e.pagamentos.filter((p) => !p.pago));
  if (e.tipo === 'quitacao' && pendente > 0) throw new Error('Recibo de quitação com parcela em aberto');

  const valor = `<strong>${moeda(total)}</strong> (${capitalizar(valorPorExtenso(total))})`;
  const servico = escapar(e.servico);
  const local = escapar(e.localNoTexto);

  const declaracao =
    e.tipo === 'quitacao'
      ? `Declaramos para os devidos fins o recebimento da importância total de ${valor}, referente à prestação de serviços de ${servico} ${local}. O serviço foi executado, vistoriado e entregue, não restando nenhuma pendência financeira atrelada a este atendimento.`
      : `Declaramos para os devidos fins o recebimento da importância de ${valor}, referente ao sinal para reserva da agenda dos serviços de ${servico} ${local}. A data da força-tarefa fica confirmada a partir deste pagamento${pendente > 0 ? `, e o saldo de <strong>${moeda(pendente)}</strong> será quitado na conclusão técnica do serviço` : ''}.`;

  return {
    titulo: e.tipo === 'quitacao' ? 'Recibo<br>de<br>Quitação' : 'Recibo<br>de<br>Sinal',
    status: e.tipo === 'quitacao' ? 'Serviço Entregue' : 'Agenda Confirmada',
    rotuloTotal: e.tipo === 'quitacao' ? 'TOTAL QUITADO' : 'TOTAL RECEBIDO',
    total,
    pendente,
    declaracao,
    linhas: e.pagamentos.map((p) => ({
      descricao: `${p.descricao} (${p.pago ? p.forma : 'a receber'})`,
      valor: p.valor,
      pendente: !p.pago,
    })),
  };
}

/** '2026-09-25' → "25 de Setembro de 2026" (data da baixa no recibo). */
export function dataPorExtenso(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  const mes = d.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${d.getUTCDate()} de ${capitalizar(mes)} de ${d.getUTCFullYear()}`;
}
