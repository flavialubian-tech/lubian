'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from './ui';

export interface ItemMenu {
  href: string;
  rotulo: string;
}

export function Navegacao({ itens }: { itens: ItemMenu[] }) {
  const caminho = usePathname();
  // O item mais específico que casa com a rota (ex.: /equipe/acerto não acende /equipe).
  const casa = (href: string) => (href === '/' ? caminho === '/' : caminho === href || caminho.startsWith(`${href}/`));
  const atual = itens.filter((i) => casa(i.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const ativo = (href: string) => href === atual;
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {itens.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cx(
            'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition',
            ativo(i.href) ? 'bg-azul text-white' : 'text-slate-600 hover:bg-azul-claro hover:text-azul',
          )}
        >
          {i.rotulo}
        </Link>
      ))}
    </nav>
  );
}
