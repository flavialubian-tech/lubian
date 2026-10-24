import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { obterSessao } from '@/lib/auth';
import { hojeSP } from '@/lib/agenda';
import { exportarDados } from '@/lib/backup-dados';
import { lerBackupNuvem } from '@/lib/backup-nuvem';

/**
 * Baixar backup (só Gestão): sem parâmetro, gera agora; com ?nome=lubian-AAAA-MM-DD.json.gz, baixa um automático.
 * Registra a data do download para o lembrete do Painel.
 */
export async function GET(req: Request) {
  const sessao = await obterSessao();
  if (!sessao || sessao.perfil !== 'gestao') return new Response('Não autorizado', { status: 401 });
  const nome = new URL(req.url).searchParams.get('nome');
  let conteudo: Buffer;
  let arquivo: string;
  try {
    if (nome) {
      conteudo = await lerBackupNuvem(sessao.empresaId, nome);
      arquivo = nome;
    } else {
      conteudo = (await exportarDados(db, sessao.empresaId)).conteudo;
      arquivo = `lubian-${hojeSP()}.json.gz`;
    }
  } catch (e) {
    console.error(e);
    return new Response('Backup não encontrado', { status: 404 });
  }
  await db.update(schema.empresas).set({ backupBaixadoEm: new Date() }).where(eq(schema.empresas.id, sessao.empresaId));
  return new Response(new Uint8Array(conteudo), {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${arquivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
