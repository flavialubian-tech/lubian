import { and, asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BotaoExcluir } from '@/components/botao-excluir';
import { Formulario } from '@/components/formulario';
import { StatusOrcamento } from '@/components/status-orcamento';
import { AreaTexto, Botao, BotaoLink, Cabecalho, Campo, Cartao } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { buscarEmpresa } from '@/lib/empresa';
import { carregarOpcoesEditor } from '@/lib/editor-opcoes';
import { dataExpiracao, situacaoNoFunil } from '@/lib/funil';
import { dataCurta, dataHora, linkWhatsApp, moeda } from '@/lib/formato';
import { mensagemEnvioOrcamento, mensagemFollowUp } from '@/lib/mensagens';
import { ehGestao } from '@/lib/permissoes';
import { pixDaEmpresa } from '@/lib/pix';
import { urlBase } from '@/lib/url';
import { aprovarManualAcao, followUpAcao, liberarAcao, recusarAcao } from '../actions';
import { EditorOrcamento } from '../editor';
import { BotaoAcao, BotaoEnviarWhatsApp, BotaoMarcarEnviado, CopiarLink } from './acoes-cliente';
import { CartaoFinanceiroObra } from './financeiro-obra';
import { CartaoOperacao } from './operacao';

const NOMES_EVENTO: Record<string, string> = {
  criado: 'Criado',
  editado: 'Editado',
  enviado: 'Enviado ao cliente',
  follow_up: 'Follow-up',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  liberacao_markup: 'Liberação de markup (Gestão)',
  agenda: 'Agenda',
  sinal_pago: 'Sinal pago',
  quitado: 'Pagamento final (quitação)',
  entregue: 'Serviço entregue',
};

export default async function Orcamento(props: PageProps<'/orcamentos/[id]'>) {
  const sessao = await exigirOperador();
  const { id } = await props.params;
  const orc = await db.query.orcamentos.findFirst({
    where: and(eq(schema.orcamentos.id, id), eq(schema.orcamentos.empresaId, sessao.empresaId)),
    with: { cliente: true, obra: true, eventos: { orderBy: asc(schema.orcamentoEventos.criadoEm) } },
  });
  if (!orc) notFound();

  const opcoes = await carregarOpcoesEditor(sessao.empresaId);
  const ultimoFollowUp = orc.eventos.filter((e) => e.tipo === 'follow_up').at(-1)?.criadoEm;
  const situacao = situacaoNoFunil({ ...orc, ultimoFollowUpEm: ultimoFollowUp });
  const r = orc.resultado;
  const bloqueado = r.abaixoDoMinimo && !orc.liberadoPorId;
  const link = `${await urlBase()}/p/${orc.tokenPublico}`;
  const pixSinal = pixDaEmpresa(await buscarEmpresa(sessao.empresaId), r.sinal, orc.numero);
  const dadosMsg = { clienteNome: orc.cliente.nome, numero: orc.numero, obraNome: orc.obra.nome, valorFinal: r.valorFinal, validadeDias: orc.validadeDias, link, pix: pixSinal };
  const finalizado = orc.status === 'aprovado' || orc.status === 'recusado';

  return (
    <>
      <Cabecalho
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            {orc.numero} <StatusOrcamento status={orc.status} situacao={situacao} />
          </span>
        }
        subtitulo={
          <>
            <Link href={`/clientes/${orc.clienteId}`} className="hover:underline">
              {orc.cliente.nome}
            </Link>{' '}
            ·{' '}
            <Link href={`/obras/${orc.obraId}`} className="hover:underline">
              {orc.obra.nome}
            </Link>
          </>
        }
        acoes={
          <>
            <BotaoLink href={`/api/orcamentos/${orc.id}/previa`} target="_blank" variante="secundario">
              Pré-visualizar
            </BotaoLink>
            <BotaoLink href={`/api/orcamentos/${orc.id}/pdf`} target="_blank" variante="secundario">
              Baixar PDF
            </BotaoLink>
            <BotaoExcluir
              tipo="orcamento"
              id={orc.id}
              voltarPara="/orcamentos"
              rotulo="Excluir orçamento"
              confirmar={`Excluir o orçamento ${orc.numero}? Saem junto a agenda, as cobranças, os pagamentos (com comprovantes) e as despesas desta obra.`}
              className="self-center"
            />
          </>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Cartao titulo="Enviar ao cliente">
          {orc.status === 'aprovado' ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-verde">✓ Aprovado em {dataHora(orc.aprovadoEm)}</p>
              <p className="text-cinza">A agenda fica em pré-reserva e só é confirmada após o Pix de 50% de sinal ({moeda(r.sinal)}).</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bloqueado && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-vermelho">
                  Markup de {(r.markupEfetivo * 100).toFixed(1)}% está abaixo do mínimo de 30%. O envio depende da liberação da Gestão.
                </p>
              )}
              {orc.liberadoPorId && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Liberado pela Gestão: {orc.justificativaLiberacao}</p>}
              <BotaoEnviarWhatsApp
                id={orc.id}
                bloqueado={bloqueado}
                linkWhatsApp={linkWhatsApp(orc.cliente.telefone, mensagemEnvioOrcamento(dadosMsg))}
                rotulo={orc.status === 'rascunho' ? 'Enviar pelo WhatsApp' : 'Reenviar (renova a validade)'}
              />
              {orc.status === 'rascunho' && <BotaoMarcarEnviado id={orc.id} bloqueado={bloqueado} />}
              {orc.status === 'enviado' && (
                <BotaoAcao
                  acao={aprovarManualAcao.bind(null, orc.id)}
                  rotulo="Registrar aprovação (cliente aprovou por mensagem)"
                  confirmar="O cliente aprovou este orçamento? A agenda entra em pré-reserva."
                />
              )}
              {orc.enviadoEm && (
                <p className="text-xs text-cinza">
                  Enviado em {dataCurta(orc.enviadoEm)} · válido até {dataCurta(dataExpiracao(orc.enviadoEm, orc.validadeDias))}
                </p>
              )}
            </div>
          )}
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-cinza">Link do cliente</p>
            {orc.status === 'rascunho' ? <p className="text-xs text-cinza">Disponível após o envio.</p> : <CopiarLink url={link} />}
          </div>
        </Cartao>

        <Cartao titulo="Follow-up">
          {orc.status !== 'enviado' ? (
            <p className="text-sm text-cinza">{orc.status === 'rascunho' ? 'Começa após o envio (lembretes em 2 e 5 dias).' : 'Orçamento finalizado.'}</p>
          ) : (
            <div className="space-y-3">
              {situacao.tipo === 'cobrar' && <p className="text-sm font-semibold text-amber-700">Hora do {situacao.etapa}º follow-up ({situacao.diasDesdeEnvio} dias desde o envio).</p>}
              {situacao.tipo === 'expirado' && <p className="text-sm font-semibold text-vermelho">Validade expirou. Reenvie para renovar.</p>}
              <BotaoLink
                href={linkWhatsApp(orc.cliente.telefone, mensagemFollowUp(dadosMsg, situacao.tipo === 'cobrar' ? situacao.etapa : 1))}
                target="_blank"
                variante="secundario"
                className="w-full"
              >
                Abrir mensagem de follow-up
              </BotaoLink>
              <Formulario action={followUpAcao.bind(null, orc.id)} className="space-y-2">
                <Campo name="nota" placeholder="Anotação (ex.: cliente pediu para falar sexta)" />
                <Botao type="submit" variante="secundario" className="w-full">
                  Registrar follow-up feito
                </Botao>
              </Formulario>
            </div>
          )}
        </Cartao>

        <Cartao titulo={finalizado ? 'Histórico' : 'Recusa e liberação'}>
          {!finalizado && (
            <Formulario action={recusarAcao.bind(null, orc.id)} className="mb-4 space-y-2">
              <Campo name="motivo" placeholder="Motivo da recusa (preço, prazo, fechou com outro…)" />
              <Botao type="submit" variante="perigo" className="w-full">
                Marcar como recusado
              </Botao>
            </Formulario>
          )}
          {!finalizado && bloqueado && ehGestao(sessao.perfil) && (
            <Formulario action={liberarAcao.bind(null, orc.id)} className="mb-4 space-y-2">
              <AreaTexto name="justificativa" rows={2} placeholder="Justificativa para liberar abaixo de 30%" />
              <Botao type="submit" variante="secundario" className="w-full">
                Liberar envio (Gestão)
              </Botao>
            </Formulario>
          )}
          {orc.status === 'recusado' && <p className="mb-3 text-sm text-vermelho">Motivo: {orc.motivoRecusa ?? 'não informado'}</p>}
          <ol className="space-y-1.5 text-xs">
            {orc.eventos.map((e) => (
              <li key={e.id}>
                <span className="text-cinza">{dataHora(e.criadoEm)}</span> · <strong>{NOMES_EVENTO[e.tipo] ?? e.tipo}</strong>
                {e.descricao && <span className="text-cinza"> — {e.descricao}</span>}
              </li>
            ))}
          </ol>
        </Cartao>
      </div>

      {orc.status === 'aprovado' && <CartaoOperacao orc={orc} />}
      {orc.status === 'aprovado' && <CartaoFinanceiroObra orc={orc} />}

      <EditorOrcamento
        id={orc.id}
        somenteLeitura={orc.status === 'aprovado'}
        opcoes={opcoes}
        inicial={{
          obraId: orc.obraId,
          clienteId: orc.clienteId,
          servicoId: orc.servicoId,
          vistoriaId: orc.vistoriaId,
          validadeDias: orc.validadeDias,
          datasPrevistas: orc.datasPrevistas,
          precificacao: orc.precificacao,
          conteudo: orc.conteudo,
        }}
      />
    </>
  );
}
