/**
 * Gera o PDF da fatura mensal de um contrato recorrente.
 *   npm run fatura -- exemplos/fatura-katiane.json saida/fatura.pdf
 */
import { calcularFaturaMensal, diasProgramados } from '../src/fatura';
import { carregarEmpresa, lerJson, salvarDocumento } from './lib/comum';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const dataBR = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const [entrada = 'exemplos/fatura-katiane.json', saida = 'saida/fatura.pdf'] = process.argv.slice(2);
const d = await lerJson(entrada);
const { ano, mes } = d.fatura;

const calendario = diasProgramados(ano, mes, d.contrato.diasSemana, d.contrato.excluirDias);
const calculo = calcularFaturaMensal({
  diariasProgramadas: calendario.reduce((s, c) => s + c.dias.length, 0),
  faltas: d.faltas,
  diariaBase: d.contrato.diariaBase,
  descontoAntecipacao: d.contrato.descontoAntecipacao,
  diariaEspecie: d.contrato.diariaEspecie,
});
console.table({
  'Diárias programadas': calculo.diariasProgramadas,
  Faltas: calculo.faltas,
  'Diárias faturadas': calculo.diariasFaturadas,
  'Total Pix': calculo.pix.total,
  'Total espécie': calculo.especie?.total ?? '—',
});

const emissao = new Date(`${d.fatura.emissao}T00:00:00Z`);
const vencimento = new Date(emissao.getTime() + (d.fatura.prazoDias ?? 7) * 86_400_000);

await salvarDocumento(
  'fatura-mensal',
  {
    ...d,
    empresa: await carregarEmpresa(),
    fatura: {
      numero: d.fatura.numero,
      referencia: `${MESES[mes - 1]}/${ano}`,
      emissao: dataBR(emissao),
      vencimento: dataBR(vencimento),
    },
    calculo,
    calendario,
    saudacao: d.saudacao ?? `Olá, ${d.cliente.nome.split(' ')[0]}`,
  },
  saida,
);
