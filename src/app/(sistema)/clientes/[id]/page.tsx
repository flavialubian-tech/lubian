import { and, asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusOrcamento } from '@/components/status-orcamento';
import { BotaoLink, Cabecalho, Cartao, Selo, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { listarOrcamentos } from '@/lib/consultas';
import { linkWhatsApp, moeda } from '@/lib/formato';
import { listarParceiros } from '@/lib/parceiros';
import { TIPOS_CLIENTE } from '@/lib/rotulos';
import { FormCliente } from '../form-cliente';

export default async function Cliente(props: PageProps<'/clientes/[id]'>) {
  const sessao = await exigirOperador();
  const { id } = await props.params;
  const cliente = await db.query.clientes.findFirst({
    where: and(eq(schema.clientes.id, id), eq(schema.clientes.empresaId, sessao.empresaId)),
  });
  if (!cliente) notFound();

  const [obras, orcamentos, parceiros] = await Promise.all([
    db.query.obras.findMany({ where: eq(schema.obras.clienteId, id), orderBy: asc(schema.obras.nome) }),
    listarOrcamentos(sessao.empresaId, { clienteId: id }),
    listarParceiros(sessao.empresaId),
  ]);

  return (
    <>
      <Cabecalho
        titulo={cliente.nome}
        subtitulo={<Selo cor="azul">{TIPOS_CLIENTE[cliente.tipo]}</Selo>}
        acoes={
          <>
            {cliente.telefone && (
              <BotaoLink href={linkWhatsApp(cliente.telefone, `Olá, ${cliente.nome.split(' ')[0]}! Aqui é da Lubian Limpezas.`)} target="_blank" variante="sucesso">
                WhatsApp
              </BotaoLink>
            )}
            <BotaoLink href={`/obras/nova?cliente=${cliente.id}`} variante="secundario">
              + Obra
            </BotaoLink>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Cartao titulo="Dados do cliente">
          <FormCliente cliente={cliente} parceiros={parceiros} />
        </Cartao>
        <div className="space-y-6">
          <Cartao titulo="Obras / imóveis">
            {obras.length === 0 ? (
              <Vazio>Nenhuma obra cadastrada.</Vazio>
            ) : (
              <ul className="divide-y divide-slate-100">
                {obras.map((o) => (
                  <li key={o.id} className="py-2.5">
                    <Link href={`/obras/${o.id}`} className="font-semibold text-azul hover:underline">
                      {o.nome}
                    </Link>
                    <p className="text-xs text-cinza">
                      {[o.endereco, o.areaM2 && `${Number(o.areaM2).toLocaleString('pt-BR')} m²`].filter(Boolean).join(' · ') || '—'}
                    </p>
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
                      <span className="block text-xs font-normal text-cinza">{o.obraNome}</span>
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
