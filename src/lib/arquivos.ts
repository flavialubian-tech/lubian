/**
 * Armazenamento de arquivos (fotos das vistorias).
 * Hoje grava em disco (.data/arquivos). Ao ir para produção, trocar por Supabase Storage
 * mantendo as mesmas duas funções.
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PASTA = process.env.ARQUIVOS_DIR ?? '.data/arquivos';
const TIPOS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
export const TAMANHO_MAXIMO = 12 * 1024 * 1024;

export async function salvarArquivo(empresaId: string, arquivo: File): Promise<string> {
  const ext = TIPOS[arquivo.type];
  if (!ext) throw new Error('Formato de imagem não suportado');
  if (arquivo.size > TAMANHO_MAXIMO) throw new Error('Imagem muito grande (máx. 12 MB)');
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
