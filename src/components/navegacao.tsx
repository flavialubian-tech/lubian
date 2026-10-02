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
  const ativo = (href: string) => (href === '/' ? caminho === '/' : caminho.startsWith(href));
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
