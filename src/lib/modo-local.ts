/** Situação do modo local (sistema rodando no computador, sem DATABASE_URL): backup e endereços na rede. */
import 'server-only';
import { readFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import { hojeSP } from './agenda';
import { ARQUIVO_ULTIMO_BACKUP, backupAtrasado, diasEntre } from './backup';
import { enderecosLocais } from './rede';

export const modoLocal = () => !process.env.DATABASE_URL;

/** Aviso para o painel quando o backup está atrasado; null quando está em dia (ou fora do modo local). */
export async function avisoBackup(): Promise<string | null> {
  if (!modoLocal()) return null;
  const ultimo = (await readFile(ARQUIVO_ULTIMO_BACKUP, 'utf8').catch(() => '')).trim() || null;
  const hoje = hojeSP();
  if (!backupAtrasado(ultimo, hoje)) return null;
  return ultimo
    ? `O último backup foi há ${diasEntre(ultimo, hoje)} dias. Feche e abra o sistema pelo atalho para fazer um novo.`
    : 'Ainda não há backup. Feche e abra o sistema pelo atalho (iniciar-lubian) para fazer o primeiro.';
}

/** Endereços para abrir no celular (mesmo Wi-Fi), cada um com seu QR Code. */
export async function acessoPelaRede() {
  if (!modoLocal()) return [];
  return Promise.all(enderecosLocais().map(async (url) => ({ url, qr: await QRCode.toDataURL(url, { margin: 1, width: 200 }) })));
}
