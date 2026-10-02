'use server';

import { revalidatePath } from 'next/cache';
import type { EstadoForm } from '@/components/formulario';
import { campo, executarAcao, numeroBR } from '@/lib/acao';
import { exigirOperador } from '@/lib/auth';
import { gerarFatura, salvarContrato } from '@/lib/contratos';

export async function salvarContratoAcao(id: string | null, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    const especie = numeroBR(campo(f, 'diariaEspecie'));
    await salvarContrato(sessao, id, {
      obraId: campo(f, 'obraId') ?? '',
      diasSemana: f.getAll('diasSemana').map(String),
      diariaBase: numeroBR(campo(f, 'diariaBase')),
      descontoAntecipacao: Number(numeroBR(campo(f, 'descontoPercentual')) || 0) / 100,
      diariaEspecie: especie ? especie : null,
      prazoDias: campo(f, 'prazoDias') ?? '7',
      saudacao: campo(f, 'saudacao'),
      ativo: id ? f.get('ativo') === 'on' : true,
    });
    revalidatePath('/contratos');
    return { ok: id ? 'Contrato salvo' : 'Contrato cadastrado' };
  });
}

export async function gerarFaturaAcao(contratoId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const sessao = await exigirOperador();
  return executarAcao(async () => {
    const [ano, mes] = (campo(f, 'mes') ?? '').split('-');
    const fatura = await gerarFatura(sessao, contratoId, { ano, mes, faltas: campo(f, 'faltas') ?? '0' });
    revalidatePath('/contratos');
    revalidatePath('/financeiro');
    return { ok: `Fatura ${fatura.numero} gerada.`, link: { href: `/api/faturas/${fatura.id}`, rotulo: 'Abrir PDF' } };
  });
}
