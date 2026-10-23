const moedaFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const moeda = (v: number | string | null | undefined) => moedaFmt.format(Number(v ?? 0)).replace(/ /g, ' ');
export const percentual = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')}%`;
export const dataCurta = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';
export const dataHora = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—';

/** Só os dígitos do telefone, com DDI 55, para links do WhatsApp. */
export function telefoneWhatsApp(telefone: string | null | undefined) {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  return digitos.startsWith('55') && digitos.length >= 12 ? digitos : `55${digitos}`;
}

/**
 * Emojis chegam como "�" no WhatsApp Web/Desktop quando passam pelo link wa.me; acentos, "—" e "›" chegam certos.
 * Por isso as mensagens não levam emojis, e esta limpeza garante isso mesmo se um texto novo tiver algum.
 */
export const semEmojis = (texto: string) =>
  texto
    .replace(/\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}]*/gu, '')
    .replace(/[\u{FE0F}\u{200D}]/gu, '')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .replace(/[ \t]{2,}/g, ' ');

export function linkWhatsApp(telefone: string | null | undefined, mensagem: string) {
  const numero = telefoneWhatsApp(telefone);
  const texto = encodeURIComponent(semEmojis(mensagem));
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
