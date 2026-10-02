/**
 * Conexão com o banco.
 * - Com DATABASE_URL (ex.: Supabase): PostgreSQL normal.
 * - Sem DATABASE_URL: PGlite (PostgreSQL embutido) gravando em .data/pglite — para
 *   desenvolvimento e testes, sem instalar nada.
 */
import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema';

export type BancoDados = PgDatabase<PgQueryResultHKT, typeof schema>;

function criar(): BancoDados {
  const url = process.env.DATABASE_URL;
  if (url) return drizzlePostgres(postgres(url, { prepare: false }), { schema }) as unknown as BancoDados;
  const dir = process.env.PGLITE_DIR ?? '.data/pglite';
  mkdirSync(dir, { recursive: true });
  return drizzlePglite(new PGlite(dir), { schema }) as unknown as BancoDados;
}

/** Aplica as migrações pendentes da pasta drizzle/. */
export async function migrar(banco: BancoDados = db) {
  const opcoes = { migrationsFolder: 'drizzle' };
  if (process.env.DATABASE_URL) {
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    await migrate(banco as never, opcoes);
  } else {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    await migrate(banco as never, opcoes);
  }
}

// Reaproveita a conexão entre recarregamentos do servidor de desenvolvimento.
const g = globalThis as unknown as { __lubianDb?: BancoDados };
export const db: BancoDados = (g.__lubianDb ??= criar());
export { schema };
