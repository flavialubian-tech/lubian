import { and, eq, inArray } from 'drizzle-orm';
import { Cartao } from '@/components/ui';
import { db, schema } from '@/db';
import { linkWhatsApp, moeda } from '@/lib/formato';
import { mensagemCotacao } from '@/lib/mensagens';
import { custoProdutos } from '@/precificacao';

type Orcamento = typeof schema.orcamentos.$inferSelect;

/** Produtos da obra (do orçamento) e pedido de cotação pelo WhatsApp, um por fornecedor. */
export async function CartaoProdutosObra({ orc }: { orc: Orcamento }) {
  const itens = (orc.precificacao.produtos ?? []).filter((i) => i.nome && i.quantidade > 0);
  if (!itens.length) return null;
  const ids = [...new Set(itens.map((i) => i.fornecedorId).filter((x): x is string => !!x))];
  const fornecedores = ids.length
    ? await db.query.fornecedores.findMany({ where: and(eq(schema.fornecedores.empresaId, orc.empresaId), inArray(schema.fornecedores.id, ids)) })
    : [];
  const porId = new Map(fornecedores.map((f) => [f.id, f]));
  const grupos = new Map<string, typeof itens>();
  for (const i of itens) {
    const chave = i.fornecedorId && porId.has(i.fornecedorId) ? i.fornecedorId : '';
    grupos.set(chave, [...(grupos.get(chave) ?? []), i]);
  }

  return (
    <Cartao titulo="Produtos da obra" className="mb-6" acoes={<span className="text-sm font-bold text-azul">{moeda(custoProdutos(itens))}</span>}>
      <div className="grid gap-6 lg:grid-cols-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borda text-left text-xs uppercase text-cinza">
              <th className="py-1">Produto</th>
              <th className="py-1 text-right">Qtd.</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i, k) => (
              <tr key={k} className="border-b border-slate-100">
                <td className="py-1">
                  {i.nome} <span className="text-xs text-cinza">({i.unidade})</span>
                </td>
                <td className="py-1 text-right">{i.quantidade.toLocaleString('pt-BR')}</td>
                <td className="py-1 text-right">{moeda(custoProdutos([i]))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Pedir cotação</p>
          {[...grupos.entries()].map(([fornecedorId, lista]) => {
            const f = fornecedorId ? porId.get(fornecedorId) : undefined;
            const link = linkWhatsApp(f?.telefone, mensagemCotacao({ fornecedorNome: f?.nome, itens: lista }));
            return (
              <a
                key={fornecedorId || 'sem'}
                href={link}
                target="_blank"
                className="flex items-center justify-between rounded-lg border border-borda px-3 py-2 hover:bg-slate-50"
                data-cotacao={f?.nome ?? 'sem fornecedor'}
              >
                <span>
                  <strong className="text-verde">WhatsApp</strong> · {f ? f.nome : 'Sem fornecedor (escolher contato)'}
                </span>
                <span className="text-xs text-cinza">{lista.length} produto(s)</span>
              </a>
            );
          })}
          <p className="text-xs text-cinza">Depois da compra, lance a nota em Despesas (categoria Produtos) para comparar previsto × realizado.</p>
        </div>
      </div>
    </Cartao>
  );
}
