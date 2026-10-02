import { Formulario } from '@/components/formulario';
import { AreaTexto, Botao, Campo, Selecao } from '@/components/ui';
import type { schema } from '@/db';
import { salvarObra } from './actions';

type Obra = typeof schema.obras.$inferSelect;
type Opcao = { id: string; nome: string };

export function FormObra({ obra, clientes, parceiros, clienteId }: { obra?: Obra; clientes: Opcao[]; parceiros: Opcao[]; clienteId?: string }) {
  const o = obra;
  return (
    <Formulario action={salvarObra.bind(null, o?.id ?? null)} className="grid gap-4 sm:grid-cols-2">
      <Selecao rotulo="Cliente *" name="clienteId" defaultValue={o?.clienteId ?? clienteId ?? ''} required className="sm:col-span-2">
        <option value="">Escolha…</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </Selecao>
      <Campo
        rotulo="Identificação *"
        name="nome"
        defaultValue={o?.nome}
        required
        placeholder="Ex.: Ed. Vila Zenaide - Apto 2702"
        className="sm:col-span-2"
      />
      <Campo rotulo="Endereço da obra" name="endereco" defaultValue={o?.endereco ?? ''} className="sm:col-span-2" />
      <Campo rotulo="Tipo de imóvel" name="tipoImovel" defaultValue={o?.tipoImovel ?? ''} placeholder="Apartamento, casa, sala comercial…" />
      <Campo rotulo="Área (m²)" name="areaM2" inputMode="decimal" defaultValue={o?.areaM2 ? Number(o.areaM2) : ''} />
      <Campo rotulo="Contato no local" name="contatoLocal" defaultValue={o?.contatoLocal ?? ''} placeholder="Nome e telefone do mestre de obras / zelador" />
      <Selecao rotulo="Arquiteto / construtora responsável" name="parceiroId" defaultValue={o?.parceiroId ?? ''}>
        <option value="">— nenhum —</option>
        {parceiros.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </Selecao>
      <AreaTexto rotulo="Observações" name="observacoes" defaultValue={o?.observacoes ?? ''} className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <Botao type="submit">{o ? 'Salvar alterações' : 'Cadastrar obra'}</Botao>
      </div>
    </Formulario>
  );
}
