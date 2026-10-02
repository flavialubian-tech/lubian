import Image from 'next/image';
import { exigirSessao } from '@/lib/auth';
import logo from '../../../assets/logo-lubian.png';
import { sair } from '../login/actions';

export const metadata = { title: 'Minha semana' };

export default async function MinhaSemana() {
  const sessao = await exigirSessao();
  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center">
      <Image src={logo} alt="Lubian Limpezas" width={88} height={88} className="mx-auto" />
      <h1 className="mt-4 text-xl font-extrabold text-azul">Olá, {sessao.nome}!</h1>
      <p className="mt-2 text-sm text-cinza">
        Aqui você vai ver a sua escala e as obras da semana. Essa área chega na próxima etapa do sistema (Agenda e
        Operação).
      </p>
      <form action={sair} className="mt-6">
        <button className="text-sm font-semibold text-azul hover:underline">Sair</button>
      </form>
    </main>
  );
}
