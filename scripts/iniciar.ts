/**
 * Abre o sistema no computador (modo local):  npm run iniciar  (ou dois cliques em iniciar-lubian.bat)
 * 1. backup do dia (antes de abrir o banco) · 2. cria/atualiza o banco · 3. compila se o código mudou
 * 4. sobe o servidor na rede local e abre o navegador. Fechar a janela encerra o sistema.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { hojeSP } from '../src/lib/agenda';
import { enderecosLocais } from '../src/lib/rede';
import { PASTA_BACKUPS, PASTA_BANCO, PORTA, fazerBackup, sistemaRodando, ultimoBackup } from './lib/backup-local';

const local = `http://localhost:${PORTA}`;

function abrirNavegador(url: string) {
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]] : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  spawn(cmd, args as string[], { stdio: 'ignore', detached: true, windowsVerbatimArguments: process.platform === 'win32' })
    .on('error', () => console.log(`Abra no navegador: ${url}`))
    .unref();
}

function rodar(comando: string) {
  const r = spawnSync(comando, { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`\nFalhou: ${comando}`);
    process.exit(r.status ?? 1);
  }
}

/** Arquivo mais novo (mtime) dentro das pastas/arquivos indicados. */
function maisNovo(caminhos: string[]): number {
  let maior = 0;
  const visitar = (p: string) => {
    if (!existsSync(p)) return;
    const s = statSync(p);
    if (s.isDirectory()) for (const f of readdirSync(p)) visitar(join(p, f));
    else maior = Math.max(maior, s.mtimeMs);
  };
  caminhos.forEach(visitar);
  return maior;
}

if (await sistemaRodando()) {
  console.log(`O sistema já está aberto. Abrindo ${local}`);
  abrirNavegador(local);
  process.exit(0);
}

// 1. Backup diário (o PGlite precisa estar fechado, por isso antes do servidor).
if (!process.env.DATABASE_URL && existsSync(PASTA_BANCO) && (await ultimoBackup()) !== hojeSP()) {
  try {
    console.log(`Fazendo o backup do dia em ${PASTA_BACKUPS} ...`);
    console.log(`Backup salvo em ${await fazerBackup()}`);
  } catch (erro) {
    console.error('⚠️  O backup falhou (o sistema abre mesmo assim):', (erro as Error).message);
  }
}

// 2. Banco: aplica migrações e, na primeira vez, cria a empresa e os usuários.
rodar('npm run db:semear');

// 3. Compila quando ainda não há versão compilada ou o código mudou depois dela.
const compilado = '.next/BUILD_ID';
if (!existsSync(compilado) || maisNovo(['src', 'next.config.ts', 'package-lock.json', 'postcss.config.mjs']) > statSync(compilado).mtimeMs) {
  console.log('Preparando o sistema (só demora na primeira vez e depois de atualizações)...');
  rodar('npm run build');
}

// 4. Servidor em todas as interfaces (celulares no mesmo Wi-Fi conseguem abrir).
const servidor = spawn('npm', ['start', '--', '-H', '0.0.0.0', '-p', String(PORTA)], { stdio: 'inherit', shell: true });
servidor.on('exit', (codigo) => process.exit(codigo ?? 0));

for (let i = 0; i < 60 && !(await sistemaRodando()); i++) await new Promise((r) => setTimeout(r, 1000));
console.log('\n==============================================');
console.log(' Lubian Gestão aberto. NÃO feche esta janela.');
console.log(`  Neste computador: ${local}`);
for (const e of enderecosLocais(PORTA)) console.log(`  Celular no mesmo Wi-Fi: ${e}`);
console.log('==============================================\n');
abrirNavegador(local);
