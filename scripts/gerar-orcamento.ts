/**
 * Gera o PDF de um orçamento a partir de um JSON de exemplo.
 *   npm run orcamento -- exemplos/orcamento-raissa.json saida/orcamento.pdf
 */
import { calcularOrcamento, distribuirValorTabela } from '../src/precificacao';
import { carregarEmpresa, lerJson, salvarDocumento } from './lib/comum';

const [entrada = 'exemplos/orcamento-raissa.json', saida = 'saida/orcamento.pdf'] = process.argv.slice(2);
const dados = await lerJson(entrada);

const r = calcularOrcamento(dados.precificacao);
const pct = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
console.table({
  'Força-Tarefa': r.forcaTarefa,
  'Custos variáveis': r.custosVariaveis,
  'Custo operacional': r.custoOperacional,
  'Valor final': r.valorFinal,
  'Valor de tabela': r.valorTabela,
  Desconto: r.desconto,
  'Markup efetivo': pct(r.markupEfetivo),
});
if (r.abaixoDoMinimo) {
  console.error('⚠️  Markup abaixo do mínimo: este orçamento precisa de liberação da gestão.');
  process.exitCode = 1;
}

const valores = distribuirValorTabela(r.valorTabela, dados.escopo.map((i: { peso: number }) => i.peso));
await salvarDocumento('orcamento-tecnico', {
  ...dados,
  empresa: await carregarEmpresa(),
  escopo: dados.escopo.map((item: object, i: number) => ({ ...item, valor: valores[i] })),
  financeiro: {
    descricaoSubtotal: dados.descricaoSubtotal,
    valorTabela: r.valorTabela,
    rotuloDesconto: `${dados.rotuloDesconto} (${Math.round(r.descontoPercentual * 100)}%)`,
    desconto: r.desconto,
    valorFinal: r.valorFinal,
    sinal: r.sinal,
    saldo: r.saldo,
  },
}, saida);
