import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';

export function listarClientesOpcoes(empresaId: string) {
  return db
    .select({ id: schema.clientes.id, nome: schema.clientes.nome })
    .from(schema.clientes)
    .where(eq(schema.clientes.empresaId, empresaId))
    .orderBy(asc(schema.clientes.nome));
}
