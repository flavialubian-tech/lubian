import { describe, expect, it } from 'vitest';
import { valorPorExtenso } from './extenso';

describe('valorPorExtenso', () => {
  it.each([
    [2050, 'dois mil e cinquenta reais'],
    [1025, 'mil e vinte e cinco reais'],
    [988.5, 'novecentos e oitenta e oito reais e cinquenta centavos'],
    [1944, 'mil novecentos e quarenta e quatro reais'],
    [2100, 'dois mil e cem reais'],
    [100, 'cem reais'],
    [1, 'um real'],
    [0.5, 'cinquenta centavos'],
    [1_000_000, 'um milhão de reais'],
    [2_500_000, 'dois milhões e quinhentos mil reais'],
    [21_000, 'vinte e um mil reais'],
  ])('%d → %s', (valor, esperado) => {
    expect(valorPorExtenso(valor)).toBe(esperado);
  });
});
