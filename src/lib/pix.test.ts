import { describe, expect, it } from 'vitest';
import { crc16, normalizarChavePix, pixCopiaECola } from './pix';

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
});
