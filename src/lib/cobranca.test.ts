import { describe, expect, it } from 'vitest';
import { planoCobrancas, situacaoCobranca } from './cobranca';

const resultado = { valorFinal: 2050, sinal: 1025, saldo: 1025 };

describe('planoCobrancas', () => {
  it('padrão: sinal na aprovação e saldo no último dia previsto', () => {
    expect(planoCobrancas({ resultado, aprovacao: '2026-10-02', datasPrevistas: ['2026-10-11', '2026-10-10'] })).toEqual([
      { tipo: 'sinal', descricao: 'Sinal de Reserva da Agenda', valor: 1025, vencimento: '2026-10-02' },
      { tipo: 'saldo', descricao: 'Saldo Final - Conclusão do Serviço', valor: 1025, vencimento: '2026-10-11' },
    ]);
  });

  it('sem datas previstas o saldo vence na aprovação', () => {
    expect(planoCobrancas({ resultado, aprovacao: '2026-10-02', datasPrevistas: [] })[1].vencimento).toBe('2026-10-02');
  });

  it('condição especial: 100% em N dias úteis após a entrega (pulando feriado)', () => {
    const r = planoCobrancas({
      resultado,
      aprovacao: '2026-10-01',
      datasPrevistas: ['2026-10-02'],
      prazoDiasUteis: 10,
      feriados: [{ membroEquipeId: null, dataInicio: '2026-10-12', dataFim: '2026-10-12' }],
    });
    expect(r).toEqual([{ tipo: 'saldo', descricao: 'Valor Integral do Serviço', valor: 2050, vencimento: '2026-10-19' }]);
  });
});

describe('situacaoCobranca', () => {
  it('marca vencida e vence hoje só para abertas', () => {
    expect(situacaoCobranca({ status: 'aberta', vencimento: '2026-10-01' }, '2026-10-02')).toBe('vencida');
    expect(situacaoCobranca({ status: 'aberta', vencimento: '2026-10-02' }, '2026-10-02')).toBe('vence_hoje');
    expect(situacaoCobranca({ status: 'aberta', vencimento: '2026-10-03' }, '2026-10-02')).toBe('aberta');
    expect(situacaoCobranca({ status: 'paga', vencimento: '2026-10-01' }, '2026-10-02')).toBe('paga');
  });
});
