import { and, eq, ne } from 'drizzle-orm';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { CopiarPix } from '@/components/copiar-pix';
import { Formulario } from '@/components/formulario';
import { Botao, BotaoLink } from '@/components/ui';
import { db, schema } from '@/db';
import { dataCurta, dataHora, linkWhatsApp, moeda } from '@/lib/formato';
import { dataExpiracao, situacaoNoFunil } from '@/lib/funil';
import { dispensaSinal } from '@/lib/contas-receber';
import { sinalDoOrcamento } from '@/lib/operacao';
import { pixDaEmpresa } from '@/lib/pix';
import { tokenDoRecibo } from '@/lib/recibo-publico';
import { orcamentoPublico } from '@/lib/orcamento-sessao';
import logo from '../../../../assets/logo-lubian.png';
import { aprovarAcao } from './actions';

export const metadata: Metadata = { title: 'Seu orçamento', robots: { index: false, follow: false } };

export default async function OrcamentoCliente(props: PageProps<'/p/[token]'>) {
  const { token } = await props.params;
  const orc = await orcamentoPublico(token);
  if (!orc) notFound();
  const [cliente, empresa] = await Promise.all([
    db.query.clientes.findFirst({ where: eq(schema.clientes.id, orc.clienteId) }),
    db.query.empresas.findFirst({ where: eq(schema.empresas.id, orc.empresaId) }),
  ]);
  if (!cliente || !empresa) notFound();

  const r = orc.resultado;
  const expirado = situacaoNoFunil(orc).tipo === 'expirado';
  // Depois da aprovação: Pix do que está para pagar agora (sinal; depois da entrega, o saldo) e os recibos.
  const aprovado = orc.status === 'aprovado';
  const [sinalPago, semSinal, cobrancas, pagamentos] = aprovado
    ? await Promise.all([
        sinalDoOrcamento(orc.id).then(Boolean),
        dispensaSinal(orc.id),
        db.query.cobrancas.findMany({ where: and(eq(schema.cobrancas.orcamentoId, orc.id), ne(schema.cobrancas.status, 'cancelada')) }),
        db.query.pagamentos.findMany({ where: eq(schema.pagamentos.orcamentoId, orc.id), orderBy: (p, { asc }) => [asc(p.criadoEm)] }),
      ])
    : [false, false, [], []];
  const aberta = (tipo: 'sinal' | 'saldo') => cobrancas.find((c) => c.tipo === tipo && c.status === 'aberta');
  const pagar =
    aprovado && !sinalPago && !semSinal
      ? { tipo: 'sinal' as const, valor: Number(aberta('sinal')?.valor ?? r.sinal) }
      : aprovado && orc.entregueEm && aberta('saldo')
        ? { tipo: 'saldo' as const, valor: Number(aberta('saldo')!.valor) }
        : null;
  const quitado = aprovado && !!orc.entregueEm && !pagar && cobrancas.length > 0 && cobrancas.every((c) => c.status === 'paga');
  const codigoPix = pagar ? pixDaEmpresa(empresa, pagar.valor, orc.numero) : null;
  const qrPix = codigoPix ? await QRCode.toDataURL(codigoPix, { margin: 1, width: 320 }) : null;
  const recibos = await Promise.all(pagamentos.map(async (p) => ({ ...p, token: await tokenDoRecibo(p.id) })));
  const avaliado = aprovado && !!(await db.query.avaliacoes.findFirst({ where: eq(schema.avaliacoes.orcamentoId, orc.id), columns: { id: true } }));
  const falarComEquipe = linkWhatsApp(empresa.telefone, `Olá! Sou ${cliente.nome}, sobre o orçamento ${orc.numero}.`);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <Image src={logo} alt={empresa.nome} width={52} height={52} />
        <div>
          <p className="text-lg font-extrabold text-azul">{empresa.nome}</p>
          <p className="text-xs text-cinza">Apresentação Técnica e Orçamento {orc.numero}</p>
        </div>
      </header>

      <section className="mb-4 rounded-xl border border-borda bg-white p-4 shadow-sm">
        {orc.status === 'aprovado' ? (
          <div className="space-y-2">
            <p className="text-lg font-bold text-verde">✓ Orçamento aprovado em {dataHora(orc.aprovadoEm)}. Obrigado!</p>
            {sinalPago && !orc.entregueEm && <p className="text-sm font-semibold text-verde">✓ Sinal recebido: a data da força-tarefa está confirmada.</p>}
            {quitado && <p className="text-sm font-semibold text-verde">✓ Serviço finalizado e pagamento concluído. Obrigado pela confiança!</p>}
            {aprovado && orc.entregueEm && !avaliado && (
              <BotaoLink href={`/p/${token}/avaliar`} variante="secundario" data-convite-avaliar>
                Avalie nosso serviço (1 minuto)
              </BotaoLink>
            )}
            {pagar && (
              <>
                {pagar.tipo === 'sinal' ? (
                  <p className="text-sm">
                    Para <strong>confirmar a data da força-tarefa</strong>, faça o Pix do sinal de 50%: <strong className="text-azul">{moeda(pagar.valor)}</strong>
                  </p>
                ) : (
                  <p className="text-sm" data-pagar-saldo>
                    ✨ <strong>Serviço finalizado</strong> em {dataCurta(orc.entregueEm)}. Estando tudo aprovado, faça o Pix do saldo final:{' '}
                    <strong className="text-azul">{moeda(pagar.valor)}</strong>
                  </p>
                )}
                {codigoPix && qrPix ? (
                  <CopiarPix codigo={codigoPix} qr={qrPix} valor={moeda(pagar.valor)} />
                ) : (
                  empresa.chavePix && (
                    <p className="rounded-lg bg-azul-claro px-3 py-2 text-sm">
                      Chave Pix: <strong className="select-all">{empresa.chavePix}</strong> · {empresa.nome}
                    </p>
                  )
                )}
              </>
            )}
            {pagar && (
              <BotaoLink href={falarComEquipe} target="_blank" variante="sucesso">
                Enviar comprovante pelo WhatsApp
              </BotaoLink>
            )}
            {recibos.length > 0 && (
              <div className="border-t border-borda pt-2 text-sm" data-recibos-cliente>
                <p className="font-semibold">Seus recibos</p>
                <ul className="mt-1 space-y-1">
                  {recibos.map((p) => (
                    <li key={p.id}>
                      <a href={`/r/${p.token}`} target="_blank" className="font-semibold text-azul hover:underline">
                        {p.tipo === 'sinal' ? 'Recibo do sinal' : 'Recibo de quitação'} {p.reciboNumero ?? ''} · {moeda(p.valor)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : orc.status === 'recusado' ? (
          <p className="text-sm text-cinza">Este orçamento foi encerrado. Fale com a nossa equipe para uma nova proposta.</p>
        ) : expirado ? (
          <div className="space-y-2">
            <p className="font-semibold text-vermelho">A validade desta proposta terminou em {dataCurta(dataExpiracao(orc.enviadoEm!, orc.validadeDias))}.</p>
            <BotaoLink href={falarComEquipe} target="_blank" variante="sucesso">
              Pedir renovação pelo WhatsApp
            </BotaoLink>
          </div>
        ) : (
          <Formulario action={aprovarAcao.bind(null, token)} className="space-y-3">
            <p className="text-sm">
              Investimento final: <strong className="text-lg text-azul">{moeda(r.valorFinal)}</strong> · sinal de 50% ({moeda(r.sinal)}) para reservar a agenda · válido até{' '}
              {dataCurta(dataExpiracao(orc.enviadoEm!, orc.validadeDias))}
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="concordo" className="mt-0.5 size-4 accent-verde" />
              Li a apresentação técnica e aprovo o orçamento, ciente de que a data é confirmada após o Pix do sinal.
            </label>
            <div className="flex flex-wrap gap-2">
              <Botao type="submit" variante="sucesso">
                Aprovar orçamento
              </Botao>
              <BotaoLink href={`/p/${token}/pdf`} target="_blank" variante="secundario">
                Baixar PDF
              </BotaoLink>
              <BotaoLink href={falarComEquipe} target="_blank" variante="fantasma">
                Tirar dúvidas
              </BotaoLink>
            </div>
          </Formulario>
        )}
      </section>

      <iframe src={`/p/${token}/documento`} title="Orçamento" className="h-[80dvh] w-full rounded-xl border border-borda bg-white" />
    </main>
  );
}
