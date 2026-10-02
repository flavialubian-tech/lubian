import { asc, eq } from 'drizzle-orm';
import { BotaoExcluir } from '@/components/botao-excluir';
import { Formulario } from '@/components/formulario';
import { AreaTexto, Botao, Cabecalho, Caixa, Campo, Cartao, Selo } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { salvarServico } from './actions';

export const metadata = { title: 'Serviços' };

type Servico = typeof schema.servicos.$inferSelect;

function FormServico({ s }: { s?: Servico }) {
  return (
    <Formulario action={salvarServico.bind(null, s?.id ?? null)} className="grid gap-3 sm:grid-cols-4">
      <Campo rotulo="Nome" name="nome" defaultValue={s?.nome} required className="sm:col-span-2" />
      <Campo rotulo="R$/m² mínimo" name="precoM2Min" inputMode="decimal" defaultValue={s?.precoM2Min ? Number(s.precoM2Min) : ''} />
      <Campo rotulo="R$/m² máximo" name="precoM2Max" inputMode="decimal" defaultValue={s?.precoM2Max ? Number(s.precoM2Max) : ''} />
      <AreaTexto rotulo="Descrição técnica padrão" name="descricao" rows={2} defaultValue={s?.descricao ?? ''} className="sm:col-span-4" />
      <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
        <Caixa rotulo="Exige NR-35 (trabalho em altura)" name="exigeNr35" defaultChecked={s?.exigeNr35} />
        {s && <Caixa rotulo="Ativo" name="ativo" defaultChecked={s.ativo} />}
        <Botao type="submit" variante={s ? 'secundario' : 'primario'} className="ml-auto">
          {s ? 'Salvar' : 'Cadastrar'}
        </Botao>
      </div>
    </Formulario>
  );
}

export default async function Servicos() {
  const sessao = await exigirOperador();
  const lista = await db.query.servicos.findMany({ where: eq(schema.servicos.empresaId, sessao.empresaId), orderBy: asc(schema.servicos.nome) });
  return (
    <>
      <Cabecalho
        titulo="Catálogo de serviços"
        subtitulo="A faixa de R$/m² é usada só na pré-qualificação; o orçamento oficial segue a fórmula de custos + markup"
      />
      <div className="space-y-4">
        {lista.map((s) => (
          <Cartao
            key={s.id}
            titulo={<span className="flex items-center gap-2">{s.nome}{!s.ativo && <Selo>Inativo</Selo>}</span>}
            acoes={<BotaoExcluir tipo="servico" id={s.id} confirmar={`Excluir o serviço "${s.nome}" do catálogo? Orçamentos já feitos com ele não mudam.`} />}
          >
            <FormServico s={s} />
          </Cartao>
        ))}
        <Cartao titulo="Novo serviço">
          <FormServico />
        </Cartao>
      </div>
    </>
  );
}
