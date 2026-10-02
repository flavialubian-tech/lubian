/**
 * Gera o PDF de um Recibo de Sinal ou de Quitação.
 *   npm run recibo -- exemplos/recibo-quitacao-christian.json saida/recibo-quitacao.pdf
 */
import { dataPorExtenso, montarRecibo } from '../src/recibo';
import { carregarEmpresa, lerJson, salvarDocumento } from './lib/comum';

const [entrada = 'exemplos/recibo-quitacao-christian.json', saida = 'saida/recibo.pdf'] = process.argv.slice(2);
const d = await lerJson(entrada);

const recibo = montarRecibo({
  tipo: d.tipo,
  servico: d.servico.tipo,
  localNoTexto: d.obra.localNoTexto ?? `em ${d.obra.local}`,
  pagamentos: d.pagamentos,
});

await salvarDocumento(
  'recibo',
  {
    ...d,
    empresa: await carregarEmpresa(),
    recibo: {
      ...recibo,
      tituloPagina: d.tipo === 'quitacao' ? 'Recibo de Quitação' : 'Recibo de Sinal',
      numero: d.numero,
      dataBaixa: dataPorExtenso(d.dataBaixa),
      selo: d.selo ?? 'Engenharia de Limpeza & Handover',
    },
  },
  saida,
);
