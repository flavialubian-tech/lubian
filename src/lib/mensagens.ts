/** Mensagens prontas para o WhatsApp, no tom da Lubian (editáveis antes de enviar). */
import { moeda } from './formato';

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

/** Pix copia e cola no fim da mensagem, sozinho na última linha (fácil de copiar no WhatsApp). */
function blocoPix(pix: string | null | undefined) {
  return pix ? ['', '💠 *Pix copia e cola* — copie o código abaixo e cole no app do seu banco (Pix › Copia e cola):', pix] : [];
}

interface DadosMensagem {
  clienteNome: string;
  numero: string;
  obraNome: string;
  valorFinal: number;
  validadeDias: number;
  link: string;
  /** Pix copia e cola do sinal (50%). */
  pix?: string | null;
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
    ...blocoPix(d.pix),
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

export function mensagemFatura(d: {
  clienteNome: string;
  saudacao?: string | null;
  numero: string;
  referencia: string;
  valorPix: number;
  valorEspecie?: number | null;
  vencimento: string;
  link: string;
  pix?: string | null;
}) {
  return [
    `${d.saudacao || `Olá, ${primeiroNome(d.clienteNome)}`}! 😊`,
    '',
    `Segue a *Fatura ${d.numero}* das diárias de ${d.referencia}:`,
    d.link,
    '',
    `💠 Pix / Transferência: *${moeda(d.valorPix)}*`,
    ...(d.valorEspecie ? [`💵 Dinheiro (espécie): *${moeda(d.valorEspecie)}*`] : []),
    `🗓️ Vencimento: ${d.vencimento}`,
    '',
    'Qualquer dúvida, estou à disposição! 💙',
    ...blocoPix(d.pix),
  ].join('\n');
}

/** Lembrete do sinal de 50% (pré-reserva aguardando Pix). */
export function mensagemCobrarSinal(d: { clienteNome: string; numero: string; valor: number; pix?: string | null }) {
  return [
    `Olá, ${primeiroNome(d.clienteNome)}! 😊`,
    '',
    `Para confirmarmos a sua data na agenda da Lubian, falta apenas o Pix do sinal de 50% (*${moeda(d.valor)}*) referente ao orçamento ${d.numero}. 💙`,
    ...blocoPix(d.pix),
  ].join('\n');
}

/** Lembrete de uma cobrança em aberto (sinal, saldo ou fatura). */
export function mensagemCobranca(d: { clienteNome: string; descricao: string; referencia?: string | null; valor: number; vencimento: string; pix?: string | null }) {
  return [
    `Olá, ${primeiroNome(d.clienteNome)}! 😊`,
    '',
    `Passando para lembrar do pagamento de *${moeda(d.valor)}* (${d.descricao}${d.referencia ? ` · ${d.referencia}` : ''}), com vencimento em ${d.vencimento}. 💙`,
    ...blocoPix(d.pix),
  ].join('\n');
}

/** Recibo enviado logo depois de registrar o pagamento (sinal, saldo/quitação ou fatura). */
export function mensagemRecibo(d: { clienteNome: string; tipo: 'sinal' | 'saldo' | 'fatura'; valor: number; numero?: string | null; obraNome?: string | null; link: string }) {
  const oQue = d.tipo === 'sinal' ? 'o Pix do sinal' : d.tipo === 'saldo' ? 'o pagamento final (quitação)' : 'o pagamento da fatura';
  return [
    `Olá, ${primeiroNome(d.clienteNome)}! 😊`,
    '',
    `Recebemos ${oQue}${d.obraNome ? ` de ${d.obraNome}` : ''}: *${moeda(d.valor)}*. Muito obrigada! 💙`,
    ...(d.tipo === 'sinal' ? ['A data da força-tarefa está *confirmada* na nossa agenda. 🗓️'] : []),
    '',
    `Segue o seu recibo${d.numero ? ` ${d.numero}` : ''} (é só abrir e salvar em PDF):`,
    d.link,
  ].join('\n');
}

/** Cobrança do saldo quando o serviço é entregue: aviso de finalização + Pix. */
export function mensagemCobrarSaldo(d: { clienteNome: string; obraNome: string; valor: number; link: string; pix?: string | null }) {
  return [
    `Olá, ${primeiroNome(d.clienteNome)}! 😊`,
    '',
    `A equipe da Lubian *finalizou o serviço* em ${d.obraNome}. ✨ Foi um prazer cuidar do seu espaço!`,
    '',
    'Pedimos que confira tudo com calma. Estando aprovado, é só realizar o pagamento do saldo:',
    `💼 Saldo final: *${moeda(d.valor)}*`,
    '',
    `No link abaixo tem o QR Code do Pix e, depois do pagamento, o seu recibo:`,
    d.link,
    '',
    'Qualquer ajuste, é só nos chamar por aqui. 🤝',
    ...blocoPix(d.pix),
  ].join('\n');
}
