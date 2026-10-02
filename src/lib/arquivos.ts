/**
 * Armazenamento de arquivos (fotos das vistorias, comprovantes de pagamento).
 * - Com SUPABASE_URL + SUPABASE_SECRET_KEY: Supabase Storage (bucket privado SUPABASE_BUCKET, padrão "lubian").
 *   Na nuvem o disco do contêiner é apagado a cada reinício, então os arquivos precisam ficar lá.
 * - Sem elas (computador): disco, em .data/arquivos.
 * A chave do arquivo ("empresaId/uuid.ext") é a mesma nos dois casos.
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErroNegocio } from './erros';

const PASTA = process.env.ARQUIVOS_DIR ?? '.data/arquivos';
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_CHAVE = process.env.SUPABASE_SECRET_KEY;
const BUCKET = process.env.SUPABASE_BUCKET ?? 'lubian';
const naNuvem = Boolean(SUPABASE_URL && SUPABASE_CHAVE);

/** Chamada à API do Supabase Storage com a chave secreta (só no servidor). */
async function storage(metodo: 'POST' | 'GET' | 'DELETE', chave: string, corpo?: { conteudo: Buffer; tipo: string }) {
  const resposta = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${chave}`, {
    method: metodo,
    headers: {
      apikey: SUPABASE_CHAVE!,
      Authorization: `Bearer ${SUPABASE_CHAVE}`,
      ...(corpo && { 'Content-Type': corpo.tipo, 'x-upsert': 'false' }),
    },
    body: corpo ? new Uint8Array(corpo.conteudo) : undefined,
  });
  if (!resposta.ok) throw new Error(`Supabase Storage: ${metodo} ${chave} → ${resposta.status} ${await resposta.text()}`);
  return resposta;
}

const IMAGENS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
const TIPOS: Record<string, string> = { ...IMAGENS, 'application/pdf': 'pdf' };
export const TAMANHO_MAXIMO = 12 * 1024 * 1024;

/** Grava o arquivo; `aceitaPdf` para comprovantes (fotos de vistoria só aceitam imagem). */
export async function salvarArquivo(empresaId: string, arquivo: File, opcoes?: { aceitaPdf?: boolean }): Promise<string> {
  const ext = (opcoes?.aceitaPdf ? TIPOS : IMAGENS)[arquivo.type];
  if (!ext) throw new ErroNegocio(opcoes?.aceitaPdf ? 'Formato não suportado (use foto ou PDF)' : 'Formato de imagem não suportado');
  if (arquivo.size > TAMANHO_MAXIMO) throw new ErroNegocio('Arquivo muito grande (máx. 12 MB)');
  const chave = `${empresaId}/${randomUUID()}.${ext}`;
  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  if (naNuvem) {
    await storage('POST', chave, { conteudo, tipo: arquivo.type });
    return chave;
  }
  await mkdir(join(PASTA, empresaId), { recursive: true });
  await writeFile(join(PASTA, chave), conteudo);
  return chave;
}

export async function lerArquivo(chave: string) {
  const ext = chave.split('.').pop() ?? '';
  const tipo = Object.entries(TIPOS).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
  const conteudo = naNuvem ? Buffer.from(await (await storage('GET', chave)).arrayBuffer()) : await readFile(join(PASTA, chave));
  return { conteudo, tipo };
}

export async function apagarArquivo(chave: string) {
  if (naNuvem) await storage('DELETE', chave).catch(() => undefined);
  else await unlink(join(PASTA, chave)).catch(() => undefined);
}
