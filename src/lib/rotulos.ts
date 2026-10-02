export const TIPOS_CLIENTE = {
  pessoa_fisica: 'Pessoa Física',
  arquiteto: 'Arquiteto Parceiro',
  construtora: 'Construtora',
  empresa: 'Escritório / Empresa (B2B)',
  imobiliaria: 'Imobiliária',
} as const;
export type TipoCliente = keyof typeof TIPOS_CLIENTE;

/** Tipos que contam como parceiros (indicam obras, entram no ranking). */
export const TIPOS_PARCEIRO: TipoCliente[] = ['arquiteto', 'construtora', 'imobiliaria', 'empresa'];

export const FUNCOES_EQUIPE = { lider: 'Líder', auxiliar: 'Auxiliar' } as const;
