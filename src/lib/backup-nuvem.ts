/**
 * Backup automático no modo nuvem: uma cópia por dia no Supabase Storage ("_backups/<empresa>/lubian-AAAA-MM-DD.json.gz"),
 * mantendo 30 diárias + a última de cada mês (12 meses). Disparado pela rota /api/saude, que o UptimeRobot chama a cada 5 minutos.
 */
import 'server-only';
import { db } from '@/db';
import { hojeSP } from './agenda';
import { apagarObjetos, guardarObjeto, lerObjeto, listarObjetos, storageConfigurado } from './arquivos';
import { backupsParaApagar } from './backup';
import { exportarDados } from './backup-dados';

const PASTA = '_backups';
const EXTENSAO = '.json.gz';
const NOME = /^lubian-\d{4}-\d{2}-\d{2}\.json\.gz$/;

const pasta = (empresaId: string) => `${PASTA}/${empresaId}`;
export const nomeBackupNuvem = (data: string) => `lubian-${data}${EXTENSAO}`;

let feitoEm: string | null = null;
let emAndamento = false;

/** Faz o backup do dia (uma vez por dia por servidor) e apaga os antigos. Erros só vão para o log. */
export async function backupDoDiaSePreciso() {
  if (!storageConfigurado()) return;
  const hoje = hojeSP();
  if (feitoEm === hoje || emAndamento) return;
  emAndamento = true;
  try {
    for (const empresa of await db.query.empresas.findMany({ columns: { id: true } })) {
      const existentes = await listarObjetos(pasta(empresa.id));
      if (!existentes.some((o) => o.nome === nomeBackupNuvem(hoje))) {
        const { conteudo } = await exportarDados(db, empresa.id);
        await guardarObjeto(`${pasta(empresa.id)}/${nomeBackupNuvem(hoje)}`, conteudo, 'application/gzip');
        console.log(`Backup automático salvo: ${nomeBackupNuvem(hoje)} (${conteudo.length} bytes)`);
      }
      const nomes = [...new Set([...existentes.map((o) => o.nome), nomeBackupNuvem(hoje)])].filter((n) => NOME.test(n));
      const apagar = backupsParaApagar(nomes.map((n) => n.slice(0, -EXTENSAO.length)));
      await apagarObjetos(apagar.map((n) => `${pasta(empresa.id)}/${n}${EXTENSAO}`));
    }
    feitoEm = hoje;
  } catch (e) {
    console.error('Backup automático falhou:', e);
  } finally {
    emAndamento = false;
  }
}

/** Backups automáticos guardados (mais novo primeiro). */
export async function listarBackupsNuvem(empresaId: string) {
  if (!storageConfigurado()) return [];
  return (await listarObjetos(pasta(empresaId)))
    .filter((o) => NOME.test(o.nome))
    .map((o) => ({ ...o, data: o.nome.slice(7, 17) }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

export async function lerBackupNuvem(empresaId: string, nome: string) {
  if (!NOME.test(nome)) throw new Error('Nome de backup inválido');
  return lerObjeto(`${pasta(empresaId)}/${nome}`);
}
