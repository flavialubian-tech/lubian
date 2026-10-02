import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import type { EstadoEditor, OpcoesEditor } from '@/app/(sistema)/orcamentos/editor';
import { db, schema } from '@/db';
import { conteudoPadrao } from './padroes';
import { listarServicosAtivos } from './servicos';

export async function carregarOpcoesEditor(empresaId: string): Promise<OpcoesEditor> {
  const [obras, servicos, equipe] = await Promise.all([
    db
      .select({ id: schema.obras.id, nome: schema.obras.nome, clienteId: schema.clientes.id, clienteNome: schema.clientes.nome })
      .from(schema.obras)
      .innerJoin(schema.clientes, eq(schema.clientes.id, schema.obras.clienteId))
      .where(eq(schema.obras.empresaId, empresaId))
      .orderBy(asc(schema.clientes.nome), asc(schema.obras.nome)),
    listarServicosAtivos(empresaId),
    db.query.equipe.findMany({
      where: and(eq(schema.equipe.empresaId, empresaId), eq(schema.equipe.ativo, true)),
      orderBy: [asc(schema.equipe.funcao), asc(schema.equipe.nome)],
    }),
  ]);
  return { obras, servicos, equipe: equipe.map((m) => ({ id: m.id, nome: m.nome, diaria: Number(m.diariaPadrao), nr35: m.nr35 })) };
}

/** Estado inicial de um orçamento novo, aproveitando a obra e a vistoria quando houver. */
export async function estadoInicialNovo(empresaId: string, opcoes: OpcoesEditor, origem: { obraId?: string; vistoriaId?: string }): Promise<EstadoEditor> {
  const vistoria = origem.vistoriaId
    ? await db.query.vistorias.findFirst({ where: and(eq(schema.vistorias.id, origem.vistoriaId), eq(schema.vistorias.empresaId, empresaId)) })
    : undefined;
  const obraId = vistoria?.obraId ?? origem.obraId;
  const obra = obraId ? await db.query.obras.findFirst({ where: and(eq(schema.obras.id, obraId), eq(schema.obras.empresaId, empresaId)) }) : undefined;
  const servicoId = vistoria?.servicoId ?? null;
  const servico = opcoes.servicos.find((s) => s.id === servicoId);

  const areaMedida = vistoria?.medicoes.reduce((s, m) => s + m.m2, 0) || 0;
  const area = areaMedida || (obra?.areaM2 ? Number(obra.areaM2) : null);
  const conteudo = conteudoPadrao({ tipoServico: servico?.nome, areaM2: area, localTexto: obra?.nome });
  if (vistoria) {
    conteudo.informacoes.itens = [
      vistoria.nivelSujeira && `Nível de resíduos: ${vistoria.nivelSujeira}.`,
      ...vistoria.medicoes.filter((m) => m.ambiente).map((m) => `${m.ambiente}${m.m2 ? `: ${m.m2.toLocaleString('pt-BR')} m²` : ''}`),
      vistoria.necessitaAndaime && 'Necessidade de andaime / trabalho em altura (NR-35).',
      ...(vistoria.observacoes?.split('\n').filter((l) => l.trim()) ?? []),
    ].filter((x): x is string => !!x);
  }

  const lider = opcoes.equipe[0];
  return {
    obraId: obra?.id ?? '',
    clienteId: obra?.clienteId ?? '',
    servicoId,
    vistoriaId: vistoria?.id ?? null,
    validadeDias: 7,
    datasPrevistas: [],
    precificacao: {
      equipe: lider ? [{ nome: lider.nome, diaria: lider.diaria, dias: 1 }] : [],
      custosVariaveis: {},
      markup: 0.35,
      ancoragem: { tipo: 'desconto_percentual', percentual: 0.15 },
      arredondamento: { modo: 'proximo', passo: 5 },
    },
    conteudo,
  };
}
