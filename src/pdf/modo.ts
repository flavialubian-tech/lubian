/**
 * Onde o PDF é feito.
 * - Padrão: no servidor, com Chromium (src/pdf/gerar-documento.ts).
 * - PDF_PELO_NAVEGADOR=1 (hospedagem grátis com pouca memória, ex.: Render Free): o servidor devolve a página
 *   do documento com um botão "Salvar em PDF / Imprimir" e o navegador de quem abre faz o PDF.
 */
export const pdfPeloNavegador = () => process.env.PDF_PELO_NAVEGADOR === '1';

const BARRA = `<style>
.lubian-barra{position:sticky;top:0;z-index:9999;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:center;
  padding:10px 16px;background:#1e3a8a;color:#fff;font:600 14px system-ui,-apple-system,'Segoe UI',sans-serif}
.lubian-barra button{background:#facc15;color:#0f172a;border:0;border-radius:8px;padding:9px 18px;font:700 15px system-ui,sans-serif;cursor:pointer}
@media print{.lubian-barra{display:none!important}}
</style>
<div class="lubian-barra">
  <button type="button" onclick="window.print()">Salvar em PDF / Imprimir</button>
  <span>Na janela que abrir, em <b>Destino</b>, escolha <b>Salvar como PDF</b>.</span>
</div>`;

/** Página do documento pronta para o navegador salvar em PDF (o título vira o nome sugerido do arquivo). */
export function paginaParaSalvar(html: string, nomeArquivo: string) {
  const titulo = nomeArquivo.replace(/\.pdf$/i, '').replace(/[<>&]/g, '');
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${titulo}</title>`).replace(/<body([^>]*)>/i, `<body$1>${BARRA}`);
}

export function respostaPaginaParaSalvar(html: string, nomeArquivo: string) {
  return new Response(paginaParaSalvar(html, nomeArquivo), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
