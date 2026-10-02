import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scryptAsync(senha, sal, 64);
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`;
}

export async function conferirSenha(senha: string, armazenado: string): Promise<boolean> {
  const [alg, salB64, hashB64] = armazenado.split('$');
  if (alg !== 'scrypt' || !salB64 || !hashB64) return false;
  const esperado = Buffer.from(hashB64, 'base64');
  const hash = await scryptAsync(senha, Buffer.from(salB64, 'base64'), esperado.length);
  return timingSafeEqual(hash, esperado);
}
