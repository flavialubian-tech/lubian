/**
 * Volta um backup (modo local). Com o sistema fechado:
 *   npm run restaurar                     → lista os backups
 *   npm run restaurar lubian-2026-10-02   → volta aquele dia (ou informe o caminho da pasta)
 */
import { PASTA_BACKUPS, listarBackups, restaurarBackup, sistemaRodando } from './lib/backup-local';

const escolhido = process.argv[2];
if (!escolhido) {
  const backups = await listarBackups();
  console.log(backups.length ? `Backups em ${PASTA_BACKUPS}:\n  ${backups.join('\n  ')}` : `Nenhum backup em ${PASTA_BACKUPS}.`);
  console.log('\nPara voltar um: npm run restaurar <nome>');
  process.exit(0);
}
if (await sistemaRodando()) {
  console.error('Feche o sistema (janela "Lubian Gestão") antes de restaurar.');
  process.exit(1);
}
await restaurarBackup(escolhido);
console.log(`Backup ${escolhido} restaurado. Os dados anteriores ficaram em .data/*-antes-*.`);
