import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';

export function listarServicosAtivos(empresaId: string) {
  return db
    .select({ id: schema.servicos.id, nome: schema.servicos.nome, exigeNr35: schema.servicos.exigeNr35 })
    .from(schema.servicos)
    .where(and(eq(schema.servicos.empresaId, empresaId), eq(schema.servicos.ativo, true)))
    .orderBy(asc(schema.servicos.nome));
}
