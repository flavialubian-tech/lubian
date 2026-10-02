import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { situacaoNoFunil, type SituacaoFunil } from './funil';
import { ultimosFollowUps } from './orcamentos';

export type StatusOrcamento = (typeof schema.statusOrcamentoEnum.enumValues)[number];

export interface OrcamentoListado {
  id: string;
  numero: string;
  status: StatusOrcamento;
  valorFinal: number;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string | null;
  obraNome: string;
  enviadoEm: Date | null;
  aprovadoEm: Date | null;
  criadoEm: Date;
  situacao: SituacaoFunil;
}

export async function listarOrcamentos(empresaId: string, filtro?: { status?: StatusOrcamento; clienteId?: string; obraId?: string }) {
  const linhas = await db
    .select({
      id: schema.orcamentos.id,
      numero: schema.orcamentos.numero,
      status: schema.orcamentos.status,
      valorFinal: schema.orcamentos.valorFinal,
      validadeDias: schema.orcamentos.validadeDias,
      clienteId: schema.clientes.id,
      clienteNome: schema.clientes.nome,
      clienteTelefone: schema.clientes.telefone,
      obraNome: schema.obras.nome,
      enviadoEm: schema.orcamentos.enviadoEm,
      aprovadoEm: schema.orcamentos.aprovadoEm,
      criadoEm: schema.orcamentos.criadoEm,
    })
    .from(schema.orcamentos)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.orcamentos.clienteId))
    .innerJoin(schema.obras, eq(schema.obras.id, schema.orcamentos.obraId))
    .where(
      and(
        eq(schema.orcamentos.empresaId, empresaId),
        filtro?.status ? eq(schema.orcamentos.status, filtro.status) : undefined,
        filtro?.clienteId ? eq(schema.orcamentos.clienteId, filtro.clienteId) : undefined,
        filtro?.obraId ? eq(schema.orcamentos.obraId, filtro.obraId) : undefined,
      ),
    )
    .orderBy(desc(schema.orcamentos.criadoEm));

  const followUps = await ultimosFollowUps(linhas.filter((l) => l.status === 'enviado').map((l) => l.id));
  return linhas.map(
    (l): OrcamentoListado => ({
      ...l,
      valorFinal: Number(l.valorFinal),
      situacao: situacaoNoFunil({ ...l, ultimoFollowUpEm: followUps.get(l.id) }),
    }),
  );
}

export const ROTULO_STATUS: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado (pré-reserva)',
  recusado: 'Recusado',
};
