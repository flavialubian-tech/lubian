import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { gerarPdf, renderizarHtml } from '@/pdf/gerar-documento';
import { pdfPeloNavegador, respostaPaginaParaSalvar } from '@/pdf/modo';
import { dadosDocumentoOrcamento } from './documento-orcamento';

type Orcamento = typeof schema.orcamentos.$inferSelect;

export async function htmlDoOrcamento(orc: Orcamento) {
  const [empresa, cliente] = await Promise.all([
    db.query.empresas.findFirst({ where: eq(schema.empresas.id, orc.empresaId) }),
    db.query.clientes.findFirst({ where: eq(schema.clientes.id, orc.clienteId) }),
  ]);
  if (!empresa || !cliente) throw new Error('Dados do orçamento incompletos');
  const dados = dadosDocumentoOrcamento({
    empresa,
    clienteNome: cliente.nome,
    numero: orc.numero,
    emitidoEm: orc.enviadoEm ?? orc.atualizadoEm,
    validadeDias: orc.validadeDias,
    datasPrevistas: orc.datasPrevistas,
    conteudo: orc.conteudo,
    resultado: orc.resultado,
  });
  return renderizarHtml('orcamento-tecnico', dados);
}

export async function respostaPdfOrcamento(orc: Orcamento) {
  const html = await htmlDoOrcamento(orc);
  if (pdfPeloNavegador()) return respostaPaginaParaSalvar(html, `Orcamento-${orc.numero}.pdf`);
  const pdf = await gerarPdf(html);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Orcamento-${orc.numero}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
