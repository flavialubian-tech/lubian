import { describe, expect, it } from 'vitest';
import { paginaParaSalvar } from './modo';

describe('PDF pelo navegador', () => {
  it('põe o botão no início do corpo e usa o nome do arquivo como título', () => {
    const html = '<html><head><title>Fatura X</title></head><body class="a4"><p>conteúdo</p></body></html>';
    const pagina = paginaParaSalvar(html, 'Recibo-REC-2026-0001.pdf');
    expect(pagina).toContain('<title>Recibo-REC-2026-0001</title>');
    expect(pagina).toMatch(/<body class="a4"><style>[\s\S]*Salvar em PDF[\s\S]*<\/div><p>conteúdo/);
    expect(pagina).toContain('@media print{.lubian-barra{display:none!important}}');
  });
});
