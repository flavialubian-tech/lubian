import { describe, expect, it } from 'vitest';
import { linkWhatsApp, semEmojis } from './formato';

describe('mensagens do WhatsApp sem emojis', () => {
  it('tira emojis e mantém acentos, travessão, negrito e quebras de linha', () => {
    expect(semEmojis('Olá, Roberta! 😊\n\n💼 Saldo final: *R$ 409,50*\n🗓️ Validade — Pix › Copia e cola ✨ fim 🤝')).toBe(
      'Olá, Roberta!\n\nSaldo final: *R$ 409,50*\nValidade — Pix › Copia e cola fim',
    );
    expect(semEmojis('👍🏽 ok 👨‍👩‍👧 família')).toBe('ok família');
  });

  it('o link do WhatsApp leva o texto limpo', () => {
    const link = linkWhatsApp('(49) 98890-7454', 'Olá! 😊 Tudo bem? ✓');
    expect(link).toBe(`https://wa.me/5549988907454?text=${encodeURIComponent('Olá! Tudo bem? ✓')}`);
  });
});
