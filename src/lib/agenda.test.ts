import { describe, expect, it } from 'vitest';
import {
  cobrarSinal,
  conflitos,
  conflitosNaAgenda,
  gerarAlocacoes,
  hojeSP,
  inicioSemana,
  mapearForcaTarefa,
  semanasDoMes,
  statusAlocacao,
  textoCronograma,
  type AlocacaoExistente,
} from './agenda';

describe('gerarAlocacoes', () => {
  it('cria uma alocação por profissional × data', () => {
    const r = gerarAlocacoes([{ membroEquipeId: 'a' }, { membroEquipeId: 'b' }], ['2026-10-10', '2026-10-09']);
    expect(r).toEqual([
      { membroEquipeId: 'a', data: '2026-10-09' },
      { membroEquipeId: 'b', data: '2026-10-09' },
      { membroEquipeId: 'a', data: '2026-10-10' },
      { membroEquipeId: 'b', data: '2026-10-10' },
    ]);
  });
  it('ignora datas repetidas/inválidas e profissional repetido', () => {
    expect(gerarAlocacoes([{ membroEquipeId: 'a' }, { membroEquipeId: 'a' }], ['2026-10-10', '2026-10-10', 'x'])).toHaveLength(1);
    expect(gerarAlocacoes([{ membroEquipeId: 'a' }], [])).toEqual([]);
  });
});

describe('conflitos', () => {
  const existente = (p: Partial<AlocacaoExistente>): AlocacaoExistente => ({
    membroEquipeId: 'a',
    data: '2026-10-10',
    orcamentoId: 'o1',
    obraId: 'obra1',
    status: 'confirmada',
    ...p,
  });

  it('acusa o mesmo profissional no mesmo dia em outro serviço', () => {
    const r = conflitos([existente({})], [{ membroEquipeId: 'a', data: '2026-10-10', orcamentoId: 'o2' }], []);
    expect(r).toEqual([{ tipo: 'outra_obra', membroEquipeId: 'a', data: '2026-10-10', orcamentoId: 'o1', obraId: 'obra1' }]);
  });
  it('ignora alocação cancelada, outro dia, outro profissional e o próprio serviço', () => {
    const novas = [{ membroEquipeId: 'a', data: '2026-10-10', orcamentoId: 'o2' }];
    expect(conflitos([existente({ status: 'cancelada' })], novas, [])).toEqual([]);
    expect(conflitos([existente({ data: '2026-10-11' })], novas, [])).toEqual([]);
    expect(conflitos([existente({ membroEquipeId: 'b' })], novas, [])).toEqual([]);
    expect(conflitos([existente({ orcamentoId: 'o2' })], novas, [])).toEqual([]);
  });
  it('acusa bloqueio do profissional ou da empresa toda', () => {
    const novas = [{ membroEquipeId: 'a', data: '2026-10-12' }];
    const folga = { membroEquipeId: 'a', dataInicio: '2026-10-11', dataFim: '2026-10-13', motivo: 'Folga' };
    const feriado = { membroEquipeId: null, dataInicio: '2026-10-12', dataFim: '2026-10-12', motivo: 'Feriado' };
    const deOutro = { membroEquipeId: 'b', dataInicio: '2026-10-12', dataFim: '2026-10-12', motivo: 'Médico' };
    expect(conflitos([], novas, [folga, feriado, deOutro]).map((c) => c.tipo === 'bloqueio' && c.motivo)).toEqual(['Folga', 'Feriado']);
  });
  it('conflitosNaAgenda marca as duas alocações em choque', () => {
    const r = conflitosNaAgenda(
      [
        { ...existente({}), id: '1' },
        { ...existente({ orcamentoId: 'o2', obraId: 'obra2' }), id: '2' },
        { ...existente({ membroEquipeId: 'b' }), id: '3' },
      ],
      [],
    );
    expect([...r.keys()]).toEqual(['1', '2']);
  });
});

describe('mapearForcaTarefa', () => {
  it('casa nomes sem acento/maiúsculas e lista os que faltam', () => {
    const membros = [
      { id: '1', nome: 'Flávia' },
      { id: '2', nome: 'Anderson' },
    ];
    const r = mapearForcaTarefa(['flavia', ' ANDERSON ', 'Joana', 'Flávia'], membros);
    expect(r.encontrados.map((m) => m.id)).toEqual(['1', '2']);
    expect(r.naoEncontrados).toEqual(['Joana']);
  });
});

describe('cobrança do sinal', () => {
  const agora = new Date('2026-10-10T12:00:00Z');
  it('cobra pré-reserva sem sinal há mais de 2 dias', () => {
    expect(cobrarSinal({ aprovadoEm: new Date('2026-10-08T11:00:00Z'), sinalPago: false }, agora)).toBe(true);
    expect(cobrarSinal({ aprovadoEm: new Date('2026-10-08T13:00:00Z'), sinalPago: false }, agora)).toBe(false);
    expect(cobrarSinal({ aprovadoEm: new Date('2026-10-01T00:00:00Z'), sinalPago: true }, agora)).toBe(false);
    expect(cobrarSinal({ aprovadoEm: null, sinalPago: false }, agora)).toBe(false);
  });
  it('status das alocações segue sinal e entrega', () => {
    expect(statusAlocacao({ sinalPago: false, entregue: false })).toBe('pre_reserva');
    expect(statusAlocacao({ sinalPago: true, entregue: false })).toBe('confirmada');
    expect(statusAlocacao({ sinalPago: true, entregue: true })).toBe('concluida');
  });
});

describe('datas', () => {
  it('semana começa na segunda', () => {
    expect(inicioSemana('2026-10-10')).toBe('2026-10-05'); // sábado
    expect(inicioSemana('2026-10-11')).toBe('2026-10-05'); // domingo
    expect(inicioSemana('2026-10-05')).toBe('2026-10-05');
  });
  it('visão mensal cobre o mês inteiro em semanas completas', () => {
    const s = semanasDoMes('2026-10-15');
    expect(s[0][0]).toBe('2026-09-28');
    expect(s.at(-1)!.at(-1)).toBe('2026-11-01');
    expect(s.every((w) => w.length === 7)).toBe(true);
  });
  it('hoje em São Paulo', () => {
    expect(hojeSP(new Date('2026-10-10T02:00:00Z'))).toBe('2026-10-09');
  });
  it('texto do cronograma', () => {
    expect(textoCronograma(['2026-10-11', '2026-10-10'])).toBe('02 Dias (Sábado 10/10 e Domingo 11/10)');
    expect(textoCronograma([])).toBe('');
  });
});
