/**
 * Acerto da equipe (D4): dias efetivamente trabalhados × diária de cada projeto − vales.
 * Funções puras.
 */
import { chaveNome } from './agenda';

/** Diária do profissional naquele projeto (força-tarefa do orçamento) ou a diária padrão do cadastro. */
export function diariaNoProjeto(nome: string, equipeOrcamento: { nome: string; diaria: number }[], diariaPadrao: number) {
  const m = equipeOrcamento.find((e) => chaveNome(e.nome) === chaveNome(nome));
  return m ? m.diaria : diariaPadrao;
}

export interface AlocacaoTrabalhada {
  data: string;
  status: 'pre_reserva' | 'confirmada' | 'concluida' | 'cancelada';
  presenca: 'presente' | 'falta' | null;
  obraNome: string;
  numero: string;
  /** Força-tarefa do orçamento (orcamento.precificacao.equipe). */
  equipeOrcamento: { nome: string; diaria: number }[];
}

/** Conta como dia trabalhado: presença marcada em escala confirmada ou concluída. */
export const trabalhou = (a: Pick<AlocacaoTrabalhada, 'status' | 'presenca'>) =>
  a.presenca === 'presente' && (a.status === 'confirmada' || a.status === 'concluida');

export interface EntradaAcerto {
  membro: { nome: string; diariaPadrao: number };
  alocacoes: AlocacaoTrabalhada[];
  /** Vales em aberto do profissional. */
  vales: { valor: number }[];
}

export interface ResultadoAcerto {
  linhas: { data: string; obraNome: string; numero: string; diaria: number }[];
  diarias: number;
  totalDiarias: number;
  totalVales: number;
  liquido: number;
}

const c = (v: number) => Math.round(v * 100);

export function calcularAcerto(e: EntradaAcerto): ResultadoAcerto {
  const linhas = e.alocacoes
    .filter(trabalhou)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((a) => ({ data: a.data, obraNome: a.obraNome, numero: a.numero, diaria: diariaNoProjeto(e.membro.nome, a.equipeOrcamento, e.membro.diariaPadrao) }));
  const totalDiarias = linhas.reduce((s, l) => s + c(l.diaria), 0);
  const totalVales = e.vales.reduce((s, v) => s + c(v.valor), 0);
  return {
    linhas,
    diarias: linhas.length,
    totalDiarias: totalDiarias / 100,
    totalVales: totalVales / 100,
    liquido: (totalDiarias - totalVales) / 100,
  };
}
