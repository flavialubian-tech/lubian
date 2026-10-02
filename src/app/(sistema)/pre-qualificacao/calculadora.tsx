'use client';

import { useState } from 'react';
import { Botao, Campo, Selecao } from '@/components/ui';
import { moeda } from '@/lib/formato';
import { estimativaPreQualificacao, SETUP_MINIMO } from '@/lib/pre-qualificacao';

interface Servico {
  id: string;
  nome: string;
  min: number;
  max: number;
}

export function Calculadora({ servicos }: { servicos: Servico[] }) {
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? '');
  const [m2, setM2] = useState('');
  const [copiado, setCopiado] = useState(false);
  const servico = servicos.find((s) => s.id === servicoId);
  const area = Number(m2.replace(',', '.'));
  const est = servico && area > 0 ? estimativaPreQualificacao(area, servico.min, servico.max) : null;

  const mensagem =
    est && servico
      ? `Para ${servico.nome.toLowerCase()} em aproximadamente ${area.toLocaleString('pt-BR')} m², o investimento costuma ficar entre ${moeda(est.min)} e ${moeda(est.max)} 💼\n\nO valor oficial sai após a nossa Vistoria Técnica gratuita no local, onde avaliamos acabamentos, nível de resíduos e a força-tarefa necessária. Qual o melhor dia para agendarmos? 🗓️`
      : '';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Selecao rotulo="Serviço" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} ({moeda(s.min)} a {moeda(s.max)}/m²)
            </option>
          ))}
        </Selecao>
        <Campo rotulo="Área aproximada (m²)" inputMode="decimal" value={m2} onChange={(e) => setM2(e.target.value)} placeholder="Ex.: 120" />
        <p className="text-xs text-cinza">
          Setup mínimo: {moeda(SETUP_MINIMO.min)} a {moeda(SETUP_MINIMO.max)}. Só serviços com faixa de R$/m² cadastrada aparecem aqui.
        </p>
      </div>
      <div className="rounded-xl bg-azul-claro p-5">
        {est ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-cinza">Estimativa</p>
            <p className="mt-1 text-2xl font-extrabold text-azul">
              {moeda(est.min)} – {moeda(est.max)}
            </p>
            {est.aplicouSetupMinimo && <p className="mt-1 text-xs font-semibold text-amber-700">Setup mínimo aplicado</p>}
            <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-white p-3 font-sans text-sm">{mensagem}</pre>
            <Botao
              type="button"
              className="mt-3"
              variante="sucesso"
              onClick={async () => {
                await navigator.clipboard.writeText(mensagem);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
            >
              {copiado ? 'Copiado ✓' : 'Copiar mensagem'}
            </Botao>
          </>
        ) : (
          <p className="text-sm text-cinza">Escolha o serviço e informe a área para ver a estimativa.</p>
        )}
      </div>
    </div>
  );
}
