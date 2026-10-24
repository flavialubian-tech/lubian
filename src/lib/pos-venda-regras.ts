/** Pós-venda: regras puras da avaliação (estrelas, Google, indicações). */

export const NOTA_MINIMA_GOOGLE = 4;

/** Só quem gostou (4 ou 5 estrelas) é convidado a avaliar no Google; notas baixas viram alerta para a Gestão. */
export const convidarParaGoogle = (nota: number, linkGoogle: string | null | undefined) => nota >= NOTA_MINIMA_GOOGLE && !!linkGoogle?.trim();

export const notaBaixa = (nota: number) => nota < NOTA_MINIMA_GOOGLE;

export interface Indicacao {
  nome: string;
  telefone: string;
}

/**
 * Indicações digitadas pelo cliente: ignora linhas vazias, exige nome e telefone com DDD (10 ou 11 dígitos,
 * com ou sem 55), tira repetidas pelo telefone e fica com no máximo `max`.
 */
export function limparIndicacoes(lista: { nome?: string | null; telefone?: string | null }[], max = 2): { validas: Indicacao[]; erro?: string } {
  const validas: Indicacao[] = [];
  const vistos = new Set<string>();
  for (const item of lista) {
    const nome = (item.nome ?? '').trim().replace(/\s+/g, ' ');
    const telefone = (item.telefone ?? '').trim();
    if (!nome && !telefone) continue;
    let digitos = telefone.replace(/\D/g, '');
    if (digitos.length >= 12 && digitos.startsWith('55')) digitos = digitos.slice(2);
    if (!nome) return { validas, erro: 'Informe o nome de quem você indicou' };
    if (digitos.length < 10 || digitos.length > 11) return { validas, erro: `Confira o telefone de ${nome} (com DDD)` };
    if (vistos.has(digitos)) continue;
    vistos.add(digitos);
    validas.push({ nome, telefone: digitos.length === 11 ? `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}` : `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}` });
  }
  return { validas: validas.slice(0, max) };
}
