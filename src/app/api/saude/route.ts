import { sql } from 'drizzle-orm';
import { after } from 'next/server';
import { db } from '@/db';
import { backupDoDiaSePreciso } from '@/lib/backup-nuvem';

export const dynamic = 'force-dynamic';

/**
 * Saúde do sistema: consulta o banco. Usada pelo "manter ativo" (.github/workflows/manter-ativo.yml),
 * que chama esta rota todo dia para o Supabase grátis não pausar o banco por falta de uso.
 * Também dispara o backup automático do dia (src/lib/backup-nuvem.ts), depois de responder.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    after(backupDoDiaSePreciso);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ ok: false, erro: 'Banco de dados indisponível' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
