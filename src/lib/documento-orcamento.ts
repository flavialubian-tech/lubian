/** Monta os dados que o template `orcamento-tecnico.html` espera. */
import type { ConteudoOrcamento } from '@/db/schema';
import { textoCronograma } from './agenda';
import { distribuirValorTabela, type ResultadoOrcamento } from '@/precificacao';

export interface EmpresaDocumento {
  nome: string;
  slogan?: string | null;
  logoUrl?: string | null;
  cnpj?: string | null;
  cidade?: string | null;
}

const dataBR = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export function dadosDocumentoOrcamento(p: {
  empresa: EmpresaDocumento;
  clienteNome: string;
  numero: string;
  emitidoEm: Date;
  validadeDias: number;
  /** Sem texto de cronograma, o PDF mostra as datas previstas. */
  datasPrevistas?: string[];
  conteudo: ConteudoOrcamento;
  resultado: ResultadoOrcamento;
  selo?: string;
}) {
  const { conteudo: c, resultado: r } = p;
  const escopoValido = c.escopo.filter((i) => i.titulo.trim());
  const valores = escopoValido.length ? distribuirValorTabela(r.valorTabela, escopoValido.map((i) => i.peso || 1)) : [];
  const validoAte = new Date(p.emitidoEm.getTime() + p.validadeDias * 86_400_000);
  const pct = Math.round(r.descontoPercentual * 100);

  return {
    empresa: p.empresa,
    documento: {
      numero: p.numero,
      data: dataBR(p.emitidoEm),
      validade: `${p.validadeDias} dias (até ${dataBR(validoAte)})`,
      selo: p.selo ?? 'Engenharia de Limpeza & Handover',
    },
    cliente: { nome: p.clienteNome },
    obra: { local: c.localTexto, area: c.areaTexto },
    servico: { tipo: c.tipoServico, cronograma: c.cronograma.trim() || textoCronograma(p.datasPrevistas ?? []), equipe: c.equipeTexto },
    informacoes: { titulo: c.informacoes.titulo, itens: c.informacoes.itens.filter((i) => i.trim()) },
    parecer: c.parecer?.titulo.trim() || c.parecer?.texto.trim() ? c.parecer : null,
    escopo: escopoValido.map((item, i) => ({ ...item, itens: item.itens.filter((x) => x.trim()), valor: valores[i] })),
    valorAgregado: c.valorAgregado?.texto.trim() ? c.valorAgregado : null,
    incluidos: c.incluidos.filter((i) => i.rotulo.trim() || i.texto.trim()),
    responsabilidades: c.responsabilidades.filter((i) => i.rotulo.trim() || i.texto.trim()),
    financeiro: {
      descricaoSubtotal: c.descricaoSubtotal,
      valorTabela: r.valorTabela,
      rotuloDesconto: pct > 0 ? `${c.rotuloDesconto} (${pct}%)` : c.rotuloDesconto,
      desconto: r.desconto,
      valorFinal: r.valorFinal,
      sinal: r.sinal,
      saldo: r.saldo,
    },
  };
}
