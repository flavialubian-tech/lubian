import { Cabecalho, Cartao } from '@/components/ui';
import { exigirOperador } from '@/lib/auth';
import { listarParceiros } from '@/lib/parceiros';
import { FormCliente } from '../form-cliente';

export const metadata = { title: 'Novo cliente' };

export default async function NovoCliente() {
  const sessao = await exigirOperador();
  return (
    <>
      <Cabecalho titulo="Novo cliente" />
      <Cartao>
        <FormCliente parceiros={await listarParceiros(sessao.empresaId)} />
      </Cartao>
    </>
  );
}
