import { and, asc, eq, ilike, or } from 'drizzle-orm';
import Link from 'next/link';
import { BotaoLink, Cabecalho, Cartao, Campo, Tabela, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';

export const metadata = { title: 'Obras' };

export default async function Obras(props: PageProps<'/obras'>) {
  const sessao = await exigirOperador();
  const { q } = (await props.searchParams) as { q?: string };
  const busca = q?.trim();
  const lista = await db
    .select({
      id: schema.obras.id,
      nome: schema.obras.nome,
      endereco: schema.obras.endereco,
      areaM2: schema.obras.areaM2,
      clienteId: schema.clientes.id,
      clienteNome: schema.clientes.nome,
    })
    .from(schema.obras)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.obras.clienteId))
    .where(
      and(
        eq(schema.obras.empresaId, sessao.empresaId),
        busca ? or(ilike(schema.obras.nome, `%${busca}%`), ilike(schema.obras.endereco, `%${busca}%`), ilike(schema.clientes.nome, `%${busca}%`)) : undefined,
      ),
    )
    .orderBy(asc(schema.obras.nome));

  return (
    <>
      <Cabecalho titulo="Obras" subtitulo="Imóveis atendidos (um cliente pode ter várias obras)" acoes={<BotaoLink href="/obras/nova">+ Nova obra</BotaoLink>} />
      <Cartao>
        <form className="mb-4 flex gap-3">
          <Campo name="q" placeholder="Buscar por obra, endereço ou cliente" defaultValue={busca} className="flex-1" />
          <button className="rounded-lg border border-borda px-4 text-sm font-semibold text-azul">Buscar</button>
        </form>
        {lista.length === 0 ? (
          <Vazio>Nenhuma obra encontrada.</Vazio>
        ) : (
          <Tabela cabecalho={['Obra', 'Cliente', 'Endereço', 'Área']}>
            {lista.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <Link href={`/obras/${o.id}`} className="font-semibold text-azul hover:underline">
                    {o.nome}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/clientes/${o.clienteId}`} className="hover:underline">
                    {o.clienteNome}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-cinza">{o.endereco ?? '—'}</td>
                <td className="px-3 py-2.5">{o.areaM2 ? `${Number(o.areaM2).toLocaleString('pt-BR')} m²` : '—'}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
