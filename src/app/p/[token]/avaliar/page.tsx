import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Formulario } from '@/components/formulario';
import { Botao, BotaoLink, Campo } from '@/components/ui';
import { db, schema } from '@/db';
import { orcamentoPublico } from '@/lib/orcamento-sessao';
import { estadoPosVenda } from '@/lib/pos-venda';
import { convidarParaGoogle } from '@/lib/pos-venda-regras';
import logo from '../../../../../assets/logo-lubian.png';
import { avaliarAcao } from './actions';

export const metadata: Metadata = { title: 'Avalie nosso serviço', robots: { index: false, follow: false } };

const ROTULO_NOTA = { 1: 'Ruim', 2: 'Regular', 3: 'Bom', 4: 'Muito bom', 5: 'Excelente' } as const;

export default async function Avaliar(props: PageProps<'/p/[token]/avaliar'>) {
  const { token } = await props.params;
  const orc = await orcamentoPublico(token);
  if (!orc || orc.status !== 'aprovado' || !orc.entregueEm) notFound();
  const [cliente, empresa, obra, estado] = await Promise.all([
    db.query.clientes.findFirst({ where: eq(schema.clientes.id, orc.clienteId) }),
    db.query.empresas.findFirst({ where: eq(schema.empresas.id, orc.empresaId) }),
    db.query.obras.findFirst({ where: eq(schema.obras.id, orc.obraId) }),
    estadoPosVenda(orc.id),
  ]);
  if (!cliente || !empresa) notFound();
  const primeiroNome = cliente.nome.trim().split(/\s+/)[0];
  const a = estado.avaliacao;

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <header className="mb-4 flex items-center gap-3">
        <Image src={logo} alt={empresa.nome} width={52} height={52} />
        <div>
          <p className="text-lg font-extrabold text-azul">{empresa.nome}</p>
          <p className="text-xs text-cinza">Como foi o serviço{obra ? ` em ${obra.nome}` : ''}?</p>
        </div>
      </header>

      <section className="rounded-xl border border-borda bg-white p-5 shadow-sm">
        {a ? (
          <div className="space-y-3 text-center" data-avaliacao-enviada>
            <p className="text-2xl text-amber-400">{'★'.repeat(a.nota)}<span className="text-slate-300">{'★'.repeat(5 - a.nota)}</span></p>
            <p className="text-lg font-bold text-azul">Obrigada, {primeiroNome}!</p>
            {convidarParaGoogle(a.nota, empresa.linkAvaliacaoGoogle) ? (
              <>
                <p className="text-sm">
                  Que bom que você gostou! Pode contar isso no Google também? Leva 1 minuto e ajuda muito outras pessoas a conhecerem o nosso
                  trabalho.
                </p>
                <BotaoLink href={empresa.linkAvaliacaoGoogle!} target="_blank" variante="sucesso" data-google>
                  Avaliar a Lubian no Google
                </BotaoLink>
              </>
            ) : a.nota <= 3 ? (
              <p className="text-sm">Sentimos muito que não foi do jeito que você esperava. Vamos entrar em contato para entender e resolver.</p>
            ) : (
              <p className="text-sm">Sua opinião nos ajuda a melhorar sempre.</p>
            )}
            {estado.indicados.length > 0 && <p className="text-xs text-cinza">Recebemos sua indicação. Obrigada pela confiança!</p>}
          </div>
        ) : (
          <Formulario action={avaliarAcao.bind(null, token)} className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold">Olá, {primeiroNome}! Que nota você dá para o nosso serviço?</p>
              <div className="flex flex-row-reverse justify-end gap-1" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
                {/* Ordem invertida: com CSS, passar o mouse/tocar acende a estrela e as anteriores. */}
                {[5, 4, 3, 2, 1].map((n) => (
                  <label key={n} className="peer cursor-pointer text-4xl text-slate-300 transition peer-hover:text-amber-400 hover:text-amber-400 has-[:checked]:text-amber-400 peer-has-[:checked]:text-amber-400" title={ROTULO_NOTA[n as 1]}>
                    <input type="radio" name="nota" value={n} className="sr-only" required data-nota={n} />★
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-cinza">1 = ruim · 5 = excelente</p>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Quer deixar um comentário? (opcional)</span>
              <textarea name="comentario" rows={3} className="w-full rounded-lg border border-borda px-3 py-2" placeholder="O que mais gostou? O que podemos melhorar?" />
            </label>
            <fieldset className="space-y-2 rounded-lg bg-azul-claro p-3">
              <legend className="px-1 text-sm font-semibold text-azul">Conhece alguém que precisa de limpeza? Indique com nome e WhatsApp (opcional)</legend>
              {[1, 2].map((i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Campo name={`indicadoNome${i}`} placeholder="Nome" aria-label={`Nome da indicação ${i}`} />
                  <Campo name={`indicadoTelefone${i}`} placeholder="(49) 99999-9999" inputMode="tel" aria-label={`Telefone da indicação ${i}`} />
                </div>
              ))}
              <p className="text-xs text-cinza">Entraremos em contato dizendo que foi você quem indicou.</p>
            </fieldset>
            <Botao type="submit" variante="sucesso" className="w-full">
              Enviar avaliação
            </Botao>
          </Formulario>
        )}
      </section>
    </main>
  );
}
