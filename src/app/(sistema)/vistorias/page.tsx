import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { BotaoLink, Cabecalho, Cartao, Tabela, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { dataCurta } from '@/lib/formato';

export const metadata = { title: 'Vistorias' };

export default async function Vistorias() {
  const sessao = await exigirOperador();
  const lista = await db
    .select({
      id: schema.vistorias.id,
      data: schema.vistorias.data,
      obraNome: schema.obras.nome,
      clienteNome: schema.clientes.nome,
      servicoNome: schema.servicos.nome,
    })
    .from(schema.vistorias)
    .innerJoin(schema.obras, eq(schema.obras.id, schema.vistorias.obraId))
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.obras.clienteId))
    .leftJoin(schema.servicos, eq(schema.servicos.id, schema.vistorias.servicoId))
    .where(eq(schema.vistorias.empresaId, sessao.empresaId))
    .orderBy(desc(schema.vistorias.data));
  return (
    <>
      <Cabecalho titulo="Vistorias técnicas" subtitulo="O orçamento oficial nasce da vistoria presencial" acoes={<BotaoLink href="/vistorias/nova">+ Nova vistoria</BotaoLink>} />
      <Cartao>
        {lista.length === 0 ? (
          <Vazio>Nenhuma vistoria registrada.</Vazio>
        ) : (
          <Tabela cabecalho={['Data', 'Obra', 'Cliente', 'Serviço']}>
            {lista.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <Link href={`/vistorias/${v.id}`} className="font-semibold text-azul hover:underline">
                    {dataCurta(v.data)}
                  </Link>
                </td>
                <td className="px-3 py-2.5">{v.obraNome}</td>
                <td className="px-3 py-2.5">{v.clienteNome}</td>
                <td className="px-3 py-2.5 text-cinza">{v.servicoNome ?? '—'}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
