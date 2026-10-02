/**
 * Regras da agenda (D3): aprovação = pré-reserva; sinal de 50% pago = confirmada.
 * Funções puras — datas sempre como texto 'AAAA-MM-DD' (dia civil em São Paulo).
 */

export type StatusAlocacao = 'pre_reserva' | 'confirmada' | 'concluida' | 'cancelada';

/** Pré-reserva sem sinal há mais que isso vai para "Para cobrar hoje". */
export const DIAS_COBRAR_SINAL = 2;
const DIA_MS = 24 * 60 * 60 * 1000;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export const ehData = (d: string) => DATA_RE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

/** Dia de hoje (ou de `agora`) em São Paulo, como 'AAAA-MM-DD'. */
export const hojeSP = (agora = new Date()) => agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

const paraUTC = (d: string) => new Date(`${d}T00:00:00Z`);
const deUTC = (d: Date) => d.toISOString().slice(0, 10);

export const somarDias = (d: string, n: number) => deUTC(new Date(paraUTC(d).getTime() + n * DIA_MS));
/** 0 = domingo … 6 = sábado. */
export const diaDaSemana = (d: string) => paraUTC(d).getUTCDay();

/** Segunda-feira da semana de `d`. */
export const inicioSemana = (d: string) => somarDias(d, -((diaDaSemana(d) + 6) % 7));

export const intervalo = (inicio: string, dias: number) => Array.from({ length: dias }, (_, i) => somarDias(inicio, i));

/** Semanas (segunda a domingo) que cobrem o mês de `d`, para a visão mensal. */
export function semanasDoMes(d: string): string[][] {
  const primeiro = `${d.slice(0, 7)}-01`;
  const mes = d.slice(0, 7);
  const semanas: string[][] = [];
  for (let ini = inicioSemana(primeiro); ini.slice(0, 7) <= mes; ini = somarDias(ini, 7)) {
    semanas.push(intervalo(ini, 7));
  }
  return semanas;
}

/** Ordena e remove datas repetidas ou inválidas. */
export const normalizarDatas = (datas: string[]) => [...new Set(datas.filter(ehData))].sort();

const NOMES_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const nomeDia = (d: string) => NOMES_DIA[diaDaSemana(d)];
export const diaMes = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Texto do cronograma no PDF, ex.: "02 Dias (Sábado 10/10 e Domingo 11/10)". */
export function textoCronograma(datas: string[]) {
  const d = normalizarDatas(datas);
  if (!d.length) return '';
  const itens = d.map((x) => `${nomeDia(x)} ${diaMes(x)}`);
  const lista = itens.length === 1 ? itens[0] : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`;
  return `${String(d.length).padStart(2, '0')} Dia${d.length > 1 ? 's' : ''} (${lista})`;
}

/** Normaliza nomes para casar a força-tarefa com o cadastro da equipe ("Flávia" = "flavia "). */
const chaveNome = (n: string) =>
  n
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** Liga os nomes da força-tarefa do orçamento aos membros da equipe. */
export function mapearForcaTarefa<M extends { id: string; nome: string }>(nomes: string[], membros: M[]) {
  const porNome = new Map(membros.map((m) => [chaveNome(m.nome), m]));
  const encontrados: M[] = [];
  const naoEncontrados: string[] = [];
  for (const nome of nomes) {
    const m = porNome.get(chaveNome(nome));
    if (!m) naoEncontrados.push(nome);
    else if (!encontrados.includes(m)) encontrados.push(m);
  }
  return { encontrados, naoEncontrados };
}

export interface NovaAlocacao {
  membroEquipeId: string;
  data: string;
}

/** Uma alocação por profissional × data. */
export function gerarAlocacoes(forcaTarefa: { membroEquipeId: string }[], datas: string[]): NovaAlocacao[] {
  const membros = [...new Set(forcaTarefa.map((m) => m.membroEquipeId))];
  return normalizarDatas(datas).flatMap((data) => membros.map((membroEquipeId) => ({ membroEquipeId, data })));
}

export interface AlocacaoExistente extends NovaAlocacao {
  orcamentoId: string;
  obraId: string;
  status: StatusAlocacao;
}

export interface Bloqueio {
  /** null = empresa toda (feriado). */
  membroEquipeId: string | null;
  dataInicio: string;
  dataFim: string;
  motivo: string;
}

export type Conflito =
  | { tipo: 'outra_obra'; membroEquipeId: string; data: string; orcamentoId: string; obraId: string }
  | { tipo: 'bloqueio'; membroEquipeId: string; data: string; motivo: string };

export const bloqueado = (b: Bloqueio, membroEquipeId: string, data: string) =>
  (b.membroEquipeId === null || b.membroEquipeId === membroEquipeId) && b.dataInicio <= data && data <= b.dataFim;

/**
 * Conflitos das novas alocações de um serviço: o mesmo profissional no mesmo dia em outro serviço
 * (não cancelado) ou num dia bloqueado.
 */
export function conflitos(
  alocacoes: AlocacaoExistente[],
  novas: (NovaAlocacao & { orcamentoId?: string })[],
  bloqueios: Bloqueio[],
): Conflito[] {
  const lista: Conflito[] = [];
  for (const n of novas) {
    for (const a of alocacoes) {
      if (a.status === 'cancelada' || a.membroEquipeId !== n.membroEquipeId || a.data !== n.data) continue;
      if (n.orcamentoId && a.orcamentoId === n.orcamentoId) continue;
      lista.push({ tipo: 'outra_obra', membroEquipeId: n.membroEquipeId, data: n.data, orcamentoId: a.orcamentoId, obraId: a.obraId });
    }
    for (const b of bloqueios) {
      if (bloqueado(b, n.membroEquipeId, n.data)) lista.push({ tipo: 'bloqueio', membroEquipeId: n.membroEquipeId, data: n.data, motivo: b.motivo });
    }
  }
  return lista;
}

/** Conflitos já existentes na agenda (cada alocação ativa contra as demais). */
export function conflitosNaAgenda<A extends AlocacaoExistente & { id: string }>(alocacoes: A[], bloqueios: Bloqueio[]) {
  const ativas = alocacoes.filter((a) => a.status !== 'cancelada');
  const porAlocacao = new Map<string, Conflito[]>();
  for (const a of ativas) {
    const c = conflitos(ativas, [a], bloqueios);
    if (c.length) porAlocacao.set(a.id, c);
  }
  return porAlocacao;
}

/** Pré-reserva sem sinal há mais de 2 dias: cobrar o sinal. */
export function cobrarSinal(o: { aprovadoEm: Date | null; sinalPago: boolean; entregue?: boolean }, agora = new Date()) {
  if (!o.aprovadoEm || o.sinalPago || o.entregue) return false;
  return agora.getTime() - o.aprovadoEm.getTime() > DIAS_COBRAR_SINAL * DIA_MS;
}

/** Status das alocações de um serviço aprovado, conforme o sinal e a entrega. */
export const statusAlocacao = (o: { sinalPago: boolean; entregue: boolean }): StatusAlocacao =>
  o.entregue ? 'concluida' : o.sinalPago ? 'confirmada' : 'pre_reserva';
