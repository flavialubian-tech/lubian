import { describe, expect, it } from 'vitest';
import { calcularOrcamento, distribuirValorTabela } from './precificacao';

describe('calcularOrcamento', () => {
  it('reproduz a planilha: custo R$ 1.465 × 1,35 = R$ 1.977 com desconto de parceria R$ 500', () => {
    const r = calcularOrcamento({
      equipe: [
        { nome: 'Flávia', diaria: 250, dias: 2 },
        { nome: 'Leandro', diaria: 200, dias: 2 },
      ],
      custosVariaveis: { transporte: 120, alimentacao: 80, produtosFretes: 165, outros: 200 },
      markup: 0.35,
      ancoragem: { tipo: 'desconto_valor', valor: 500 },
      arredondamento: { modo: 'baixo', passo: 1 },
    });
    expect(r.forcaTarefa).toBe(900);
    expect(r.custoOperacional).toBe(1465);
    expect(r.valorFinal).toBe(1977);
    expect(r.valorTabela).toBe(2477);
    expect(r.desconto).toBe(500);
    expect(r.sinal).toBe(988.5);
    expect(r.saldo).toBe(988.5);
    expect(r.abaixoDoMinimo).toBe(false);
  });

  it('ancoragem por percentual (modelo Raíssa: 15% de desconto, final R$ 1.620)', () => {
    const r = calcularOrcamento({
      equipe: [{ nome: 'Equipe', diaria: 1200, dias: 1 }],
      custosVariaveis: {},
      markup: 0.35,
      ancoragem: { tipo: 'desconto_percentual', percentual: 0.15 },
      arredondamento: { modo: 'proximo', passo: 5 },
    });
    expect(r.valorFinal).toBe(1620);
    expect(r.valorTabela).toBe(1905);
    expect(r.desconto).toBe(285);
    expect(r.sinal).toBe(810);
  });

  it('ancoragem digitando o Valor de Tabela', () => {
    const r = calcularOrcamento({
      equipe: [{ nome: 'Flávia', diaria: 1000, dias: 1 }],
      custosVariaveis: {},
      markup: 0.4,
      ancoragem: { tipo: 'valor_tabela', valor: 1800 },
    });
    expect(r.valorFinal).toBe(1400);
    expect(r.desconto).toBe(400);
  });

  it('sinaliza markup efetivo abaixo de 30% (trava de segurança)', () => {
    const r = calcularOrcamento({
      equipe: [{ nome: 'Flávia', diaria: 1000, dias: 1 }],
      custosVariaveis: {},
      markup: 0.25,
      ancoragem: { tipo: 'nenhuma' },
    });
    expect(r.abaixoDoMinimo).toBe(true);
    expect(r.markupEfetivo).toBeCloseTo(0.25);
  });

  it('rejeita Valor de Tabela menor que o Valor Final', () => {
    expect(() =>
      calcularOrcamento({
        equipe: [{ nome: 'Flávia', diaria: 1000, dias: 1 }],
        custosVariaveis: {},
        markup: 0.4,
        ancoragem: { tipo: 'valor_tabela', valor: 1000 },
      }),
    ).toThrow();
  });
});

describe('distribuirValorTabela', () => {
  it('soma exatamente o Valor de Tabela em múltiplos de R$ 5', () => {
    const v = distribuirValorTabela(1905, [650, 400, 450, 405]);
    expect(v.reduce((s, x) => s + x, 0)).toBe(1905);
    expect(v).toEqual([650, 400, 450, 405]);
  });

  it('distribui por peso quando o total muda', () => {
    const v = distribuirValorTabela(2477, [3, 2, 2, 2]);
    expect(v.reduce((s, x) => s + x, 0)).toBe(2477);
  });
});
