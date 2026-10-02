import { describe, expect, it } from 'vitest';
import { dataPorExtenso, montarRecibo } from './recibo';

const base = { servico: 'Limpeza Intermediária', localNoTexto: 'no Edifício Vila Zenaide (Apto 2702)' };

describe('montarRecibo', () => {
  it('quitação do Christian: sinal + saldo = R$ 2.050,00 por extenso', () => {
    const r = montarRecibo({
      ...base,
      tipo: 'quitacao',
      pagamentos: [
        { descricao: 'Sinal de Reserva da Agenda', forma: 'Pix', valor: 1025, pago: true },
        { descricao: 'Saldo Final - Conclusão do Serviço', forma: 'Pix', valor: 1025, pago: true },
      ],
    });
    expect(r.total).toBe(2050);
    expect(r.declaracao).toContain('<strong>R$ 2.050,00</strong> (Dois mil e cinquenta reais)');
    expect(r.declaracao).toContain('Limpeza Intermediária no Edifício Vila Zenaide (Apto 2702)');
    expect(r.linhas[0].descricao).toBe('Sinal de Reserva da Agenda (Pix)');
  });

  it('sinal mostra o saldo pendente', () => {
    const r = montarRecibo({
      ...base,
      tipo: 'sinal',
      pagamentos: [
        { descricao: 'Sinal de Reserva da Agenda', forma: 'Pix', valor: 988.5, pago: true },
        { descricao: 'Saldo Final - Conclusão do Serviço', forma: 'Pix', valor: 988.5, pago: false },
      ],
    });
    expect(r.total).toBe(988.5);
    expect(r.pendente).toBe(988.5);
    expect(r.declaracao).toContain('Novecentos e oitenta e oito reais e cinquenta centavos');
    expect(r.linhas[1]).toMatchObject({ pendente: true, descricao: 'Saldo Final - Conclusão do Serviço (a receber)' });
  });

  it('não emite quitação com parcela em aberto', () => {
    expect(() =>
      montarRecibo({ ...base, tipo: 'quitacao', pagamentos: [{ descricao: 'Saldo', forma: 'Pix', valor: 10, pago: false }] }),
    ).toThrow();
  });
});

describe('dataPorExtenso', () => {
  it('formata a data da baixa', () => {
    expect(dataPorExtenso('2026-09-25')).toBe('25 de Setembro de 2026');
  });
});
