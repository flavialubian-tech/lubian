/**
 * Volta um backup baixado do sistema (lubian-AAAA-MM-DD.json.gz) num banco NOVO e vazio.
 *   DATABASE_URL=postgresql://... npm run backup:restaurar -- lubian-2026-10-24.json.gz
 * Sem DATABASE_URL, restaura no banco local (PGlite em .data/pglite, que precisa estar vazio).
 * Aplica as migrações antes; recusa se o banco já tiver dados (não mistura com dados existentes).
 */
import { readFileSync } from 'node:fs';
import { db, migrar } from '../src/db';
import { restaurarDados } from '../src/lib/backup-dados';

const caminho = process.argv[2];
if (!caminho) {
  console.error('Informe o arquivo: npm run backup:restaurar -- lubian-AAAA-MM-DD.json.gz');
  process.exit(1);
}
await migrar();
try {
  const { arquivo, resumo } = await restaurarDados(db, readFileSync(caminho));
  console.log(`Backup de ${arquivo.geradoEm} restaurado (migração ${arquivo.migracao ?? '?'}).`);
  for (const [tabela, n] of Object.entries(resumo)) if (n) console.log(`  ${tabela}: ${n}`);
  console.log('Fotos e comprovantes não vêm no arquivo: continuam no Storage (mesmo bucket).');
  process.exit(0);
} catch (e) {
  console.error('Não foi possível restaurar:', (e as Error).message);
  process.exit(1);
}
