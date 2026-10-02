/**
 * Armazenamento de arquivos (fotos das vistorias, comprovantes de pagamento).
 * Hoje grava em disco (.data/arquivos). Ao ir para produção, trocar por Supabase Storage
 * mantendo as mesmas duas funções.
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErroNegocio } from './erros';

const PASTA = process.env.ARQUIVOS_DIR ?? '.data/arquivos';
const IMAGENS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
const TIPOS: Record<string, string> = { ...IMAGENS, 'application/pdf': 'pdf' };
export const TAMANHO_MAXIMO = 12 * 1024 * 1024;

/** Grava o arquivo; `aceitaPdf` para comprovantes (fotos de vistoria só aceitam imagem). */
export async function salvarArquivo(empresaId: string, arquivo: File, opcoes?: { aceitaPdf?: boolean }): Promise<string> {
  const ext = (opcoes?.aceitaPdf ? TIPOS : IMAGENS)[arquivo.type];
  if (!ext) throw new ErroNegocio(opcoes?.aceitaPdf ? 'Formato não suportado (use foto ou PDF)' : 'Formato de imagem não suportado');
  if (arquivo.size > TAMANHO_MAXIMO) throw new ErroNegocio('Arquivo muito grande (máx. 12 MB)');
  const chave = `${empresaId}/${randomUUID()}.${ext}`;
  await mkdir(join(PASTA, empresaId), { recursive: true });
  await writeFile(join(PASTA, chave), Buffer.from(await arquivo.arrayBuffer()));
  return chave;
}

export async function lerArquivo(chave: string) {
  const ext = chave.split('.').pop() ?? '';
  const tipo = Object.entries(TIPOS).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
  return { conteudo: await readFile(join(PASTA, chave)), tipo };
}

export async function apagarArquivo(chave: string) {
  await unlink(join(PASTA, chave)).catch(() => undefined);
}
