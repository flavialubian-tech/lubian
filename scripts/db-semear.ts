/**
 * Cria a empresa Lubian, usuários iniciais, equipe, catálogo de serviços e dados de exemplo.
 *   npm run db:semear
 * Senha inicial dos usuários: SENHA_INICIAL (padrão "lubian2026") — troque no primeiro acesso.
 */
import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, migrar, schema } from '../src/db';
import { conteudoPadrao } from '../src/lib/padroes';
import { salvarOrcamento } from '../src/lib/orcamentos';
import { gerarHashSenha } from '../src/lib/senha';

await migrar();

if (await db.query.empresas.findFirst()) {
  console.log('O banco já tem dados; nada a fazer.');
  process.exit(0);
}

const cfg = JSON.parse(await readFile('config/empresa.json', 'utf8'));
const [empresa] = await db
  .insert(schema.empresas)
  .values({ ...cfg, chavePix: cfg.cnpj })
  .returning();
const empresaId = empresa.id;

const membros = await db
  .insert(schema.equipe)
  .values([
    { empresaId, nome: 'Flávia', funcao: 'lider', diariaPadrao: '250', cor: '#1e3a8a', nr35: true },
    { empresaId, nome: 'Anderson', funcao: 'lider', diariaPadrao: '230', cor: '#0284c7', nr35: true },
    { empresaId, nome: 'Leandro', funcao: 'auxiliar', diariaPadrao: '200', cor: '#16a34a' },
    { empresaId, nome: 'Nicoly', funcao: 'auxiliar', diariaPadrao: '180', cor: '#d97706' },
  ])
  .returning();
const membro = (nome: string) => membros.find((m) => m.nome === nome)!.id;

const senhaHash = await gerarHashSenha(process.env.SENHA_INICIAL ?? 'lubian2026');
const [flavia] = await db
  .insert(schema.usuarios)
  .values([
    { empresaId, nome: 'Flávia', email: 'flavia@lubian.local', senhaHash, perfil: 'gestao', membroEquipeId: membro('Flávia') },
    { empresaId, nome: 'Bruna', email: 'bruna@lubian.local', senhaHash, perfil: 'administrativo' },
    { empresaId, nome: 'Anderson', email: 'anderson@lubian.local', senhaHash, perfil: 'lider', membroEquipeId: membro('Anderson') },
  ])
  .returning();

const servicos = await db
  .insert(schema.servicos)
  .values([
    { empresaId, nome: 'Limpeza Intermediária (Pré-Marcenaria)', precoM2Min: '11', precoM2Max: '14' },
    { empresaId, nome: 'Limpeza Final (Handover)', precoM2Min: '15', precoM2Max: '18' },
    { empresaId, nome: 'Desincrustação Técnica Pesada' },
    { empresaId, nome: 'Vidros e Fachadas em Altura (NR-35)', exigeNr35: true },
    { empresaId, nome: 'Limpeza Recorrente / Mensal' },
  ])
  .returning();

const [regiane, raissa] = await db
  .insert(schema.clientes)
  .values([
    { empresaId, tipo: 'arquiteto', nome: 'Regiane (Arquiteta)', telefone: '(49) 99999-0001' },
    { empresaId, tipo: 'pessoa_fisica', nome: 'Raíssa', telefone: '(49) 99999-0002', prazoPagamento: '50% sinal / 50% entrega' },
    { empresaId, tipo: 'pessoa_fisica', nome: 'Christian Dalla Rosa', telefone: '(49) 99999-0003' },
    { empresaId, tipo: 'empresa', nome: 'CREDCREA', enderecoCobranca: 'Sede administrativa', prazoPagamento: '10 dias úteis após entrega e NF' },
  ])
  .returning();
await db.update(schema.clientes).set({ indicadoPorId: regiane.id }).where(eq(schema.clientes.id, raissa.id));

const [obra] = await db
  .insert(schema.obras)
  .values({ empresaId, clienteId: raissa.id, nome: 'Residência - 2 Pavimentos', tipoImovel: 'Casa', areaM2: '140', parceiroId: regiane.id })
  .returning();

// Orçamento de exemplo (modelo Raíssa).
const ex = JSON.parse(await readFile('exemplos/orcamento-raissa.json', 'utf8'));
const conteudo = {
  ...conteudoPadrao({ tipoServico: ex.servico.tipo, areaM2: 140, localTexto: ex.obra.local }),
  cronograma: ex.servico.cronograma,
  informacoes: ex.informacoes,
  parecer: ex.parecer,
  escopo: ex.escopo,
  valorAgregado: ex.valorAgregado,
  incluidos: ex.incluidos,
  responsabilidades: ex.responsabilidades,
  descricaoSubtotal: ex.descricaoSubtotal,
  rotuloDesconto: ex.rotuloDesconto,
};
await salvarOrcamento({ empresaId, usuarioId: flavia.id }, null, {
  clienteId: raissa.id,
  obraId: obra.id,
  servicoId: servicos[1].id,
  vistoriaId: null,
  validadeDias: 7,
  precificacao: ex.precificacao,
  conteudo,
});

console.log('Dados iniciais criados. Acesse com flavia@lubian.local / bruna@lubian.local.');
