/** Backup do banco e dos arquivos (modo local). Com o sistema fechado:  npm run backup */
import { PASTA_BACKUPS, fazerBackup, sistemaRodando } from './lib/backup-local';

if (await sistemaRodando()) {
  console.error('Feche o sistema (janela "Lubian Gestão") antes de fazer o backup manual.');
  console.error('Ele também é feito sozinho, uma vez por dia, ao abrir o sistema.');
  process.exit(1);
}
console.log(`Backup salvo em ${await fazerBackup()}`);
console.log(`(pasta de backups: ${PASTA_BACKUPS})`);
