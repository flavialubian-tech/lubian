import { and, asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BotaoExcluir } from '@/components/botao-excluir';
import { StatusOrcamento } from '@/components/status-orcamento';
import { BotaoLink, Cabecalho, Cartao, Selo, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { listarOrcamentos } from '@/lib/consultas';
import { dataCurta, linkWhatsApp, moeda } from '@/lib/formato';
import { listarAvaliacoes, listarIndicacoes } from '@/lib/pos-venda';
import { notaBaixa } from '@/lib/pos-venda-regras';
import { estrelas } from '../../orcamentos/[id]/pos-venda';
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

  const [obras, orcamentos, listaParceiros, indicador] = await Promise.all([
    db.query.obras.findMany({ where: eq(schema.obras.clienteId, id), orderBy: asc(schema.obras.nome) }),
    listarOrcamentos(sessao.empresaId, { clienteId: id }),
    listarParceiros(sessao.empresaId),
    cliente.indicadoPorId
      ? db.query.clientes.findFirst({ where: eq(schema.clientes.id, cliente.indicadoPorId), columns: { id: true, nome: true } })
      : Promise.resolve(undefined),
  ]);
  const [avaliacoes, indicou, foiIndicado] = await Promise.all([
    listarAvaliacoes(sessao.empresaId, { clienteId: id }),
    listarIndicacoes(sessao.empresaId, { indicadoPorId: id }),
    listarIndicacoes(sessao.empresaId, { clienteId: id }),
  ]);
  // Quem indicou pode ser um cliente comum (indicação pela avaliação): entra na lista para não se perder ao salvar.
  const parceiros = indicador && !listaParceiros.some((p) => p.id === indicador.id) ? [indicador, ...listaParceiros] : listaParceiros;

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
            <BotaoExcluir
              tipo="cliente"
              id={cliente.id}
              voltarPara="/clientes"
              rotulo="Excluir cliente"
              confirmar={`Excluir o cliente ${cliente.nome}, com as obras e vistorias dele?`}
              className="self-center"
            />
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
          {(avaliacoes.length > 0 || indicou.length > 0 || foiIndicado.length > 0) && (
            <Cartao titulo="Pós-venda" acoes={<Link href="/pos-venda" className="text-sm font-semibold text-azul hover:underline">Ver tudo</Link>}>
              <div className="space-y-3 text-sm" data-posvenda-cliente>
                {avaliacoes.map((a) => (
                  <div key={a.id}>
                    <p>
                      <span className={notaBaixa(a.nota) ? 'text-vermelho' : 'text-amber-500'}>{estrelas(a.nota)}</span>{' '}
                      <span className="text-xs text-cinza">
                        {dataCurta(a.criadoEm)} ·{' '}
                        <Link href={`/orcamentos/${a.orcamentoId}`} className="hover:underline">
                          {a.numero}
                        </Link>
                      </span>
                    </p>
                    {a.comentario && <p className="italic">“{a.comentario}”</p>}
                  </div>
                ))}
                {indicou.length > 0 && (
                  <div>
                    <p className="font-semibold">Indicou</p>
                    <ul>
                      {indicou.map((i) => (
                        <li key={i.id}>
                          <Link href={`/clientes/${i.clienteId}`} className="text-azul hover:underline">
                            {i.nome}
                          </Link>{' '}
                          <span className="text-xs text-cinza">{i.orcamentos > 0 ? '· pediu orçamento' : i.contatadoEm ? '· contatado' : '· chamar'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {foiIndicado.map((i) => (
                  <p key={i.id}>
                    Indicado(a) por{' '}
                    <Link href={`/clientes/${i.indicadoPorId}`} className="font-semibold text-azul hover:underline">
                      {i.indicadorNome}
                    </Link>{' '}
                    <span className="text-xs text-cinza">em {dataCurta(i.criadoEm)}</span>
                  </p>
                ))}
              </div>
            </Cartao>
          )}
        </div>
      </div>
    </>
  );
}
