/**
 * Esquema do banco (PostgreSQL). Toda tabela de negócio tem `empresaId`, para que o
 * sistema possa atender outras empresas no futuro (multiempresa).
 */
import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { EntradaOrcamento, ResultadoOrcamento } from '../precificacao';

const id = () => uuid('id').primaryKey().defaultRandom();
const criadoEm = () => timestamp('criado_em', { withTimezone: true }).notNull().defaultNow();
const empresaId = () =>
  uuid('empresa_id')
    .notNull()
    .references(() => empresas.id);
/** Valores em reais com 2 casas; o driver devolve string, use Number() ao ler. */
const dinheiro = (nome: string) => numeric(nome, { precision: 12, scale: 2 });

export const perfilEnum = pgEnum('perfil', ['gestao', 'administrativo', 'lider', 'auxiliar']);
export const tipoClienteEnum = pgEnum('tipo_cliente', ['pessoa_fisica', 'arquiteto', 'construtora', 'empresa', 'imobiliaria']);
export const funcaoEquipeEnum = pgEnum('funcao_equipe', ['lider', 'auxiliar']);
export const statusOrcamentoEnum = pgEnum('status_orcamento', ['rascunho', 'enviado', 'aprovado', 'recusado']);

export const empresas = pgTable('empresas', {
  id: id(),
  nome: text('nome').notNull(),
  slogan: text('slogan'),
  cnpj: text('cnpj'),
  endereco: text('endereco'),
  telefone: text('telefone'),
  cidade: text('cidade'),
  logoUrl: text('logo_url'),
  chavePix: text('chave_pix'),
  criadoEm: criadoEm(),
});

export const usuarios = pgTable('usuarios', {
  id: id(),
  empresaId: empresaId(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  perfil: perfilEnum('perfil').notNull(),
  membroEquipeId: uuid('membro_equipe_id').references(() => equipe.id),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: criadoEm(),
});

export const sessoes = pgTable('sessoes', {
  /** sha256 do token guardado no cookie */
  id: text('id').primaryKey(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
});

export const clientes = pgTable('clientes', {
  id: id(),
  empresaId: empresaId(),
  tipo: tipoClienteEnum('tipo').notNull().default('pessoa_fisica'),
  nome: text('nome').notNull(),
  documento: text('documento'),
  telefone: text('telefone'),
  email: text('email'),
  /** Como o cliente é tratado nos documentos, ex.: "Querida Katiane". */
  saudacao: text('saudacao'),
  enderecoCobranca: text('endereco_cobranca'),
  /** Arquiteto/construtora parceiro que indicou (alimenta o ranking). */
  indicadoPorId: uuid('indicado_por_id'),
  /** Ex.: "50% sinal / 50% entrega" ou "10 dias úteis após NF". */
  prazoPagamento: text('prazo_pagamento'),
  observacoes: text('observacoes'),
  criadoEm: criadoEm(),
});

export const obras = pgTable('obras', {
  id: id(),
  empresaId: empresaId(),
  clienteId: uuid('cliente_id')
    .notNull()
    .references(() => clientes.id),
  /** Identificação curta, ex.: "Ed. Vila Zenaide - Apto 2702". */
  nome: text('nome').notNull(),
  endereco: text('endereco'),
  tipoImovel: text('tipo_imovel'),
  areaM2: numeric('area_m2', { precision: 10, scale: 2 }),
  contatoLocal: text('contato_local'),
  /** Arquiteto/construtora responsável por esta obra. */
  parceiroId: uuid('parceiro_id').references(() => clientes.id),
  observacoes: text('observacoes'),
  criadoEm: criadoEm(),
});

export const equipe = pgTable('equipe', {
  id: id(),
  empresaId: empresaId(),
  nome: text('nome').notNull(),
  funcao: funcaoEquipeEnum('funcao').notNull().default('auxiliar'),
  telefone: text('telefone'),
  cor: text('cor').notNull().default('#1e3a8a'),
  diariaPadrao: dinheiro('diaria_padrao').notNull(),
  nr35: boolean('nr35').notNull().default(false),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: criadoEm(),
});

export const servicos = pgTable('servicos', {
  id: id(),
  empresaId: empresaId(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  precoM2Min: dinheiro('preco_m2_min'),
  precoM2Max: dinheiro('preco_m2_max'),
  exigeNr35: boolean('exige_nr35').notNull().default(false),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: criadoEm(),
});

export interface Medicao {
  ambiente: string;
  m2: number;
}

export const vistorias = pgTable('vistorias', {
  id: id(),
  empresaId: empresaId(),
  obraId: uuid('obra_id')
    .notNull()
    .references(() => obras.id),
  servicoId: uuid('servico_id').references(() => servicos.id),
  data: timestamp('data', { withTimezone: true }).notNull().defaultNow(),
  responsavelId: uuid('responsavel_id').references(() => usuarios.id),
  medicoes: jsonb('medicoes').$type<Medicao[]>().notNull().default([]),
  nivelSujeira: text('nivel_sujeira'),
  necessitaAndaime: boolean('necessita_andaime').notNull().default(false),
  observacoes: text('observacoes'),
  criadoEm: criadoEm(),
});

export const vistoriaFotos = pgTable('vistoria_fotos', {
  id: id(),
  vistoriaId: uuid('vistoria_id')
    .notNull()
    .references(() => vistorias.id, { onDelete: 'cascade' }),
  arquivo: text('arquivo').notNull(),
  legenda: text('legenda'),
  criadoEm: criadoEm(),
});

/** Conteúdo editável do documento do orçamento (o que vai no PDF). */
export interface ConteudoOrcamento {
  tipoServico: string;
  cronograma: string;
  equipeTexto: string;
  areaTexto: string;
  localTexto: string;
  informacoes: { titulo: string; itens: string[] };
  parecer: { titulo: string; texto: string } | null;
  escopo: { titulo: string; meta: string; itens: string[]; peso: number }[];
  valorAgregado: { titulo: string; texto: string } | null;
  incluidos: { rotulo: string; texto: string }[];
  responsabilidades: { rotulo: string; texto: string }[];
  descricaoSubtotal: string;
  rotuloDesconto: string;
}

export const orcamentos = pgTable(
  'orcamentos',
  {
    id: id(),
    empresaId: empresaId(),
    numero: text('numero').notNull(),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id),
    obraId: uuid('obra_id')
      .notNull()
      .references(() => obras.id),
    vistoriaId: uuid('vistoria_id').references(() => vistorias.id),
    servicoId: uuid('servico_id').references(() => servicos.id),
    status: statusOrcamentoEnum('status').notNull().default('rascunho'),
    conteudo: jsonb('conteudo').$type<ConteudoOrcamento>().notNull(),
    precificacao: jsonb('precificacao').$type<EntradaOrcamento>().notNull(),
    /** Fotografia do cálculo no momento em que foi salvo. */
    resultado: jsonb('resultado').$type<ResultadoOrcamento>().notNull(),
    valorFinal: dinheiro('valor_final').notNull(),
    validadeDias: integer('validade_dias').notNull().default(7),
    /** Liberação da gestão para markup abaixo do mínimo. */
    liberadoPorId: uuid('liberado_por_id').references(() => usuarios.id),
    justificativaLiberacao: text('justificativa_liberacao'),
    tokenPublico: text('token_publico').notNull(),
    enviadoEm: timestamp('enviado_em', { withTimezone: true }),
    aprovadoEm: timestamp('aprovado_em', { withTimezone: true }),
    aprovadoIp: text('aprovado_ip'),
    recusadoEm: timestamp('recusado_em', { withTimezone: true }),
    motivoRecusa: text('motivo_recusa'),
    criadoPorId: uuid('criado_por_id').references(() => usuarios.id),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('orcamentos_numero_idx').on(t.empresaId, t.numero), uniqueIndex('orcamentos_token_idx').on(t.tokenPublico)],
);

/** Histórico: envio, follow-ups registrados, aprovação, recusa, edições. */
export const orcamentoEventos = pgTable('orcamento_eventos', {
  id: id(),
  orcamentoId: uuid('orcamento_id')
    .notNull()
    .references(() => orcamentos.id, { onDelete: 'cascade' }),
  tipo: text('tipo').notNull(),
  descricao: text('descricao'),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  criadoEm: criadoEm(),
});

/** Numeração sequencial por empresa, tipo de documento e ano (ORC-2026-0001). */
export const numeracao = pgTable(
  'numeracao',
  {
    empresaId: empresaId(),
    tipo: text('tipo').notNull(),
    ano: integer('ano').notNull(),
    ultimo: integer('ultimo').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.empresaId, t.tipo, t.ano] })],
);

export const clientesRelations = relations(clientes, ({ many, one }) => ({
  obras: many(obras),
  orcamentos: many(orcamentos),
  indicadoPor: one(clientes, { fields: [clientes.indicadoPorId], references: [clientes.id] }),
}));
export const obrasRelations = relations(obras, ({ one, many }) => ({
  cliente: one(clientes, { fields: [obras.clienteId], references: [clientes.id] }),
  vistorias: many(vistorias),
  orcamentos: many(orcamentos),
}));
export const vistoriasRelations = relations(vistorias, ({ one, many }) => ({
  obra: one(obras, { fields: [vistorias.obraId], references: [obras.id] }),
  servico: one(servicos, { fields: [vistorias.servicoId], references: [servicos.id] }),
  fotos: many(vistoriaFotos),
}));
export const vistoriaFotosRelations = relations(vistoriaFotos, ({ one }) => ({
  vistoria: one(vistorias, { fields: [vistoriaFotos.vistoriaId], references: [vistorias.id] }),
}));
export const orcamentosRelations = relations(orcamentos, ({ one, many }) => ({
  cliente: one(clientes, { fields: [orcamentos.clienteId], references: [clientes.id] }),
  obra: one(obras, { fields: [orcamentos.obraId], references: [obras.id] }),
  servico: one(servicos, { fields: [orcamentos.servicoId], references: [servicos.id] }),
  eventos: many(orcamentoEventos),
}));
export const orcamentoEventosRelations = relations(orcamentoEventos, ({ one }) => ({
  orcamento: one(orcamentos, { fields: [orcamentoEventos.orcamentoId], references: [orcamentos.id] }),
}));
