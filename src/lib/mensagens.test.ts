import { describe, expect, it } from 'vitest';
import { mensagemCobrarSaldo, mensagemRecibo } from './mensagens';

describe('mensagens de recibo e saldo', () => {
  it('recibo do sinal confirma a agenda e leva o link', () => {
    const m = mensagemRecibo({ clienteNome: 'Raíssa Souza', tipo: 'sinal', valor: 810, numero: 'REC-2026-0003', obraNome: 'Residência', link: 'https://x/r/abc' });
    expect(m).toMatch(/^Olá, Raíssa!/);
    expect(m).toContain('Recebemos o Pix do sinal de Residência: *R$ 810,00*');
    expect(m).toContain('*confirmada*');
    expect(m).toContain('recibo REC-2026-0003');
    expect(m.endsWith('https://x/r/abc')).toBe(true);
  });

  it('recibo de quitação não fala de agenda', () => {
    const m = mensagemRecibo({ clienteNome: 'Ana', tipo: 'saldo', valor: 810, link: 'L' });
    expect(m).toContain('o pagamento final (quitação)');
    expect(m).not.toContain('agenda');
  });

  it('cobrança do saldo: serviço finalizado, valor, link e Pix no fim', () => {
    const m = mensagemCobrarSaldo({ clienteNome: 'Ana Maria', obraNome: 'Apto 101', valor: 1200.5, link: 'https://x/p/tok', pix: '000201FAKE' });
    expect(m).toContain('*finalizou o serviço* em Apto 101');
    expect(m).toContain('*R$ 1.200,50*');
    expect(m).toContain('https://x/p/tok');
    expect(m.endsWith('000201FAKE')).toBe(true);
  });
});

describe('cotação com o fornecedor', () => {
  it('lista quantidade, unidade e produto', async () => {
    const { mensagemCotacao } = await import('./mensagens');
    const m = mensagemCotacao({
      fornecedorNome: 'Gmix',
      itens: [
        { nome: 'Detergente neutro', unidade: 'galão 5 L', quantidade: 2 },
        { nome: 'Removedor de cimento', unidade: 'litro', quantidade: 1.5 },
      ],
    });
    expect(m).toMatch(/^Olá, Gmix! Tudo bem\?/);
    expect(m).toContain('- 2 galão 5 L — Detergente neutro');
    expect(m).toContain('- 1,5 litro — Removedor de cimento');
  });
});
