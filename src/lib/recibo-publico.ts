/** Link público do recibo (/r/[token]) para enviar ao cliente pelo WhatsApp, sem login. */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { linkWhatsApp } from './formato';
import { mensagemRecibo } from './mensagens';
import { urlBase } from './url';

/** Token do recibo de um pagamento; criado na primeira vez que o link é montado. */
export async function tokenDoRecibo(pagamentoId: string) {
  const pag = await db.query.pagamentos.findFirst({ where: eq(schema.pagamentos.id, pagamentoId), columns: { tokenPublico: true } });
  if (!pag) throw new Error('Pagamento não encontrado');
  if (pag.tokenPublico) return pag.tokenPublico;
  const token = randomBytes(18).toString('base64url');
  await db.update(schema.pagamentos).set({ tokenPublico: token }).where(eq(schema.pagamentos.id, pagamentoId));
  return token;
}

export function pagamentoPorToken(token: string) {
  return db.query.pagamentos.findFirst({ where: eq(schema.pagamentos.tokenPublico, token) });
}

/** Link do WhatsApp com a mensagem do recibo de um pagamento (cliente, obra e link público já preenchidos). */
export async function whatsAppDoRecibo(pagamentoId: string) {
  const pag = await db.query.pagamentos.findFirst({ where: eq(schema.pagamentos.id, pagamentoId) });
  if (!pag) return null;
  const cob = pag.cobrancaId ? await db.query.cobrancas.findFirst({ where: eq(schema.cobrancas.id, pag.cobrancaId) }) : undefined;
  const orc = pag.orcamentoId ? await db.query.orcamentos.findFirst({ where: eq(schema.orcamentos.id, pag.orcamentoId), with: { obra: true } }) : undefined;
  const clienteId = cob?.clienteId ?? orc?.clienteId;
  const cliente = clienteId ? await db.query.clientes.findFirst({ where: eq(schema.clientes.id, clienteId) }) : undefined;
  if (!cliente) return null;
  const mensagem = mensagemRecibo({
    clienteNome: cliente.nome,
    tipo: pag.tipo,
    valor: Number(pag.valor),
    numero: pag.reciboNumero,
    obraNome: orc?.obra.nome,
    link: `${await urlBase()}/r/${await tokenDoRecibo(pag.id)}`,
  });
  return linkWhatsApp(cliente.telefone, mensagem);
}
