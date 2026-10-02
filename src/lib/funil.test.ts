import { describe, expect, it } from 'vitest';
import { situacaoNoFunil } from './funil';

const enviadoEm = new Date('2026-10-01T12:00:00Z');
const em = (dias: number) => new Date(enviadoEm.getTime() + dias * 86_400_000);
const base = { status: 'enviado' as const, enviadoEm, validadeDias: 7 };

describe('situacaoNoFunil', () => {
  it('nada a fazer no primeiro dia', () => {
    expect(situacaoNoFunil(base, em(1)).tipo).toBe('ok');
  });
  it('pede o 1º follow-up no 2º dia', () => {
    expect(situacaoNoFunil(base, em(2))).toMatchObject({ tipo: 'cobrar', etapa: 1 });
  });
  it('1º follow-up feito some até o 5º dia', () => {
    expect(situacaoNoFunil({ ...base, ultimoFollowUpEm: em(2.5) }, em(4)).tipo).toBe('ok');
    expect(situacaoNoFunil({ ...base, ultimoFollowUpEm: em(2.5) }, em(5))).toMatchObject({ tipo: 'cobrar', etapa: 2 });
  });
  it('expira no 7º dia', () => {
    expect(situacaoNoFunil(base, em(7)).tipo).toBe('expirado');
  });
  it('aprovado ou rascunho não entra no funil de cobrança', () => {
    expect(situacaoNoFunil({ ...base, status: 'aprovado' }, em(3)).tipo).toBe('ok');
    expect(situacaoNoFunil({ ...base, status: 'rascunho', enviadoEm: null }, em(3)).tipo).toBe('ok');
  });
});
