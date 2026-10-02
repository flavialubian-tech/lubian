import { asc, eq } from 'drizzle-orm';
import { Formulario } from '@/components/formulario';
import { Botao, BotaoLink, Cabecalho, Campo, Cartao, Selecao, Vazio } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirOperador } from '@/lib/auth';
import { listarServicosAtivos } from '@/lib/servicos';
import { criarVistoria } from '../actions';

export const metadata = { title: 'Nova vistoria' };

export default async function NovaVistoria(props: PageProps<'/vistorias/nova'>) {
  const sessao = await exigirOperador();
  const { obra } = (await props.searchParams) as { obra?: string };
  const [obras, servicos] = await Promise.all([
    db
      .select({ id: schema.obras.id, nome: schema.obras.nome, cliente: schema.clientes.nome })
      .from(schema.obras)
      .innerJoin(schema.clientes, eq(schema.clientes.id, schema.obras.clienteId))
      .where(eq(schema.obras.empresaId, sessao.empresaId))
      .orderBy(asc(schema.clientes.nome)),
    listarServicosAtivos(sessao.empresaId),
  ]);
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  return (
    <>
      <Cabecalho titulo="Nova vistoria técnica" />
      <Cartao className="max-w-xl">
        {obras.length === 0 ? (
          <Vazio>
            Cadastre a obra primeiro. <BotaoLink href="/obras/nova" variante="fantasma">+ Nova obra</BotaoLink>
          </Vazio>
        ) : (
          <Formulario action={criarVistoria} className="space-y-4">
            <Selecao rotulo="Obra" name="obraId" defaultValue={obra ?? ''} required>
              <option value="">Escolha…</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.cliente} — {o.nome}
                </option>
              ))}
            </Selecao>
            <Selecao rotulo="Serviço avaliado" name="servicoId" defaultValue="">
              <option value="">— definir depois —</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Selecao>
            <Campo rotulo="Data" name="data" type="date" defaultValue={hoje} />
            <Botao type="submit">Iniciar vistoria</Botao>
          </Formulario>
        )}
      </Cartao>
    </>
  );
}
