/**
 * PDFs do financeiro: recibo de sinal/quitação (por pagamento) e fatura mensal (por fatura).
 */
import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db, schema } from '@/db';
import { referenciaMes } from '@/fatura';
import { dataPorExtenso, montarRecibo, type Pagamento } from '@/recibo';
import { gerarPdf, renderizarHtml } from '@/pdf/gerar-documento';
import { pdfPeloNavegador, respostaPaginaParaSalvar } from '@/pdf/modo';
import { ErroNegocio } from './erros';
import { proximoNumero } from './numeracao';
import { FORMAS_PAGAMENTO } from './operacao';
import { pixDaEmpresa } from './pix';

const dataBR = (d: string) => d.split('-').reverse().join('/');

async function empresaDoc(empresaId: string) {
  const empresa = await db.query.empresas.findFirst({ where: eq(schema.empresas.id, empresaId) });
  if (!empresa) throw new ErroNegocio('Empresa não encontrada');
  return empresa;
}

/** Recibo de um pagamento: sinal → Recibo de Sinal; saldo/100%/fatura → Recibo de Quitação. */
export async function dadosRecibo(empresaId: string, pagamentoId: string) {
  let pag = await db.query.pagamentos.findFirst({ where: and(eq(schema.pagamentos.id, pagamentoId), eq(schema.pagamentos.empresaId, empresaId)) });
  if (!pag) return null;
  if (!pag.reciboNumero) {
    // Sinais registrados antes da Fase 3 ganham número no primeiro recibo.
    const reciboNumero = await proximoNumero(db, empresaId, 'REC');
    await db.update(schema.pagamentos).set({ reciboNumero }).where(eq(schema.pagamentos.id, pag.id));
    pag = { ...pag, reciboNumero };
  }
  const cob = pag.cobrancaId ? await db.query.cobrancas.findFirst({ where: eq(schema.cobrancas.id, pag.cobrancaId) }) : undefined;
  const tipo = pag.tipo === 'sinal' ? 'sinal' : 'quitacao';
  const forma = (p: { forma: keyof typeof FORMAS_PAGAMENTO }) => FORMAS_PAGAMENTO[p.forma];

  let cliente: { nome: string };
  let obra: { local: string; area?: string; localNoTexto: string };
  let servico: string;
  let linhas: Pagamento[];

  if (pag.orcamentoId) {
    const orc = await db.query.orcamentos.findFirst({ where: eq(schema.orcamentos.id, pag.orcamentoId), with: { cliente: true, obra: true, servico: true } });
    if (!orc) return null;
    cliente = orc.cliente;
    obra = { local: orc.obra.nome, area: orc.conteudo.areaTexto || undefined, localNoTexto: `em ${orc.obra.nome}` };
    servico = orc.conteudo.tipoServico || orc.servico?.nome || 'Limpeza técnica';
    const cobs = (await db.query.cobrancas.findMany({ where: eq(schema.cobrancas.orcamentoId, orc.id) })).filter((c) => c.status !== 'cancelada');
    const pags = cobs.length
      ? await db.query.pagamentos.findMany({ where: inArray(schema.pagamentos.cobrancaId, cobs.map((c) => c.id)) })
      : [pag];
    const pagoDe = new Map(pags.map((p) => [p.cobrancaId, p]));
    const ordem = { sinal: 0, saldo: 1, fatura: 2 };
    linhas = cobs.length
      ? cobs
          .sort((a, b) => ordem[a.tipo] - ordem[b.tipo])
          .map((c) => {
            const p = pagoDe.get(c.id);
            // No recibo de sinal, só o próprio sinal aparece como recebido.
            const pago = !!p && (tipo === 'quitacao' || p.id === pag!.id);
            return { descricao: c.descricao, forma: p ? forma(p) : '', valor: Number(p && pago ? p.valor : c.valor), pago };
          })
      : [{ descricao: 'Sinal de Reserva da Agenda', forma: forma(pag), valor: Number(pag.valor), pago: true }];
  } else if (cob?.faturaId) {
    const [f] = await db
      .select({ ano: schema.faturas.ano, mes: schema.faturas.mes, clienteNome: schema.clientes.nome, obraNome: schema.obras.nome })
      .from(schema.faturas)
      .innerJoin(schema.contratos, eq(schema.contratos.id, schema.faturas.contratoId))
      .innerJoin(schema.clientes, eq(schema.clientes.id, schema.contratos.clienteId))
      .innerJoin(schema.obras, eq(schema.obras.id, schema.contratos.obraId))
      .where(eq(schema.faturas.id, cob.faturaId));
    if (!f) return null;
    cliente = { nome: f.clienteNome };
    obra = { local: f.obraNome, localNoTexto: `em ${f.obraNome}, referente às diárias de ${referenciaMes(f.ano, f.mes)}` };
    servico = 'Limpeza Recorrente (diárias)';
    linhas = [{ descricao: cob.descricao, forma: forma(pag), valor: Number(pag.valor), pago: true }];
  } else {
    return null;
  }

  const recibo = montarRecibo({ tipo, servico, localNoTexto: obra.localNoTexto, pagamentos: linhas });
  return {
    nomeArquivo: `Recibo-${tipo === 'sinal' ? 'Sinal' : 'Quitacao'}-${pag.reciboNumero}.pdf`,
    dados: {
      empresa: await empresaDoc(empresaId),
      cliente,
      obra,
      servico: { tipo: servico },
      recibo: {
        ...recibo,
        tituloPagina: tipo === 'quitacao' ? 'Recibo de Quitação' : 'Recibo de Sinal',
        numero: pag.reciboNumero,
        dataBaixa: dataPorExtenso(pag.pagoEm),
        selo: 'Engenharia de Limpeza & Handover',
      },
    },
  };
}

const MENSAGEM_FATURA = 'Confira abaixo os dias da semana programados para os atendimentos deste mês. Tudo organizado para manter o seu espaço impecável!';

export async function dadosFatura(faturaId: string) {
  const [f] = await db
    .select({ fatura: schema.faturas, contrato: schema.contratos, cliente: schema.clientes, obra: schema.obras })
    .from(schema.faturas)
    .innerJoin(schema.contratos, eq(schema.contratos.id, schema.faturas.contratoId))
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.contratos.clienteId))
    .innerJoin(schema.obras, eq(schema.obras.id, schema.contratos.obraId))
    .where(eq(schema.faturas.id, faturaId));
  if (!f) return null;
  const empresa = await empresaDoc(f.fatura.empresaId);
  const endereco = f.cliente.enderecoCobranca ?? f.obra.endereco ?? '';
  const [linha1, ...resto] = endereco.split(/\s+-\s+(?=[^-]*$)/);
  // Pix copia e cola + QR do valor da Opção 1 (Pix), para o cliente pagar direto da fatura.
  const codigoPix = pixDaEmpresa(empresa, f.fatura.calculo.pix.total, f.fatura.numero);
  const pix = codigoPix ? { codigo: codigoPix, qr: await QRCode.toDataURL(codigoPix, { margin: 1, width: 240 }) } : null;
  return {
    nomeArquivo: `Fatura-${f.fatura.numero}.pdf`,
    dados: {
      empresa,
      cliente: { nome: f.cliente.nome, enderecoLinha1: linha1 || f.obra.nome, enderecoLinha2: resto.join(' - ') || empresa.cidade || '' },
      fatura: {
        numero: f.fatura.numero,
        referencia: referenciaMes(f.fatura.ano, f.fatura.mes),
        emissao: dataBR(f.fatura.emissao),
        vencimento: dataBR(f.fatura.vencimento),
      },
      calculo: f.fatura.calculo,
      calendario: f.fatura.calendario,
      saudacao: f.contrato.saudacao ?? f.cliente.saudacao ?? `Olá, ${f.cliente.nome.trim().split(/\s+/)[0]}`,
      mensagem: MENSAGEM_FATURA,
      pix,
    },
  };
}

/** Resposta HTTP com o PDF (inline, ou anexo com `baixar`). */
export async function respostaPdf(doc: { nomeArquivo: string; dados: Record<string, unknown> } | null, modelo: 'recibo' | 'fatura-mensal', baixar = false) {
  if (!doc) return new Response('Não encontrado', { status: 404 });
  const html = await renderizarHtml(modelo, doc.dados as never);
  if (pdfPeloNavegador()) return respostaPaginaParaSalvar(html, doc.nomeArquivo);
  const pdf = await gerarPdf(html);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="${doc.nomeArquivo}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
