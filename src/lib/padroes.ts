/** Textos padrão da Lubian usados ao criar um orçamento novo (todos editáveis). */
import type { ConteudoOrcamento } from '@/db/schema';

export const VALOR_AGREGADO_PADRAO = {
  titulo: 'Entendendo o seu Investimento (Proteção do Projeto)',
  texto:
    'A Lubian não realiza faxinas residenciais comuns. Este orçamento reflete a alocação de uma equipe especializada para executar a <i>Engenharia de Limpeza</i>. Nosso trabalho exige maquinário de aspiração fina e química de pH controlado. O objetivo central deste serviço não é apenas remover sujeira, mas <strong>blindar o seu investimento</strong>, garantindo que acabamentos caros não sofram arranhões, manchas químicas ou desgastes irreversíveis por práticas inadequadas.',
};

export const INCLUIDOS_PADRAO = [
  { rotulo: 'Produtos profissionais', texto: 'Soluções com pH controlado para pisos sensíveis e esquadrias.' },
  { rotulo: 'Acessórios de precisão', texto: 'Microfibras premium que não causam atrito e não soltam fiapos.' },
  { rotulo: 'Equipamentos e mobilização', texto: 'Transporte, alimentação e força-tarefa mobilizada.' },
];

export const RESPONSABILIDADES_PADRAO = [
  { rotulo: 'Acesso e segurança', texto: 'Disponibilizar acesso livre ao imóvel nos dias combinados.' },
  { rotulo: 'Recursos básicos', texto: 'Disponibilizar água e energia elétrica ativa durante a execução.' },
  { rotulo: 'Vistoria final', texto: 'Acompanhar a conferência ao término do serviço para aprovação.' },
];

export function conteudoPadrao(dados: { tipoServico?: string; areaM2?: number | null; localTexto?: string }): ConteudoOrcamento {
  const area = dados.areaM2 ? `${dados.areaM2.toLocaleString('pt-BR')} m²` : '';
  return {
    tipoServico: dados.tipoServico ?? '',
    cronograma: '',
    equipeTexto: 'Força-Tarefa Especializada',
    areaTexto: area,
    localTexto: dados.localTexto ?? '',
    informacoes: { titulo: area ? `Informações do Imóvel (${area}):` : 'Informações do Imóvel:', itens: [] },
    parecer: null,
    escopo: [{ titulo: '', meta: '', itens: [''], peso: 1 }],
    valorAgregado: VALOR_AGREGADO_PADRAO,
    incluidos: INCLUIDOS_PADRAO,
    responsabilidades: RESPONSABILIDADES_PADRAO,
    descricaoSubtotal: area ? `Serviços técnicos itemizados (${area})` : 'Serviços técnicos itemizados',
    rotuloDesconto: 'Desconto de Parceria',
  };
}
