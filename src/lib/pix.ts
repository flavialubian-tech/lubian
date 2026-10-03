/**
 * Pix "copia e cola" estático (BR Code, padrão EMV do Banco Central), gerado sem gateway e sem tarifa.
 * O cliente cola o código no app do banco e o valor e a chave já vêm preenchidos. A baixa continua manual.
 */

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do BR Code. */
export function crc16(texto: string) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Texto sem acento e só com caracteres seguros para o BR Code, cortado no tamanho máximo. */
const limpar = (texto: string, max: number) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();

/** CPF/CNPJ com pontuação viram só dígitos; e-mail, telefone (+55...) e chave aleatória ficam como estão. */
export function normalizarChavePix(chave: string) {
  const c = chave.trim();
  const digitos = c.replace(/\D/g, '');
  return /^[\d.\-/\s]+$/.test(c) && (digitos.length === 11 || digitos.length === 14) ? digitos : c;
}

export interface DadosPix {
  chave: string;
  /** Nome de quem recebe (máx. 25). */
  nome: string;
  /** Cidade de quem recebe (máx. 15), ex.: "Chapecó/SC" vira "Chapeco". */
  cidade: string;
  /** Valor em reais; sem valor o cliente digita. */
  valor?: number;
  /** Identificador que aparece no extrato (letras e números, máx. 25), ex.: o número do orçamento. */
  identificador?: string;
}

export function pixCopiaECola(d: DadosPix) {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', normalizarChavePix(d.chave));
  const txid = (d.identificador ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const corpo =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (d.valor && d.valor > 0 ? campo('54', d.valor.toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', limpar(d.nome, 25) || 'RECEBEDOR') +
    campo('60', limpar(d.cidade.split('/')[0], 15) || 'BRASIL') +
    campo('62', campo('05', txid)) +
    '6304';
  return corpo + crc16(corpo);
}

/** Pix da empresa para um valor (null quando a empresa não tem chave cadastrada). */
export function pixDaEmpresa(
  empresa: { chavePix: string | null; nome: string; cidade: string | null },
  valor: number,
  identificador?: string,
) {
  if (!empresa.chavePix) return null;
  return pixCopiaECola({ chave: empresa.chavePix, nome: empresa.nome, cidade: empresa.cidade ?? '', valor, identificador });
}
