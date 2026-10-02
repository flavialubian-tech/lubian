/** Mensagens prontas para o WhatsApp, no tom da Lubian (editáveis antes de enviar). */
import { moeda } from './formato';

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

interface DadosMensagem {
  clienteNome: string;
  numero: string;
  obraNome: string;
  valorFinal: number;
  validadeDias: number;
  link: string;
}

export function mensagemEnvioOrcamento(d: DadosMensagem) {
  return [
    `Olá, ${primeiroNome(d.clienteNome)}! 😊`,
    '',
    `Conforme nossa Vistoria Técnica, segue a *Apresentação Técnica e Orçamento ${d.numero}* da Lubian Limpezas para ${d.obraNome}:`,
    d.link,
    '',
    `💼 Investimento final: *${moeda(d.valorFinal)}*`,
    `🗓️ Validade: ${d.validadeDias} dias`,
    '',
    'Para garantir a data, é só aprovar pelo link. A agenda da força-tarefa é confirmada com o sinal de 50% via Pix. Qualquer dúvida, estou à disposição! 🤝',
  ].join('\n');
}

export function mensagemFollowUp(d: DadosMensagem, etapa: 1 | 2) {
  if (etapa === 1) {
    return [
      `Oi, ${primeiroNome(d.clienteNome)}! Tudo bem? 😊`,
      '',
      `Passando para saber se conseguiu analisar a nossa proposta técnica para ${d.obraNome}.`,
      'Ficou alguma dúvida sobre o escopo ou a execução? Posso te ajudar por aqui mesmo.',
      '',
      d.link,
    ].join('\n');
  }
  return [
    `Oi, ${primeiroNome(d.clienteNome)}! 🗓️`,
    '',
    `Nossa agenda das próximas semanas está fechando e a proposta ${d.numero} vale até daqui a poucos dias.`,
    'Se quiser garantir a data da força-tarefa, é só aprovar pelo link e reservamos com o sinal de 50%:',
    d.link,
  ].join('\n');
}
