import { Formulario } from '@/components/formulario';
import { Botao, Cabecalho, Campo, Cartao } from '@/components/ui';
import { exigirOperador } from '@/lib/auth';
import { trocarMinhaSenha } from '../usuarios/actions';

export const metadata = { title: 'Minha conta' };

export default async function MinhaConta() {
  const sessao = await exigirOperador();
  return (
    <>
      <Cabecalho titulo="Minha conta" subtitulo={sessao.email} />
      <Cartao titulo="Trocar senha" className="max-w-md">
        <Formulario action={trocarMinhaSenha} className="space-y-4">
          <Campo rotulo="Senha atual" name="atual" type="password" autoComplete="current-password" required />
          <Campo rotulo="Nova senha (mín. 8 caracteres)" name="nova" type="password" autoComplete="new-password" required />
          <Campo rotulo="Confirme a nova senha" name="confirmacao" type="password" autoComplete="new-password" required />
          <Botao type="submit">Trocar senha</Botao>
        </Formulario>
      </Cartao>
    </>
  );
}
