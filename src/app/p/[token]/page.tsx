import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Formulario } from '@/components/formulario';
import { Botao, BotaoLink } from '@/components/ui';
import { db, schema } from '@/db';
import { dataCurta, dataHora, linkWhatsApp, moeda } from '@/lib/formato';
import { dataExpiracao, situacaoNoFunil } from '@/lib/funil';
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
            <p className="text-sm">
              Para <strong>confirmar a data da força-tarefa</strong>, faça o Pix do sinal de 50%: <strong className="text-azul">{moeda(r.sinal)}</strong>
            </p>
            {empresa.chavePix && (
              <p className="rounded-lg bg-azul-claro px-3 py-2 text-sm">
                Chave Pix (CNPJ): <strong className="select-all">{empresa.chavePix}</strong> · {empresa.nome}
              </p>
            )}
            <BotaoLink href={falarComEquipe} target="_blank" variante="sucesso">
              Enviar comprovante pelo WhatsApp
            </BotaoLink>
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
