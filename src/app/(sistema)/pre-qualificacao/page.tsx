import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { Cabecalho, Cartao, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { Calculadora } from './calculadora';

export const metadata = { title: 'Pré-qualificação' };

export default async function PreQualificacao() {
  const sessao = await exigirOperador();
  const servicos = await db
    .select()
    .from(schema.servicos)
    .where(
      and(
        eq(schema.servicos.empresaId, sessao.empresaId),
        eq(schema.servicos.ativo, true),
        isNotNull(schema.servicos.precoM2Min),
        isNotNull(schema.servicos.precoM2Max),
      ),
    )
    .orderBy(asc(schema.servicos.nome));
  return (
    <>
      <Cabecalho titulo="Pré-qualificação rápida" subtitulo="Estimativa para responder no WhatsApp antes da Vistoria Técnica — não é o orçamento oficial" />
      <Cartao>
        {servicos.length === 0 ? (
          <Vazio>Cadastre a faixa de R$/m² nos serviços para usar a calculadora.</Vazio>
        ) : (
          <Calculadora servicos={servicos.map((s) => ({ id: s.id, nome: s.nome, min: Number(s.precoM2Min), max: Number(s.precoM2Max) }))} />
        )}
      </Cartao>
    </>
  );
}
