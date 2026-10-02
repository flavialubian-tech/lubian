/**
 * Motor de precificação da Lubian Limpezas.
 *
 *   Força-Tarefa      = Σ diária × dias de cada profissional
 *   Custo Operacional = Força-Tarefa + custos variáveis
 *   Valor Final       = Custo Operacional × (1 + markup)        (markup sobre o custo, 30% a 45%)
 *   Ancoragem         = Valor de Tabela − Desconto = Valor Final
 *
 * Todos os cálculos são feitos em centavos inteiros para evitar erro de ponto flutuante.
 */

export const MARKUP_MINIMO_PADRAO = 0.3;

export interface MembroForcaTarefa {
  nome: string;
  /** Diária deste profissional neste projeto, em reais. */
  diaria: number;
  dias: number;
}

export interface CustosVariaveis {
  transporte?: number;
  alimentacao?: number;
  produtosFretes?: number;
  locacao?: number;
  outros?: number;
}

/** Como o Valor de Tabela é definido em cada orçamento (decisão D2). */
export type Ancoragem =
  | { tipo: 'nenhuma' }
  | { tipo: 'desconto_valor'; valor: number }
  | { tipo: 'desconto_percentual'; percentual: number }
  | { tipo: 'valor_tabela'; valor: number };

export interface Arredondamento {
  modo: 'baixo' | 'proximo' | 'cima';
  /** Passo em reais (1 = real inteiro, 5, 10…). */
  passo: number;
}

export interface EntradaOrcamento {
  equipe: MembroForcaTarefa[];
  custosVariaveis: CustosVariaveis;
  /** Markup sobre o custo, ex.: 0.35 para 35%. */
  markup: number;
  ancoragem: Ancoragem;
  /** Arredondamento aplicado ao Valor Final e ao Valor de Tabela. */
  arredondamento?: Arredondamento;
  markupMinimo?: number;
  /** Fração do Valor Final cobrada como sinal (padrão 50%). */
  percentualSinal?: number;
}

export interface ResultadoOrcamento {
  forcaTarefa: number;
  custosVariaveis: number;
  custoOperacional: number;
  valorFinal: number;
  valorTabela: number;
  desconto: number;
  /** Desconto ÷ Valor de Tabela. */
  descontoPercentual: number;
  /** Valor Final ÷ Custo Operacional − 1. */
  markupEfetivo: number;
  sinal: number;
  saldo: number;
  /** true quando o markup efetivo fica abaixo do mínimo: exige liberação da gestão. */
  abaixoDoMinimo: boolean;
}

const emCentavos = (reais: number) => Math.round(reais * 100);
const emReais = (centavos: number) => centavos / 100;

function arredondar(centavos: number, a?: Arredondamento): number {
  if (!a) return centavos;
  const passo = emCentavos(a.passo);
  const fn = a.modo === 'baixo' ? Math.floor : a.modo === 'cima' ? Math.ceil : Math.round;
  return fn(centavos / passo) * passo;
}

export function calcularOrcamento(e: EntradaOrcamento): ResultadoOrcamento {
  if (e.markup < 0) throw new Error('Markup não pode ser negativo');
  const forcaTarefa = e.equipe.reduce((s, m) => s + emCentavos(m.diaria) * m.dias, 0);
  const cv = e.custosVariaveis;
  const custosVariaveis = [cv.transporte, cv.alimentacao, cv.produtosFretes, cv.locacao, cv.outros]
    .reduce<number>((s, v) => s + emCentavos(v ?? 0), 0);
  const custoOperacional = forcaTarefa + custosVariaveis;

  const valorFinal = arredondar(Math.round(custoOperacional * (1 + e.markup)), e.arredondamento);

  let valorTabela: number;
  const anc = e.ancoragem;
  switch (anc.tipo) {
    case 'nenhuma':
      valorTabela = valorFinal;
      break;
    case 'desconto_valor':
      valorTabela = valorFinal + emCentavos(anc.valor);
      break;
    case 'desconto_percentual':
      if (anc.percentual < 0 || anc.percentual >= 1) throw new Error('Percentual de desconto deve estar entre 0 e 1');
      valorTabela = arredondar(Math.round(valorFinal / (1 - anc.percentual)), e.arredondamento);
      break;
    case 'valor_tabela':
      valorTabela = emCentavos(anc.valor);
      if (valorTabela < valorFinal) throw new Error('Valor de Tabela não pode ser menor que o Valor Final');
      break;
  }
  const desconto = valorTabela - valorFinal;

  const sinal = Math.round(valorFinal * (e.percentualSinal ?? 0.5));
  const markupEfetivo = custoOperacional > 0 ? valorFinal / custoOperacional - 1 : 0;

  return {
    forcaTarefa: emReais(forcaTarefa),
    custosVariaveis: emReais(custosVariaveis),
    custoOperacional: emReais(custoOperacional),
    valorFinal: emReais(valorFinal),
    valorTabela: emReais(valorTabela),
    desconto: emReais(desconto),
    descontoPercentual: valorTabela > 0 ? desconto / valorTabela : 0,
    markupEfetivo,
    sinal: emReais(sinal),
    saldo: emReais(valorFinal - sinal),
    abaixoDoMinimo: markupEfetivo < (e.markupMinimo ?? MARKUP_MINIMO_PADRAO) - 1e-9,
  };
}

/**
 * Distribui o Valor de Tabela entre os itens do escopo técnico, proporcional ao peso de cada
 * item, em múltiplos de `passo` reais. A diferença do arredondamento vai para o item de maior peso,
 * garantindo que a soma dos itens seja exatamente o Valor de Tabela.
 */
export function distribuirValorTabela(valorTabela: number, pesos: number[], passo = 5): number[] {
  if (pesos.length === 0) return [];
  const total = pesos.reduce((s, p) => s + p, 0);
  if (total <= 0) throw new Error('A soma dos pesos deve ser positiva');
  const alvo = emCentavos(valorTabela);
  const p = emCentavos(passo);
  const valores = pesos.map((w) => Math.round((alvo * w) / total / p) * p);
  const maior = pesos.indexOf(Math.max(...pesos));
  valores[maior] += alvo - valores.reduce((s, v) => s + v, 0);
  return valores.map(emReais);
}
