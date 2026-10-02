import { and, desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusOrcamento } from '@/components/status-orcamento';
import { BotaoLink, Cabecalho, Cartao, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { listarOrcamentos } from '@/lib/consultas';
import { dataCurta, moeda } from '@/lib/formato';
import { listarClientesOpcoes } from '@/lib/opcoes';
import { listarParceiros } from '@/lib/parceiros';
import { FormObra } from '../form-obra';

export default async function Obra(props: PageProps<'/obras/[id]'>) {
  const sessao = await exigirOperador();
  const { id } = await props.params;
  const obra = await db.query.obras.findFirst({
    where: and(eq(schema.obras.id, id), eq(schema.obras.empresaId, sessao.empresaId)),
    with: { cliente: true },
  });
  if (!obra) notFound();

  const [vistorias, orcamentos, clientes, parceiros] = await Promise.all([
    db.query.vistorias.findMany({ where: eq(schema.vistorias.obraId, id), orderBy: desc(schema.vistorias.data), with: { servico: true } }),
    listarOrcamentos(sessao.empresaId, { obraId: id }),
    listarClientesOpcoes(sessao.empresaId),
    listarParceiros(sessao.empresaId),
  ]);

  return (
    <>
      <Cabecalho
        titulo={obra.nome}
        subtitulo={
          <Link href={`/clientes/${obra.clienteId}`} className="hover:underline">
            Cliente: {obra.cliente.nome}
          </Link>
        }
        acoes={
          <>
            <BotaoLink href={`/vistorias/nova?obra=${obra.id}`} variante="secundario">
              + Vistoria técnica
            </BotaoLink>
            <BotaoLink href={`/orcamentos/novo?obra=${obra.id}`}>+ Orçamento</BotaoLink>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Cartao titulo="Dados da obra">
          <FormObra obra={obra} clientes={clientes} parceiros={parceiros} />
        </Cartao>
        <div className="space-y-6">
          <Cartao titulo="Vistorias">
            {vistorias.length === 0 ? (
              <Vazio>Nenhuma vistoria.</Vazio>
            ) : (
              <ul className="divide-y divide-slate-100">
                {vistorias.map((v) => (
                  <li key={v.id} className="py-2.5">
                    <Link href={`/vistorias/${v.id}`} className="font-semibold text-azul hover:underline">
                      Vistoria de {dataCurta(v.data)}
                    </Link>
                    <p className="text-xs text-cinza">{v.servico?.nome ?? 'Serviço não definido'}</p>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
          <Cartao titulo="Orçamentos">
            {orcamentos.length === 0 ? (
              <Vazio>Nenhum orçamento.</Vazio>
            ) : (
              <ul className="divide-y divide-slate-100">
                {orcamentos.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/orcamentos/${o.id}`} className="text-sm font-semibold text-azul hover:underline">
                      {o.numero}
                    </Link>
                    <div className="text-right">
                      <StatusOrcamento status={o.status} situacao={o.situacao} />
                      <p className="text-sm font-bold">{moeda(o.valorFinal)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
