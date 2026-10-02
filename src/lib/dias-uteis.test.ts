import { describe, expect, it } from 'vitest';
import { diasBloqueadosNoMes, ehDiaUtil, somarDiasUteis } from './dias-uteis';

describe('somarDiasUteis', () => {
  it('pula sábado e domingo', () => {
    // 2026-10-02 é sexta
    expect(somarDiasUteis('2026-10-02', 1)).toBe('2026-10-05');
    expect(somarDiasUteis('2026-10-02', 10)).toBe('2026-10-16');
  });

  it('pula feriados da empresa toda, mas não folgas individuais', () => {
    const feriados = [
      { membroEquipeId: null, dataInicio: '2026-10-12', dataFim: '2026-10-12' },
      { membroEquipeId: 'm1', dataInicio: '2026-10-13', dataFim: '2026-10-13' },
    ];
    expect(somarDiasUteis('2026-10-09', 2, feriados)).toBe('2026-10-14');
    expect(ehDiaUtil('2026-10-13', feriados)).toBe(true);
  });

  it('zero dias devolve a própria data e rejeita negativos', () => {
    expect(somarDiasUteis('2026-10-03', 0)).toBe('2026-10-03');
    expect(() => somarDiasUteis('2026-10-03', -1)).toThrow();
  });
});

describe('diasBloqueadosNoMes', () => {
  it('expande os períodos dentro do mês', () => {
    const feriados = [
      { membroEquipeId: null, dataInicio: '2026-09-30', dataFim: '2026-10-02' },
      { membroEquipeId: null, dataInicio: '2026-10-12', dataFim: '2026-10-12' },
      { membroEquipeId: 'm1', dataInicio: '2026-10-20', dataFim: '2026-10-20' },
    ];
    expect(diasBloqueadosNoMes(2026, 10, feriados)).toEqual([1, 2, 12]);
  });
});
