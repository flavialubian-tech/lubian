import { describe, expect, it } from 'vitest';
import { calcularAcerto, diariaNoProjeto } from './acerto';

const equipe = [
  { nome: 'Flávia', diaria: 250 },
  { nome: 'Leandro', diaria: 220 },
];

describe('diariaNoProjeto', () => {
  it('usa a diária do projeto pelo nome (sem acento/caixa) ou a padrão', () => {
    expect(diariaNoProjeto('leandro ', equipe, 200)).toBe(220);
    expect(diariaNoProjeto('Nicoly', equipe, 180)).toBe(180);
  });
});

describe('calcularAcerto', () => {
  it('soma só presenças em escala confirmada/concluída e desconta os vales', () => {
    const base = { obraNome: 'Apto 1', numero: 'ORC-2026-0001', equipeOrcamento: equipe };
    const r = calcularAcerto({
      membro: { nome: 'Leandro', diariaPadrao: 200 },
      alocacoes: [
        { ...base, data: '2026-10-06', status: 'concluida', presenca: 'presente' },
        { ...base, data: '2026-10-05', status: 'confirmada', presenca: 'presente' },
        { ...base, data: '2026-10-07', status: 'confirmada', presenca: 'falta' },
        { ...base, data: '2026-10-08', status: 'pre_reserva', presenca: 'presente' },
        { ...base, data: '2026-10-09', status: 'confirmada', presenca: null },
        { obraNome: 'Casa 2', numero: 'ORC-2026-0002', equipeOrcamento: [], data: '2026-10-10', status: 'concluida', presenca: 'presente' },
      ],
      vales: [{ valor: 100 }, { valor: 50.5 }],
    });
    expect(r.linhas.map((l) => [l.data, l.diaria])).toEqual([
      ['2026-10-05', 220],
      ['2026-10-06', 220],
      ['2026-10-10', 200],
    ]);
    expect(r).toMatchObject({ diarias: 3, totalDiarias: 640, totalVales: 150.5, liquido: 489.5 });
  });
});
