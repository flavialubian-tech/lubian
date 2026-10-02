/**
 * Backup do modo local (sem DATABASE_URL): regras puras de nome e de retenção.
 * Cada backup é uma pasta "lubian-AAAA-MM-DD" dentro de BACKUP_DIR, com banco.tar.gz e arquivos/.
 */

export const PREFIXO_BACKUP = 'lubian-';
const PADRAO = /^lubian-(\d{4})-(\d{2})-(\d{2})$/;

export const nomeBackup = (data: string) => `${PREFIXO_BACKUP}${data}`;

/** Data (AAAA-MM-DD) de uma pasta de backup, ou null se o nome não é de backup. */
export function dataDoBackup(nome: string): string | null {
  const m = PADRAO.exec(nome);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * Quais pastas apagar: ficam os `diarios` backups mais recentes e, dos `mensais` meses mais recentes,
 * o último backup de cada mês. Nomes que não são de backup nunca são apagados.
 */
export function backupsParaApagar(nomes: string[], diarios = 30, mensais = 12): string[] {
  const backups = nomes
    .map((nome) => ({ nome, data: dataDoBackup(nome) }))
    .filter((b): b is { nome: string; data: string } => b.data !== null)
    .sort((a, b) => b.data.localeCompare(a.data));
  const manter = new Set(backups.slice(0, diarios).map((b) => b.nome));
  const meses = new Set<string>();
  for (const b of backups) {
    const mes = b.data.slice(0, 7);
    if (meses.has(mes)) continue;
    if (meses.size >= mensais) break;
    meses.add(mes);
    manter.add(b.nome);
  }
  return backups.filter((b) => !manter.has(b.nome)).map((b) => b.nome);
}

/** Dias inteiros entre duas datas AAAA-MM-DD (b − a). */
export function diasEntre(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Aviso do painel: sem backup, ou o último tem mais de `limite` dias. */
export function backupAtrasado(ultimo: string | null, hoje: string, limite = 3) {
  return ultimo === null || diasEntre(ultimo, hoje) > limite;
}

/** Onde o sistema anota a data do último backup bem-sucedido (lido pelo painel). */
export const ARQUIVO_ULTIMO_BACKUP = '.data/ultimo-backup.txt';
