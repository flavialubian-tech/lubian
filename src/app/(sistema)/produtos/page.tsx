import { asc, eq } from 'drizzle-orm';
import { BotaoExcluir } from '@/components/botao-excluir';
import { Formulario } from '@/components/formulario';
import { Botao, Cabecalho, Caixa, Campo, Cartao, Selecao, Selo, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { dataCurta, moeda } from '@/lib/formato';
import { salvarFornecedor, salvarProduto } from './actions';

export const metadata = { title: 'Produtos' };

type Produto = typeof schema.produtos.$inferSelect;
type Fornecedor = typeof schema.fornecedores.$inferSelect;
const UNIDADES = ['unidade', 'litro', 'galão 5 L', 'frasco 1 L', 'kg', 'pacote', 'caixa', 'rolo'];

function FormProduto({ p, fornecedores }: { p?: Produto; fornecedores: Fornecedor[] }) {
  return (
    <Formulario action={salvarProduto.bind(null, p?.id ?? null)} className="grid gap-3 sm:grid-cols-12">
      <Campo rotulo="Produto" name="nome" defaultValue={p?.nome} required className="sm:col-span-4" placeholder="Ex.: Detergente neutro" />
      <Campo rotulo="Unidade" name="unidade" defaultValue={p?.unidade ?? 'unidade'} list="unidades" required className="sm:col-span-3" />
      <Campo rotulo="Preço (R$)" name="precoUnitario" inputMode="decimal" defaultValue={p ? Number(p.precoUnitario).toFixed(2).replace('.', ',') : ''} required className="sm:col-span-2" />
      <Selecao rotulo="Fornecedor" name="fornecedorId" defaultValue={p?.fornecedorId ?? ''} className="sm:col-span-3">
        <option value="">—</option>
        {fornecedores.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
      </Selecao>
      <Campo rotulo="Observações (rendimento, diluição...)" name="observacoes" defaultValue={p?.observacoes ?? ''} className="sm:col-span-8" />
      <div className="flex flex-wrap items-end gap-4 sm:col-span-4">
        {p && <Caixa rotulo="Ativo" name="ativo" defaultChecked={p.ativo} />}
        <Botao type="submit" variante={p ? 'secundario' : 'primario'} className="ml-auto">
          {p ? 'Salvar' : 'Cadastrar'}
        </Botao>
      </div>
    </Formulario>
  );
}

function FormFornecedor({ f }: { f?: Fornecedor }) {
  return (
    <Formulario action={salvarFornecedor.bind(null, f?.id ?? null)} className="grid grid-cols-2 gap-3">
      <Campo rotulo="Fornecedor" name="nome" defaultValue={f?.nome} required placeholder="Ex.: Gmix" />
      <Campo rotulo="WhatsApp" name="telefone" defaultValue={f?.telefone ?? ''} inputMode="tel" placeholder="(49) 99999-9999" />
      <Botao type="submit" variante={f ? 'secundario' : 'primario'} className="col-span-2">
        {f ? 'Salvar' : 'Cadastrar'}
      </Botao>
    </Formulario>
  );
}

export default async function Produtos() {
  const sessao = await exigirOperador();
  const [produtos, fornecedores] = await Promise.all([
    db.query.produtos.findMany({ where: eq(schema.produtos.empresaId, sessao.empresaId), orderBy: asc(schema.produtos.nome) }),
    db.query.fornecedores.findMany({ where: eq(schema.fornecedores.empresaId, sessao.empresaId), orderBy: asc(schema.fornecedores.nome) }),
  ]);
  const nomeFornecedor = new Map(fornecedores.map((f) => [f.id, f.nome]));
  return (
    <>
      <Cabecalho titulo="Produtos de limpeza" subtitulo="Preço de cada produto para o cálculo do orçamento e a cotação com o fornecedor" />
      <datalist id="unidades">
        {UNIDADES.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Cartao titulo="Novo produto">
            <FormProduto fornecedores={fornecedores} />
          </Cartao>
          {produtos.length === 0 ? (
            <Vazio>Nenhum produto cadastrado ainda.</Vazio>
          ) : (
            produtos.map((p) => (
              <Cartao
                key={p.id}
                titulo={
                  <span className="flex flex-wrap items-center gap-2" data-produto={p.nome}>
                    {p.nome}
                    <span className="text-sm font-normal text-cinza">
                      · {moeda(p.precoUnitario)} / {p.unidade}
                      {p.fornecedorId && ` · ${nomeFornecedor.get(p.fornecedorId)}`}
                    </span>
                    {!p.ativo && <Selo>Inativo</Selo>}
                  </span>
                }
                acoes={
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-cinza">preço de {dataCurta(p.precoAtualizadoEm)}</span>
                    <BotaoExcluir tipo="produto" id={p.id} confirmar={`Excluir o produto "${p.nome}"? Orçamentos já feitos com ele não mudam.`} />
                  </span>
                }
              >
                <FormProduto p={p} fornecedores={fornecedores} />
              </Cartao>
            ))
          )}
        </div>
        <Cartao titulo="Fornecedores">
          <div className="space-y-4">
            {fornecedores.map((f) => (
              <div key={f.id} className="rounded-lg border border-borda p-3" data-fornecedor={f.nome}>
                <FormFornecedor f={f} />
                <BotaoExcluir tipo="fornecedor" id={f.id} confirmar={`Excluir o fornecedor ${f.nome}? Os produtos dele ficam sem fornecedor.`} className="mt-2 block" />
              </div>
            ))}
            <div className="rounded-lg bg-azul-claro p-3">
              <p className="mb-2 text-sm font-semibold text-azul">Novo fornecedor</p>
              <FormFornecedor />
            </div>
          </div>
        </Cartao>
      </div>
    </>
  );
}
