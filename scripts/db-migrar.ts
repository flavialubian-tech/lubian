/** Aplica as migrações do banco.  npm run db:migrar */
import { migrar } from '../src/db';

await migrar();
console.log('Banco atualizado.');
// O PGlite mantém o processo aberto; sem isto o comando não termina no modo local.
process.exit(0);
