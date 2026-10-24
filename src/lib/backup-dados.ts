/**
 * Backup dos dados de uma empresa (formato portátil: JSON compactado com gzip).
 * Serve para o modo nuvem (Supabase) e para o modo local: o próprio banco gera e lê o JSON
 * (json_agg / json_populate_recordset), então datas, números e listas voltam exatamente iguais.
 * Não inclui os arquivos (fotos e comprovantes), que ficam no Storage, nem as sessões de login.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { sql, type SQL } from 'drizzle-orm';
import type { BancoDados } from '@/db';

/** Ordem das chaves estrangeiras: cada tabela vem depois das que ela referencia. */
export const TABELAS_BACKUP = [
  'empresas',
  'equipe',
  'usuarios',
  'clientes',
  'obras',
  'servicos',
  'vistorias',
  'vistoria_fotos',
  'orcamentos',
  'orcamento_eventos',
  'numeracao',
  'alocacoes',
  'bloqueios',
  'contratos',
  'faturas',
  'cobrancas',
  'pagamentos',
  'despesas',
  'acertos',
  'vales',
  'avaliacoes',
  'indicacoes',
  'fornecedores',
  'produtos',
] as const;

export interface ArquivoBackup {
  sistema: 'lubian-gestao';
  formato: 1;
  geradoEm: string;
  /** Última migração do banco quando o backup foi feito (restaurar numa versão igual ou mais nova). */
  migracao: string | null;
  empresaId: string;
  tabelas: Record<string, Record<string, unknown>[]>;
}

const linhas = (r: unknown) => ((r as { rows?: unknown[] }).rows ?? (r as unknown[])) as Record<string, unknown>[];

function filtro(tabela: string, empresaId: string): SQL {
  if (tabela === 'empresas') return sql`id = ${empresaId}`;
  if (tabela === 'vistoria_fotos') return sql`vistoria_id in (select id from vistorias where empresa_id = ${empresaId})`;
  if (tabela === 'orcamento_eventos') return sql`orcamento_id in (select id from orcamentos where empresa_id = ${empresaId})`;
  return sql`empresa_id = ${empresaId}`;
}

function ultimaMigracao(): string | null {
  try {
    const diario = JSON.parse(readFileSync(join(process.cwd(), 'drizzle', 'meta', '_journal.json'), 'utf8')) as { entries: { tag: string }[] };
    return diario.entries.at(-1)?.tag ?? null;
  } catch {
    return null;
  }
}

/** Todas as tabelas da empresa → JSON compactado. */
export async function exportarDados(banco: BancoDados, empresaId: string): Promise<{ conteudo: Buffer; resumo: Record<string, number> }> {
  const tabelas: ArquivoBackup['tabelas'] = {};
  for (const t of TABELAS_BACKUP) {
    const r = await banco.execute(sql`select coalesce(json_agg(x), '[]'::json) as dados from ${sql.identifier(t)} x where ${filtro(t, empresaId)}`);
    const dados = linhas(r)[0]?.dados;
    tabelas[t] = (typeof dados === 'string' ? JSON.parse(dados) : dados) as Record<string, unknown>[];
  }
  const arquivo: ArquivoBackup = { sistema: 'lubian-gestao', formato: 1, geradoEm: new Date().toISOString(), migracao: ultimaMigracao(), empresaId, tabelas };
  return { conteudo: gzipSync(JSON.stringify(arquivo)), resumo: Object.fromEntries(Object.entries(tabelas).map(([t, l]) => [t, l.length])) };
}

export function lerBackup(conteudo: Buffer): ArquivoBackup {
  const arquivo = JSON.parse(gunzipSync(conteudo).toString('utf8')) as ArquivoBackup;
  if (arquivo.sistema !== 'lubian-gestao' || arquivo.formato !== 1) throw new Error('Arquivo não é um backup do Lubian Gestão');
  return arquivo;
}

/** Volta um backup num banco já migrado e sem dados (não mistura com dados existentes). */
export async function restaurarDados(banco: BancoDados, conteudo: Buffer) {
  const arquivo = lerBackup(conteudo);
  const existentes = Number(linhas(await banco.execute(sql`select count(*)::int as n from empresas`))[0]?.n ?? 0);
  if (existentes > 0) throw new Error('O banco de destino já tem dados. Restaure num banco novo (vazio).');
  const resumo: Record<string, number> = {};
  for (const t of TABELAS_BACKUP) {
    const dados = arquivo.tabelas[t] ?? [];
    resumo[t] = dados.length;
    if (!dados.length) continue;
    await banco.execute(
      sql`insert into ${sql.identifier(t)} select * from json_populate_recordset(null::${sql.identifier(t)}, ${JSON.stringify(dados)}::json)`,
    );
  }
  return { arquivo, resumo };
}
