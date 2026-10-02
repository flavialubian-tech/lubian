/**
 * Dias úteis (seg a sex), sem os bloqueios da empresa toda (feriados, recesso).
 * Datas como texto 'AAAA-MM-DD'.
 */
import { diaDaSemana, somarDias } from './agenda';

export interface Feriado {
  /** null = empresa toda; bloqueios de um profissional não contam aqui. */
  membroEquipeId?: string | null;
  dataInicio: string;
  dataFim: string;
}

const daEmpresa = (feriados: Feriado[]) => feriados.filter((f) => !f.membroEquipeId);

export function ehDiaUtil(data: string, feriados: Feriado[] = []) {
  const dia = diaDaSemana(data);
  if (dia === 0 || dia === 6) return false;
  return !daEmpresa(feriados).some((f) => f.dataInicio <= data && data <= f.dataFim);
}

/** Soma N dias úteis a partir do dia seguinte a `data` (N = 0 devolve a própria data). */
export function somarDiasUteis(data: string, n: number, feriados: Feriado[] = []) {
  if (!Number.isInteger(n) || n < 0) throw new Error('Quantidade de dias úteis inválida');
  let d = data;
  for (let restantes = n; restantes > 0; ) {
    d = somarDias(d, 1);
    if (ehDiaUtil(d, feriados)) restantes--;
  }
  return d;
}

/** Dias do mês (1–31) bloqueados para a empresa toda — saem da fatura mensal. */
export function diasBloqueadosNoMes(ano: number, mes: number, feriados: Feriado[]) {
  const prefixo = `${ano}-${String(mes).padStart(2, '0')}-`;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dias: number[] = [];
  for (let d = 1; d <= ultimo; d++) {
    const data = `${prefixo}${String(d).padStart(2, '0')}`;
    if (daEmpresa(feriados).some((f) => f.dataInicio <= data && data <= f.dataFim)) dias.push(d);
  }
  return dias;
}
