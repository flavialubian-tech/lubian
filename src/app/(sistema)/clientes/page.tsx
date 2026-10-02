import { and, asc, count, eq, ilike, or } from 'drizzle-orm';
import Link from 'next/link';
import { BotaoLink, Cabecalho, Cartao, Campo, Selecao, Tabela, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { TIPOS_CLIENTE, type TipoCliente } from '@/lib/rotulos';

export const metadata = { title: 'Clientes' };

export default async function Clientes(props: PageProps<'/clientes'>) {
  const sessao = await exigirOperador();
  const { q, tipo } = (await props.searchParams) as { q?: string; tipo?: string };
  const busca = q?.trim();
  const tipoValido = tipo && tipo in TIPOS_CLIENTE ? (tipo as TipoCliente) : undefined;

  const lista = await db
    .select({
      id: schema.clientes.id,
      nome: schema.clientes.nome,
      tipo: schema.clientes.tipo,
      telefone: schema.clientes.telefone,
      obras: count(schema.obras.id),
    })
    .from(schema.clientes)
    .leftJoin(schema.obras, eq(schema.obras.clienteId, schema.clientes.id))
    .where(
      and(
        eq(schema.clientes.empresaId, sessao.empresaId),
        tipoValido ? eq(schema.clientes.tipo, tipoValido) : undefined,
        busca
          ? or(ilike(schema.clientes.nome, `%${busca}%`), ilike(schema.clientes.telefone, `%${busca}%`), ilike(schema.clientes.documento, `%${busca}%`))
          : undefined,
      ),
    )
    .groupBy(schema.clientes.id)
    .orderBy(asc(schema.clientes.nome));

  return (
    <>
      <Cabecalho titulo="Clientes" subtitulo="Pessoas, arquitetos parceiros, construtoras e empresas" acoes={<BotaoLink href="/clientes/novo">+ Novo cliente</BotaoLink>} />
      <Cartao>
        <form className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
          <Campo name="q" placeholder="Buscar por nome, telefone ou documento" defaultValue={busca} />
          <Selecao name="tipo" defaultValue={tipoValido ?? ''}>
            <option value="">Todos os tipos</option>
            {Object.entries(TIPOS_CLIENTE).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </Selecao>
          <button className="rounded-lg border border-borda px-4 text-sm font-semibold text-azul">Filtrar</button>
        </form>
        {lista.length === 0 ? (
          <Vazio>Nenhum cliente encontrado.</Vazio>
        ) : (
          <Tabela cabecalho={['Nome', 'Tipo', 'Telefone', 'Obras']}>
            {lista.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <Link href={`/clientes/${c.id}`} className="font-semibold text-azul hover:underline">
                    {c.nome}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-cinza">{TIPOS_CLIENTE[c.tipo]}</td>
                <td className="px-3 py-2.5">{c.telefone ?? '—'}</td>
                <td className="px-3 py-2.5">{c.obras}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
