/** Regras do funil de orçamentos: validade e lembretes de follow-up (D6). */

export const DIAS_FOLLOW_UP = [2, 5] as const;
const DIA_MS = 24 * 60 * 60 * 1000;

export type SituacaoFunil =
  | { tipo: 'ok' }
  | { tipo: 'cobrar'; etapa: 1 | 2; diasDesdeEnvio: number }
  | { tipo: 'expirado'; expirouEm: Date };

export interface OrcamentoNoFunil {
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
  enviadoEm: Date | null;
  validadeDias: number;
  /** Último follow-up registrado pela equipe. */
  ultimoFollowUpEm?: Date | null;
}

export const dataExpiracao = (enviadoEm: Date, validadeDias: number) => new Date(enviadoEm.getTime() + validadeDias * DIA_MS);

export function situacaoNoFunil(o: OrcamentoNoFunil, agora = new Date()): SituacaoFunil {
  if (o.status !== 'enviado' || !o.enviadoEm) return { tipo: 'ok' };
  const expira = dataExpiracao(o.enviadoEm, o.validadeDias);
  if (agora >= expira) return { tipo: 'expirado', expirouEm: expira };

  const diasDesdeEnvio = Math.floor((agora.getTime() - o.enviadoEm.getTime()) / DIA_MS);
  for (let i = DIAS_FOLLOW_UP.length - 1; i >= 0; i--) {
    const marco = new Date(o.enviadoEm.getTime() + DIAS_FOLLOW_UP[i] * DIA_MS);
    if (agora >= marco) {
      const jaCobrado = o.ultimoFollowUpEm && o.ultimoFollowUpEm >= marco;
      return jaCobrado ? { tipo: 'ok' } : { tipo: 'cobrar', etapa: (i + 1) as 1 | 2, diasDesdeEnvio };
    }
  }
  return { tipo: 'ok' };
}
