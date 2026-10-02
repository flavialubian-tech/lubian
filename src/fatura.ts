/**
 * Fatura mensal dos contratos recorrentes (diárias).
 *
 *   Diárias a faturar = dias programados no mês − faltas da equipe
 *   Opção 1 (Pix/Transferência) = diárias × diária base − desconto de antecipação (%)
 *   Opção 2 (Dinheiro)          = diárias × diária especial reduzida
 */

export const NOMES_DIA_SEMANA = ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados'];

export interface DiasDaSemanaNoMes {
  /** 0 = domingo … 6 = sábado */
  diaSemana: number;
  nome: string;
  dias: number[];
}

/**
 * Lista os dias do mês que caem nos dias da semana do contrato (ex.: seg, qua, sex),
 * já sem as datas excluídas (feriados, recesso combinado).
 */
export function diasProgramados(ano: number, mes: number, diasSemana: number[], excluir: number[] = []): DiasDaSemanaNoMes[] {
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return [...diasSemana]
    .sort((a, b) => a - b)
    .map((diaSemana) => {
      const dias: number[] = [];
      for (let d = 1; d <= ultimoDia; d++) {
        if (new Date(Date.UTC(ano, mes - 1, d)).getUTCDay() === diaSemana && !excluir.includes(d)) dias.push(d);
      }
      return { diaSemana, nome: NOMES_DIA_SEMANA[diaSemana], dias };
    });
}

export interface EntradaFatura {
  diariasProgramadas: number;
  faltas: number;
  /** Diária cheia (Pix/Transferência/Cartão), ex.: 180. */
  diariaBase: number;
  /** Desconto de antecipação no Pix, ex.: 0.10. Zero para não oferecer. */
  descontoAntecipacao?: number;
  /** Diária especial para pagamento em dinheiro, ex.: 160. Omitir para não oferecer. */
  diariaEspecie?: number;
}

export interface ResultadoFatura {
  diariasProgramadas: number;
  faltas: number;
  diariasFaturadas: number;
  pix: { diaria: number; valorBase: number; descontoPercentual: number; desconto: number; total: number };
  especie?: { diaria: number; total: number };
}

const centavos = (v: number) => Math.round(v * 100);

export function calcularFaturaMensal(e: EntradaFatura): ResultadoFatura {
  if (e.faltas < 0 || e.faltas > e.diariasProgramadas) throw new Error('Faltas devem estar entre 0 e o total de diárias programadas');
  const diariasFaturadas = e.diariasProgramadas - e.faltas;
  const base = centavos(e.diariaBase) * diariasFaturadas;
  const pct = e.descontoAntecipacao ?? 0;
  const desconto = Math.round(base * pct);
  return {
    diariasProgramadas: e.diariasProgramadas,
    faltas: e.faltas,
    diariasFaturadas,
    pix: { diaria: e.diariaBase, valorBase: base / 100, descontoPercentual: pct, desconto: desconto / 100, total: (base - desconto) / 100 },
    especie:
      e.diariaEspecie === undefined
        ? undefined
        : { diaria: e.diariaEspecie, total: (centavos(e.diariaEspecie) * diariasFaturadas) / 100 },
  };
}
