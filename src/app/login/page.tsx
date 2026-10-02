import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Formulario } from '@/components/formulario';
import { Botao, Campo } from '@/components/ui';
import { obterSessao } from '@/lib/auth';
import logo from '../../../assets/logo-lubian.png';
import { entrar } from './actions';

export const metadata = { title: 'Entrar' };

export default async function PaginaLogin() {
  if (await obterSessao()) redirect('/');
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-borda bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src={logo} alt="Lubian Limpezas" width={96} height={96} priority />
          <h1 className="mt-3 text-xl font-extrabold text-azul">Lubian Gestão</h1>
          <p className="text-sm text-cinza">Engenharia de Limpeza Pós-Obra</p>
        </div>
        <Formulario action={entrar} className="space-y-4">
          <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
          <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
          <Botao type="submit" className="w-full">
            Entrar
          </Botao>
        </Formulario>
      </div>
    </main>
  );
}
