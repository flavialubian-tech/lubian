export type Perfil = 'gestao' | 'administrativo' | 'lider' | 'auxiliar';

export const NOMES_PERFIL: Record<Perfil, string> = {
  gestao: 'Gestão',
  administrativo: 'Administrativo',
  lider: 'Líder de equipe',
  auxiliar: 'Auxiliar',
};

/** Gestão e Administrativo operam o sistema (clientes, orçamentos, custos). */
export const podeOperar = (p: Perfil) => p === 'gestao' || p === 'administrativo';
/** Só a Gestão cadastra usuários e libera orçamento abaixo do markup mínimo. */
export const ehGestao = (p: Perfil) => p === 'gestao';
