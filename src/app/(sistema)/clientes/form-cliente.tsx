import { Formulario } from '@/components/formulario';
import { AreaTexto, Botao, Campo, Selecao } from '@/components/ui';
import type { schema } from '@/db';
import { TIPOS_CLIENTE } from '@/lib/rotulos';
import { salvarCliente } from './actions';

type Cliente = typeof schema.clientes.$inferSelect;

export function FormCliente({ cliente, parceiros }: { cliente?: Cliente; parceiros: { id: string; nome: string }[] }) {
  const c = cliente;
  return (
    <Formulario action={salvarCliente.bind(null, c?.id ?? null)} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Nome / Razão social *" name="nome" defaultValue={c?.nome} required className="sm:col-span-2" />
      <Selecao rotulo="Tipo de cliente" name="tipo" defaultValue={c?.tipo ?? 'pessoa_fisica'}>
        {Object.entries(TIPOS_CLIENTE).map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </Selecao>
      <Campo rotulo="CPF / CNPJ" name="documento" defaultValue={c?.documento ?? ''} />
      <Campo rotulo="Telefone / WhatsApp" name="telefone" type="tel" defaultValue={c?.telefone ?? ''} placeholder="(49) 99999-9999" />
      <Campo rotulo="E-mail" name="email" type="email" defaultValue={c?.email ?? ''} />
      <Campo
        rotulo="Saudação nos documentos"
        name="saudacao"
        defaultValue={c?.saudacao ?? ''}
        placeholder="Ex.: Querida Katiane / Prezado Christian"
      />
      <Selecao rotulo="Indicado por (parceiro)" name="indicadoPorId" defaultValue={c?.indicadoPorId ?? ''}>
        <option value="">— ninguém —</option>
        {parceiros
          .filter((p) => p.id !== c?.id)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
      </Selecao>
      <Campo
        rotulo="Endereço de cobrança"
        name="enderecoCobranca"
        defaultValue={c?.enderecoCobranca ?? ''}
        placeholder="Sede / endereço da nota (se diferente da obra)"
        className="sm:col-span-2"
      />
      <Campo
        rotulo="Condição de pagamento"
        name="prazoPagamento"
        defaultValue={c?.prazoPagamento ?? ''}
        placeholder="Ex.: 50% sinal / 50% entrega · 10 dias úteis após NF"
      />
      <Campo
        rotulo="Condição especial: 100% em N dias úteis após a entrega"
        name="prazoDiasUteis"
        type="number"
        min={1}
        max={90}
        defaultValue={c?.prazoDiasUteis ?? ''}
        placeholder="Vazio = 50% sinal / 50% entrega"
      />
      <AreaTexto rotulo="Observações" name="observacoes" defaultValue={c?.observacoes ?? ''} className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <Botao type="submit">{c ? 'Salvar alterações' : 'Cadastrar cliente'}</Botao>
      </div>
    </Formulario>
  );
}
