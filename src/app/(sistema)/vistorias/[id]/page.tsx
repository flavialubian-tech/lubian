import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Formulario } from '@/components/formulario';
import { AreaTexto, Botao, BotaoLink, Cabecalho, Caixa, Campo, Cartao, Rotulo, Selecao, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { listarServicosAtivos } from '@/lib/servicos';
import { apagarFoto, enviarFotos, salvarVistoria } from '../actions';
import { EditorMedicoes } from '../medicoes';

export default async function Vistoria(props: PageProps<'/vistorias/[id]'>) {
  const sessao = await exigirOperador();
  const { id } = await props.params;
  const v = await db.query.vistorias.findFirst({
    where: and(eq(schema.vistorias.id, id), eq(schema.vistorias.empresaId, sessao.empresaId)),
    with: { obra: { with: { cliente: true } }, fotos: true },
  });
  if (!v) notFound();
  const servicos = await listarServicosAtivos(sessao.empresaId);
  const data = v.data.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  return (
    <>
      <Cabecalho
        titulo="Vistoria técnica"
        subtitulo={
          <Link href={`/obras/${v.obraId}`} className="hover:underline">
            {v.obra.cliente.nome} — {v.obra.nome}
          </Link>
        }
        acoes={<BotaoLink href={`/orcamentos/novo?vistoria=${v.id}`}>Gerar orçamento desta vistoria →</BotaoLink>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="Levantamento">
          <Formulario action={salvarVistoria.bind(null, v.id)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Selecao rotulo="Serviço" name="servicoId" defaultValue={v.servicoId ?? ''}>
                <option value="">— definir —</option>
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </Selecao>
              <Campo rotulo="Data" name="data" type="date" defaultValue={data} />
            </div>
            <div>
              <Rotulo>Medições por ambiente</Rotulo>
              <EditorMedicoes inicial={v.medicoes} />
            </div>
            <Selecao rotulo="Nível de resíduos" name="nivelSujeira" defaultValue={v.nivelSujeira ?? ''}>
              <option value="">—</option>
              <option value="Baixo (pré-limpeza já realizada)">Baixo (pré-limpeza já realizada)</option>
              <option value="Médio (poeira fina e respingos)">Médio (poeira fina e respingos)</option>
              <option value="Alto (argamassa, tinta e resíduos incrustados)">Alto (argamassa, tinta e resíduos incrustados)</option>
            </Selecao>
            <Caixa rotulo="Necessita andaime / trabalho em altura" name="necessitaAndaime" defaultChecked={v.necessitaAndaime} />
            <AreaTexto
              rotulo="Observações técnicas (acabamentos sensíveis, acesso, prazos)"
              name="observacoes"
              rows={5}
              defaultValue={v.observacoes ?? ''}
            />
            <Botao type="submit">Salvar vistoria</Botao>
          </Formulario>
        </Cartao>

        <Cartao titulo={`Fotos (${v.fotos.length})`}>
          <Formulario action={enviarFotos.bind(null, v.id)} className="mb-4 space-y-3">
            <input
              type="file"
              name="fotos"
              accept="image/*"
              capture="environment"
              multiple
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-azul-claro file:px-4 file:py-2 file:font-semibold file:text-azul"
            />
            <Campo name="legenda" placeholder="Legenda (opcional), ex.: Esquadrias da sala" />
            <Botao type="submit" variante="secundario">
              Enviar fotos
            </Botao>
          </Formulario>
          {v.fotos.length === 0 ? (
            <Vazio>Nenhuma foto ainda.</Vazio>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {v.fotos.map((foto) => (
                <figure key={foto.id} className="overflow-hidden rounded-lg border border-borda">
                  <a href={`/api/fotos/${foto.id}`} target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/fotos/${foto.id}`} alt={foto.legenda ?? 'Foto da vistoria'} className="aspect-square w-full object-cover" />
                  </a>
                  <figcaption className="flex items-center justify-between gap-1 p-1.5 text-xs text-cinza">
                    <span className="truncate">{foto.legenda ?? ''}</span>
                    <form action={apagarFoto.bind(null, v.id, foto.id)}>
                      <button className="text-vermelho hover:underline">Apagar</button>
                    </form>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </Cartao>
      </div>
    </>
  );
}
