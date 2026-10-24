import { describe, expect, it } from 'vitest';
import { convidarParaGoogle, limparIndicacoes, notaBaixa } from './pos-venda-regras';

describe('pós-venda', () => {
  it('Google só para 4 ou 5 estrelas e com link cadastrado', () => {
    expect(convidarParaGoogle(5, 'https://g.page/r/abc/review')).toBe(true);
    expect(convidarParaGoogle(4, 'https://g.page/r/abc/review')).toBe(true);
    expect(convidarParaGoogle(3, 'https://g.page/r/abc/review')).toBe(false);
    expect(convidarParaGoogle(5, '')).toBe(false);
    expect(convidarParaGoogle(5, null)).toBe(false);
    expect(notaBaixa(3)).toBe(true);
    expect(notaBaixa(4)).toBe(false);
  });

  it('indicações: ignora vazias, formata telefone, tira repetidas, máximo 2', () => {
    const r = limparIndicacoes([
      { nome: '  Ana  Paula ', telefone: '49988887777' },
      { nome: '', telefone: '' },
      { nome: 'Ana de novo', telefone: '+55 (49) 98888-7777' },
      { nome: 'Bruno', telefone: '(49) 3322-1100' },
      { nome: 'Carla', telefone: '49999990000' },
    ]);
    expect(r.erro).toBeUndefined();
    expect(r.validas).toEqual([
      { nome: 'Ana Paula', telefone: '(49) 98888-7777' },
      { nome: 'Bruno', telefone: '(49) 3322-1100' },
    ]);
  });

  it('indicações: explica o erro', () => {
    expect(limparIndicacoes([{ nome: '', telefone: '49988887777' }]).erro).toMatch(/nome/);
    expect(limparIndicacoes([{ nome: 'Ana', telefone: '98888777' }]).erro).toMatch(/Ana.*DDD/);
  });
});
