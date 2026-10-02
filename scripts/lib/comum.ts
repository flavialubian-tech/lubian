import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { gerarPdf, renderizarHtml, type ModeloDocumento } from '../../src/pdf/gerar-documento';

export const lerJson = async (caminho: string) => JSON.parse(await readFile(caminho, 'utf8'));

export const carregarEmpresa = () => lerJson('config/empresa.json');

/** Salva o PDF e uma cópia em HTML ao lado, para conferência. */
export async function salvarDocumento(modelo: ModeloDocumento, dados: Record<string, unknown>, saida: string) {
  const html = await renderizarHtml(modelo, dados);
  await mkdir(dirname(saida), { recursive: true });
  await writeFile(saida.replace(/\.pdf$/, '.html'), html);
  await writeFile(saida, await gerarPdf(html));
  console.log(`PDF gerado em ${saida}`);
}
