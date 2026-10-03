import { describe, expect, it } from 'vitest';
import { cnpjValido, cpfValido, crc16, erroChavePix, normalizarChavePix, pixCopiaECola } from './pix';

describe('Pix copia e cola', () => {
  it('CRC16 confere com o exemplo do manual do BR Code (Banco Central)', () => {
    const exemplo =
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
    expect(crc16(exemplo)).toBe('1D3D');
  });

  it('monta o código da Lubian com valor, cidade sem acento e identificador', () => {
    const codigo = pixCopiaECola({
      chave: '44.883.814/0001-97',
      nome: 'Lubian Limpezas',
      cidade: 'Chapecó/SC',
      valor: 1250.5,
      identificador: 'ORC-2026-0012',
    });
    expect(codigo).toContain('0014br.gov.bcb.pix011444883814000197');
    expect(codigo).toContain('54071250.50');
    expect(codigo).toContain('5915Lubian Limpezas6007Chapeco');
    expect(codigo).toContain('62150511ORC20260012');
    expect(codigo.slice(-8, -4)).toBe('6304');
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
  });

  it('sem valor e sem identificador usa ***', () => {
    const codigo = pixCopiaECola({ chave: 'contato@lubian.com.br', nome: 'Lubian', cidade: 'Chapecó' });
    expect(codigo).not.toMatch(/54\d\d\d/);
    expect(codigo).toContain('62070503***');
  });

  it('normaliza só CPF/CNPJ', () => {
    expect(normalizarChavePix('44.883.814/0001-97')).toBe('44883814000197');
    expect(normalizarChavePix('123.456.789-09')).toBe('12345678909');
    expect(normalizarChavePix('+5549988907454')).toBe('+5549988907454');
    expect(normalizarChavePix('contato@lubian.com.br')).toBe('contato@lubian.com.br');
  });

  it('confere CPF e CNPJ pelos dígitos verificadores', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224726')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cnpjValido('44.883.814/0001-97')).toBe(true);
    expect(cnpjValido('44.883.814/0001-98')).toBe(false);
  });

  it('valida a chave Pix e explica o erro', () => {
    expect(erroChavePix('52998224725')).toBeNull();
    expect(erroChavePix('529.982.247-25')).toBeNull();
    expect(erroChavePix('52998224726')).toMatch(/CPF inválido/);
    expect(erroChavePix('contato@lubian.com.br')).toBeNull();
    expect(erroChavePix('+5549988907454')).toBeNull();
    expect(erroChavePix('49988907454')).toMatch(/\+55/); // celular sem +55 parece CPF: a mensagem orienta
    expect(erroChavePix('123e4567-e89b-12d3-a456-426614174000')).toBeNull();
    expect(erroChavePix('')).toMatch(/Informe/);
  });

  it('CPF de pessoa física no BR Code', () => {
    const codigo = pixCopiaECola({ chave: '529.982.247-25', nome: 'Lubian Limpezas', cidade: 'Chapecó/SC', valor: 1 });
    expect(codigo).toContain('01115299822472552040000');
    expect(codigo).toContain('54041.00');
  });
});
