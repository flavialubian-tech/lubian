import Image from 'next/image';
import Link from 'next/link';
import { Navegacao, type ItemMenu } from '@/components/navegacao';
import { exigirOperador } from '@/lib/auth';
import { NOMES_PERFIL } from '@/lib/permissoes';
import logo from '../../../assets/logo-lubian.png';
import { sair } from '../login/actions';

export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const sessao = await exigirOperador();
  const itens: ItemMenu[] = [
    { href: '/', rotulo: 'Painel' },
    { href: '/agenda', rotulo: 'Agenda' },
    { href: '/orcamentos', rotulo: 'Orçamentos' },
    { href: '/vistorias', rotulo: 'Vistorias' },
    { href: '/clientes', rotulo: 'Clientes' },
    { href: '/obras', rotulo: 'Obras' },
    { href: '/equipe', rotulo: 'Equipe' },
    { href: '/servicos', rotulo: 'Serviços' },
    { href: '/pre-qualificacao', rotulo: 'Pré-qualificação' },
    ...(sessao.membroEquipeId ? [{ href: '/minha-semana', rotulo: 'Minha semana' }] : []),
    ...(sessao.perfil === 'gestao' ? [{ href: '/usuarios', rotulo: 'Usuários' }] : []),
  ];

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 z-10 border-b border-borda bg-white md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center gap-3 px-4 py-3 md:py-5">
          <Link href="/" className="flex items-center gap-2">
            <Image src={logo} alt="" width={40} height={40} />
            <span className="text-lg font-extrabold leading-tight text-azul">Lubian Gestão</span>
          </Link>
        </div>
        <div className="px-2 pb-2 md:px-3">
          <Navegacao itens={itens} />
        </div>
        <div className="hidden border-t border-borda px-4 py-4 text-sm md:absolute md:bottom-0 md:block md:w-60">
          <Link href="/minha-conta" className="font-semibold hover:underline">{sessao.nome}</Link>
          <p className="text-xs text-cinza">{NOMES_PERFIL[sessao.perfil]}</p>
          <form action={sair}>
            <button className="mt-2 text-xs font-semibold text-azul hover:underline">Sair</button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8">{children}</main>
      <form action={sair} className="px-4 pb-6 md:hidden">
        <button className="text-xs font-semibold text-azul">
          Sair ({sessao.nome})
        </button>
      </form>
    </div>
  );
}
