import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import Handlebars from 'handlebars';
import { chromium } from 'playwright-core';
import { caminhoNavegador } from './navegador';

// Caminhos relativos à raiz do projeto (de onde o servidor e os scripts rodam).
const RAIZ = process.cwd();
const PASTA_TEMPLATES = join(RAIZ, 'templates');

const hb = Handlebars.create();
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
// Intl usa espaço não separável depois de "R$"; trocamos por espaço comum como nos modelos.
hb.registerHelper('moeda', (v: number) => formatoMoeda.format(v).replace(/\u00a0/g, ' '));
hb.registerHelper('inc', (i: number) => i + 1);
hb.registerHelper('maiusculas', (s: string) => (s ?? '').toLocaleUpperCase('pt-BR'));
hb.registerHelper('percentual', (v: number) => `${Math.round(v * 1000) / 10}%`.replace('.', ','));
hb.registerHelper('diarias', (n: number) => `${n} ${n === 1 ? 'diária' : 'diárias'}`);
hb.registerHelper('Diarias', (n: number) => `${n} ${n === 1 ? 'Diária' : 'Diárias'}`);
hb.registerHelper('listaDias', (dias: number[]) => dias.map((d) => String(d).padStart(2, '0')).join(', '));

export type ModeloDocumento = 'orcamento-tecnico' | 'fatura-mensal' | 'recibo';

const TIPOS_IMAGEM: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp' };

/** Logo salvo no repositório (ex.: "assets/logo.png") vai embutido no PDF, sem depender da internet. */
async function embutirLogo(logoUrl: string | null | undefined): Promise<string | null | undefined> {
  if (!logoUrl || /^(https?:|data:)/.test(logoUrl)) return logoUrl;
  const tipo = TIPOS_IMAGEM[extname(logoUrl).slice(1).toLowerCase()] ?? 'application/octet-stream';
  return `data:${tipo};base64,${(await readFile(join(RAIZ, logoUrl))).toString('base64')}`;
}

export async function renderizarHtml(
  modelo: ModeloDocumento,
  dados: { empresa?: { logoUrl?: string | null } } & Record<string, unknown>,
): Promise<string> {
  const fonte = await readFile(join(PASTA_TEMPLATES, `${modelo}.html`), 'utf8');
  const empresa = dados.empresa && { ...dados.empresa, logoUrl: await embutirLogo(dados.empresa.logoUrl) };
  return hb.compile(fonte)({ ...dados, empresa });
}

export async function gerarPdf(html: string): Promise<Buffer> {
  const executablePath = caminhoNavegador();
  const browser = await chromium.launch({ executablePath }).catch((erro: Error) => {
    throw new Error(
      `Não foi possível abrir o navegador para gerar o PDF (${executablePath ?? 'padrão do Playwright'}). ` +
        'Instale o Google Chrome ou informe CHROMIUM_PATH no arquivo .env.local.',
      { cause: erro },
    );
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    // As margens ficam no @media print do próprio modelo.
    return await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  } finally {
    await browser.close();
  }
}
