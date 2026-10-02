import type { SituacaoFunil } from '@/lib/funil';
import { Selo } from './ui';

type Status = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';

export function StatusOrcamento({ status, situacao }: { status: Status; situacao?: SituacaoFunil }) {
  if (situacao?.tipo === 'expirado') return <Selo cor="vermelho">Expirado</Selo>;
  if (situacao?.tipo === 'cobrar') return <Selo cor="amarelo">Cobrar ({situacao.etapa}º follow-up)</Selo>;
  switch (status) {
    case 'rascunho':
      return <Selo>Rascunho</Selo>;
    case 'enviado':
      return <Selo cor="azul">Enviado</Selo>;
    case 'aprovado':
      return <Selo cor="verde">Aprovado · pré-reserva</Selo>;
    case 'recusado':
      return <Selo cor="vermelho">Recusado</Selo>;
  }
}
