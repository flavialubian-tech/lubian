import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { TIPOS_PARCEIRO } from './rotulos';

export function listarParceiros(empresaId: string) {
  return db
    .select({ id: schema.clientes.id, nome: schema.clientes.nome })
    .from(schema.clientes)
    .where(and(eq(schema.clientes.empresaId, empresaId), inArray(schema.clientes.tipo, TIPOS_PARCEIRO)))
    .orderBy(asc(schema.clientes.nome));
}
