import { asc, eq } from 'drizzle-orm';
import { BotaoExcluir } from '@/components/botao-excluir';
import { Formulario } from '@/components/formulario';
import { Botao, Cabecalho, Caixa, Campo, Cartao, Selecao, Selo } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { moeda } from '@/lib/formato';
import { salvarMembro } from './actions';

export const metadata = { title: 'Equipe' };

type Membro = typeof schema.equipe.$inferSelect;

function FormMembro({ m }: { m?: Membro }) {
  return (
    <Formulario action={salvarMembro.bind(null, m?.id ?? null)} className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_70px]">
      <Campo rotulo="Nome" name="nome" defaultValue={m?.nome} required className="col-span-2 sm:col-span-1" />
      <Selecao rotulo="Função" name="funcao" defaultValue={m?.funcao ?? 'auxiliar'}>
        <option value="lider">Líder</option>
        <option value="auxiliar">Auxiliar</option>
      </Selecao>
      <Campo rotulo="Diária padrão (R$)" name="diariaPadrao" inputMode="decimal" defaultValue={m ? Number(m.diariaPadrao) : ''} required />
      <Campo rotulo="Telefone" name="telefone" type="tel" defaultValue={m?.telefone ?? ''} />
      <Campo rotulo="Cor" name="cor" type="color" defaultValue={m?.cor ?? '#1e3a8a'} className="[&_input]:h-[38px] [&_input]:p-1" />
      <div className="col-span-2 flex flex-wrap items-center gap-4 sm:col-span-5">
        <Caixa rotulo="Habilitação NR-35 (altura)" name="nr35" defaultChecked={m?.nr35} />
        {m && <Caixa rotulo="Ativo" name="ativo" defaultChecked={m.ativo} />}
        <Botao type="submit" variante={m ? 'secundario' : 'primario'} className="ml-auto">
          {m ? 'Salvar' : 'Cadastrar'}
        </Botao>
      </div>
    </Formulario>
  );
}

export default async function Equipe() {
  const sessao = await exigirOperador();
  const membros = await db.query.equipe.findMany({ where: eq(schema.equipe.empresaId, sessao.empresaId), orderBy: [asc(schema.equipe.funcao), asc(schema.equipe.nome)] });
  return (
    <>
      <Cabecalho titulo="Equipe" subtitulo="Diária padrão de cada profissional (pode ser ajustada em cada orçamento)" />
      <div className="space-y-4">
        {membros.map((m) => (
          <Cartao
            key={m.id}
            titulo={
              <span className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: m.cor }} />
                {m.nome}
                <span className="text-sm font-normal text-cinza">· {moeda(m.diariaPadrao)}/dia</span>
                {m.nr35 && <Selo cor="azul">NR-35</Selo>}
                {!m.ativo && <Selo>Inativo</Selo>}
              </span>
            }
            acoes={<BotaoExcluir tipo="membro" id={m.id} confirmar={`Excluir ${m.nome} da equipe?`} />}
          >
            <FormMembro m={m} />
          </Cartao>
        ))}
        <Cartao titulo="Novo profissional">
          <FormMembro />
        </Cartao>
      </div>
    </>
  );
}
