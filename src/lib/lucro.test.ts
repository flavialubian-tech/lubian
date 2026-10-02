import { describe, expect, it } from 'vitest';
import { calcularLucroReal, rankingParceiros } from './lucro';

describe('calcularLucroReal', () => {
  it('lucro e markup real com semáforo verde a partir de 30%', () => {
    const r = calcularLucroReal({ recebido: 2050, diarias: 1200, despesas: 150 });
    expect(r.custoReal).toBe(1350);
    expect(r.lucro).toBe(700);
    expect(r.markup).toBeCloseTo(0.5185, 3);
    expect(r.semaforo).toBe('verde');
  });

  it('amarelo entre 0 e 30%, vermelho no prejuízo', () => {
    expect(calcularLucroReal({ recebido: 1100, diarias: 1000, despesas: 0 }).semaforo).toBe('amarelo');
    expect(calcularLucroReal({ recebido: 1000, diarias: 1000, despesas: 0.01 }).semaforo).toBe('vermelho');
    expect(calcularLucroReal({ recebido: 1300, diarias: 1000, despesas: 0 }).semaforo).toBe('verde');
  });

  it('sem custo lançado: markup null', () => {
    const r = calcularLucroReal({ recebido: 500, diarias: 0, despesas: 0 });
    expect(r.markup).toBeNull();
    expect(r.semaforo).toBe('verde');
  });
});

describe('rankingParceiros', () => {
  it('conta obras, enviados, aprovados, conversão e faturamento', () => {
    const obras = new Map([
      ['regiane', new Set(['o1', 'o2'])],
      ['construtora', new Set(['o3'])],
    ]);
    const r = rankingParceiros(
      [
        { parceiroId: 'regiane', obraId: 'o1', status: 'aprovado', enviado: true, valorFinal: 2050 },
        { parceiroId: 'regiane', obraId: 'o2', status: 'recusado', enviado: true, valorFinal: 3000 },
        { parceiroId: 'regiane', obraId: 'o2', status: 'rascunho', enviado: false, valorFinal: 999 },
        { parceiroId: 'construtora', obraId: 'o3', status: 'aprovado', enviado: true, valorFinal: 5000.1 },
        { parceiroId: null, obraId: 'o4', status: 'aprovado', enviado: true, valorFinal: 100 },
      ],
      obras,
    );
    expect(r).toEqual([
      { parceiroId: 'construtora', obras: 1, enviados: 1, aprovados: 1, conversao: 1, faturamento: 5000.1 },
      { parceiroId: 'regiane', obras: 2, enviados: 2, aprovados: 1, conversao: 0.5, faturamento: 2050 },
    ]);
  });
});
