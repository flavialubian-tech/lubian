import { Cabecalho, Cartao } from '@/components/ui';
import { exigirOperador } from '@/lib/auth';
import { listarClientesOpcoes } from '@/lib/opcoes';
import { listarParceiros } from '@/lib/parceiros';
import { FormObra } from '../form-obra';

export const metadata = { title: 'Nova obra' };

export default async function NovaObra(props: PageProps<'/obras/nova'>) {
  const sessao = await exigirOperador();
  const { cliente } = (await props.searchParams) as { cliente?: string };
  const [clientes, parceiros] = await Promise.all([listarClientesOpcoes(sessao.empresaId), listarParceiros(sessao.empresaId)]);
  return (
    <>
      <Cabecalho titulo="Nova obra" />
      <Cartao>
        <FormObra clientes={clientes} parceiros={parceiros} clienteId={cliente} />
      </Cartao>
    </>
  );
}
