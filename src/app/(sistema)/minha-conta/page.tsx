import { Formulario } from '@/components/formulario';
import { Botao, Cabecalho, Campo, Cartao } from '@/components/ui';
import { exigirOperador } from '@/lib/auth';
import { acessoPelaRede } from '@/lib/modo-local';
import { trocarMinhaSenha } from '../usuarios/actions';

export const metadata = { title: 'Minha conta' };

export default async function MinhaConta() {
  const sessao = await exigirOperador();
  const rede = await acessoPelaRede();
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
      {rede.length > 0 && (
        <Cartao titulo="Abrir no celular" className="mt-6 max-w-md">
          <p className="mb-4 text-sm text-cinza">
            Com o celular no <strong>mesmo Wi-Fi</strong> deste computador, aponte a câmera para o código ou digite o endereço.
          </p>
          <div className="flex flex-wrap gap-6">
            {rede.map((r) => (
              <div key={r.url} className="text-center">
                <img src={r.qr} alt={`QR Code de ${r.url}`} width={160} height={160} className="mx-auto" />
                <p className="mt-2 font-mono text-sm font-semibold text-azul">{r.url}</p>
              </div>
            ))}
          </div>
        </Cartao>
      )}
    </>
  );
}
