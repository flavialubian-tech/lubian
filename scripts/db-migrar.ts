/** Aplica as migrações do banco.  npm run db:migrar */
import { migrar } from '../src/db';

await migrar();
console.log('Banco atualizado.');
