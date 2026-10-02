import { asc, eq } from 'drizzle-orm';
import { Formulario } from '@/components/formulario';
import { Botao, Cabecalho, Caixa, Campo, Cartao, Selecao, Selo } from '@/components/ui';
import { db, schema } from '@/db';
import { exigirGestao } from '@/lib/auth';
import { NOMES_PERFIL } from '@/lib/permissoes';
import { salvarUsuario } from './actions';

export const metadata = { title: 'Usuários' };

type Usuario = typeof schema.usuarios.$inferSelect;

function FormUsuario({ u, membros }: { u?: Usuario; membros: { id: string; nome: string }[] }) {
  return (
    <Formulario action={salvarUsuario.bind(null, u?.id ?? null)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Campo rotulo="Nome" name="nome" defaultValue={u?.nome} required />
      <Campo rotulo="E-mail (login)" name="email" type="email" defaultValue={u?.email} required />
      <Selecao rotulo="Perfil" name="perfil" defaultValue={u?.perfil ?? 'auxiliar'}>
        {Object.entries(NOMES_PERFIL).map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </Selecao>
      <Selecao rotulo="Profissional da equipe" name="membroEquipeId" defaultValue={u?.membroEquipeId ?? ''}>
        <option value="">— nenhum —</option>
        {membros.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </Selecao>
      <Campo rotulo={u ? 'Nova senha (opcional)' : 'Senha inicial'} name="senha" type="password" autoComplete="new-password" required={!u} />
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-5">
        {u && <Caixa rotulo="Ativo" name="ativo" defaultChecked={u.ativo} />}
        <Botao type="submit" variante={u ? 'secundario' : 'primario'} className="ml-auto">
          {u ? 'Salvar' : 'Criar usuário'}
        </Botao>
      </div>
    </Formulario>
  );
}

export default async function Usuarios() {
  const sessao = await exigirGestao();
  const [usuarios, membros] = await Promise.all([
    db.query.usuarios.findMany({ where: eq(schema.usuarios.empresaId, sessao.empresaId), orderBy: asc(schema.usuarios.nome) }),
    db.select({ id: schema.equipe.id, nome: schema.equipe.nome }).from(schema.equipe).where(eq(schema.equipe.empresaId, sessao.empresaId)),
  ]);
  return (
    <>
      <Cabecalho
        titulo="Usuários e acessos"
        subtitulo="Gestão e Administrativo operam o sistema; Líderes e Auxiliares veem só a própria escala"
      />
      <div className="space-y-4">
        {usuarios.map((u) => (
          <Cartao
            key={u.id}
            titulo={
              <span className="flex items-center gap-2">
                {u.nome} <Selo cor="azul">{NOMES_PERFIL[u.perfil]}</Selo> {!u.ativo && <Selo>Inativo</Selo>}
              </span>
            }
          >
            <FormUsuario u={u} membros={membros} />
          </Cartao>
        ))}
        <Cartao titulo="Novo usuário">
          <FormUsuario membros={membros} />
        </Cartao>
      </div>
    </>
  );
}
