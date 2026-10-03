import 'server-only';
import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { db, schema } from '@/db';

/** Dados da empresa (nome, chave Pix, cidade...) — uma consulta por requisição. */
export const buscarEmpresa = cache(async (empresaId: string) => {
  const empresa = await db.query.empresas.findFirst({ where: eq(schema.empresas.id, empresaId) });
  if (!empresa) throw new Error('Empresa não encontrada');
  return empresa;
});
