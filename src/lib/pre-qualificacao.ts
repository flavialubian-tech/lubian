/** Estimativa rápida para o WhatsApp (não é orçamento oficial). */
export const SETUP_MINIMO = { min: 1100, max: 1200 };

export function estimativaPreQualificacao(m2: number, precoMin: number, precoMax: number) {
  const min = Math.max(m2 * precoMin, SETUP_MINIMO.min);
  const max = Math.max(m2 * precoMax, SETUP_MINIMO.max);
  return { min, max, aplicouSetupMinimo: m2 * precoMin < SETUP_MINIMO.min };
}
