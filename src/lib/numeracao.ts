import { sql } from 'drizzle-orm';
import type { BancoDados } from '@/db';
import { schema } from '@/db';

/** Próximo número sequencial do ano, ex.: ORC-2026-0001. */
export async function proximoNumero(banco: BancoDados, empresaId: string, tipo: 'ORC' | 'REC' | 'FAT', ano = new Date().getFullYear()) {
  const [linha] = await banco
    .insert(schema.numeracao)
    .values({ empresaId, tipo, ano, ultimo: 1 })
    .onConflictDoUpdate({
      target: [schema.numeracao.empresaId, schema.numeracao.tipo, schema.numeracao.ano],
      set: { ultimo: sql`${schema.numeracao.ultimo} + 1` },
    })
    .returning({ ultimo: schema.numeracao.ultimo });
  return `${tipo}-${ano}-${String(linha.ultimo).padStart(4, '0')}`;
}
