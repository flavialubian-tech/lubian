import { describe, expect, it } from 'vitest';
import { calcularFaturaMensal, diasProgramados } from './fatura';

describe('diasProgramados', () => {
  it('outubro/2026 em seg, qua e sex = 13 diárias (modelo Katiane)', () => {
    const r = diasProgramados(2026, 10, [5, 1, 3]);
    expect(r.map((x) => x.nome)).toEqual(['Segundas', 'Quartas', 'Sextas']);
    expect(r[0].dias).toEqual([5, 12, 19, 26]);
    expect(r[1].dias).toEqual([7, 14, 21, 28]);
    expect(r[2].dias).toEqual([2, 9, 16, 23, 30]);
    expect(r.reduce((s, x) => s + x.dias.length, 0)).toBe(13);
  });

  it('remove datas excluídas (feriado)', () => {
    expect(diasProgramados(2026, 10, [1], [12])[0].dias).toEqual([5, 19, 26]);
  });
});

describe('calcularFaturaMensal', () => {
  it('reproduz a fatura da Katiane: 13 − 1 falta, Pix com 10% e espécie a R$ 160', () => {
    const r = calcularFaturaMensal({ diariasProgramadas: 13, faltas: 1, diariaBase: 180, descontoAntecipacao: 0.1, diariaEspecie: 160 });
    expect(r.diariasFaturadas).toBe(12);
    expect(r.pix).toEqual({ diaria: 180, valorBase: 2160, descontoPercentual: 0.1, desconto: 216, total: 1944 });
    expect(r.especie).toEqual({ diaria: 160, total: 1920 });
  });

  it('sem desconto de antecipação e sem opção em espécie', () => {
    const r = calcularFaturaMensal({ diariasProgramadas: 8, faltas: 0, diariaBase: 180 });
    expect(r.pix.total).toBe(1440);
    expect(r.especie).toBeUndefined();
  });

  it('rejeita mais faltas que diárias', () => {
    expect(() => calcularFaturaMensal({ diariasProgramadas: 2, faltas: 3, diariaBase: 180 })).toThrow();
  });
});
