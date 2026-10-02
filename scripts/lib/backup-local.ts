/**
 * Backup e restauração do modo local (PGlite em .data/pglite + arquivos em .data/arquivos).
 * Só rodam com o sistema fechado: o PGlite não pode ser aberto por dois processos ao mesmo tempo.
 */
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { hojeSP } from '../../src/lib/agenda';
import { ARQUIVO_ULTIMO_BACKUP, backupsParaApagar, nomeBackup } from '../../src/lib/backup';

export const PASTA_BANCO = process.env.PGLITE_DIR ?? '.data/pglite';
export const PASTA_ARQUIVOS = process.env.ARQUIVOS_DIR ?? '.data/arquivos';
export const PASTA_BACKUPS = resolve(process.env.BACKUP_DIR ?? join(homedir(), 'Documents', 'Lubian Backups'));
export const PORTA = Number(process.env.PORT ?? 3000);

/** O sistema está aberto nesta porta? */
export async function sistemaRodando(porta = PORTA) {
  try {
    await fetch(`http://127.0.0.1:${porta}/login`, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

export async function ultimoBackup(): Promise<string | null> {
  return existsSync(ARQUIVO_ULTIMO_BACKUP) ? (await readFile(ARQUIVO_ULTIMO_BACKUP, 'utf8')).trim() || null : null;
}

/** Copia banco e arquivos para BACKUP_DIR/lubian-AAAA-MM-DD e apaga os antigos. Devolve a pasta criada. */
export async function fazerBackup(): Promise<string> {
  if (process.env.DATABASE_URL) throw new Error('Com DATABASE_URL (banco na nuvem) o backup é feito com pg_dump — veja docs/FASE-4.md.');
  if (!existsSync(PASTA_BANCO)) throw new Error(`Banco não encontrado em ${PASTA_BANCO}.`);
  const hoje = hojeSP();
  const destino = join(PASTA_BACKUPS, nomeBackup(hoje));
  const temporaria = `${destino}.parcial`;
  await rm(temporaria, { recursive: true, force: true });
  await mkdir(temporaria, { recursive: true });

  const pg = await PGlite.create(PASTA_BANCO);
  try {
    const dump = await pg.dumpDataDir('gzip');
    await writeFile(join(temporaria, 'banco.tar.gz'), Buffer.from(await dump.arrayBuffer()));
  } finally {
    await pg.close();
  }
  if (existsSync(PASTA_ARQUIVOS)) await cp(PASTA_ARQUIVOS, join(temporaria, 'arquivos'), { recursive: true });

  // Só troca o backup do dia quando o novo está completo.
  await rm(destino, { recursive: true, force: true });
  await rename(temporaria, destino);
  await writeFile(ARQUIVO_ULTIMO_BACKUP, hoje);

  for (const nome of backupsParaApagar(await readdir(PASTA_BACKUPS))) {
    await rm(join(PASTA_BACKUPS, nome), { recursive: true, force: true });
  }
  return destino;
}

/** Backups disponíveis, do mais novo para o mais antigo. */
export async function listarBackups(): Promise<string[]> {
  if (!existsSync(PASTA_BACKUPS)) return [];
  return (await readdir(PASTA_BACKUPS)).filter((n) => existsSync(join(PASTA_BACKUPS, n, 'banco.tar.gz'))).sort().reverse();
}

/**
 * Volta um backup. O banco e os arquivos atuais não são apagados: ficam ao lado,
 * renomeados com "-antes-<data e hora>", para o caso de arrependimento.
 */
export async function restaurarBackup(pasta: string): Promise<void> {
  const origem = existsSync(join(pasta, 'banco.tar.gz')) ? pasta : join(PASTA_BACKUPS, pasta);
  const arquivoBanco = join(origem, 'banco.tar.gz');
  if (!existsSync(arquivoBanco)) throw new Error(`Backup não encontrado: ${pasta}`);
  const carimbo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  if (existsSync(PASTA_BANCO)) await rename(PASTA_BANCO, `${PASTA_BANCO}-antes-${carimbo}`);
  const pg = await PGlite.create(PASTA_BANCO, { loadDataDir: new Blob([await readFile(arquivoBanco)]) });
  await pg.close();

  if (existsSync(join(origem, 'arquivos'))) {
    if (existsSync(PASTA_ARQUIVOS)) await rename(PASTA_ARQUIVOS, `${PASTA_ARQUIVOS}-antes-${carimbo}`);
    await cp(join(origem, 'arquivos'), PASTA_ARQUIVOS, { recursive: true });
  }
}
