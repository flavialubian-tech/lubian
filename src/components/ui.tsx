import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variante = 'primario' | 'secundario' | 'perigo' | 'sucesso' | 'fantasma';
const VARIANTES: Record<Variante, string> = {
  primario: 'bg-azul text-white hover:bg-blue-900',
  secundario: 'bg-white text-azul border border-borda hover:bg-slate-50',
  perigo: 'bg-white text-vermelho border border-red-200 hover:bg-red-50',
  sucesso: 'bg-verde text-white hover:bg-green-700',
  fantasma: 'text-azul hover:bg-azul-claro',
};
const BOTAO = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';

export function Botao({ variante = 'primario', className, ...p }: ComponentProps<'button'> & { variante?: Variante }) {
  return <button className={cx(BOTAO, VARIANTES[variante], className)} {...p} />;
}

export function BotaoLink({ variante = 'primario', className, ...p }: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={cx(BOTAO, VARIANTES[variante], className)} {...p} />;
}

export function Cartao({ titulo, acoes, children, className }: { titulo?: ReactNode; acoes?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-borda bg-white p-4 shadow-sm sm:p-5', className)}>
      {(titulo || acoes) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-base font-bold text-azul">{titulo}</h2>}
          {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Cabecalho({ titulo, subtitulo, acoes }: { titulo: ReactNode; subtitulo?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-azul">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-cinza">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Rotulo({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-cinza">
      {children}
    </label>
  );
}

const CAMPO = 'w-full rounded-lg border border-borda bg-white px-3 py-2 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/15';

export function Campo({ rotulo, className, ...p }: ComponentProps<'input'> & { rotulo?: ReactNode }) {
  return (
    <div className={className}>
      {rotulo && <Rotulo htmlFor={p.id ?? p.name}>{rotulo}</Rotulo>}
      <input id={p.id ?? p.name} className={CAMPO} {...p} />
    </div>
  );
}

export function AreaTexto({ rotulo, className, ...p }: ComponentProps<'textarea'> & { rotulo?: ReactNode }) {
  return (
    <div className={className}>
      {rotulo && <Rotulo htmlFor={p.id ?? p.name}>{rotulo}</Rotulo>}
      <textarea id={p.id ?? p.name} rows={3} className={CAMPO} {...p} />
    </div>
  );
}

export function Selecao({ rotulo, className, children, ...p }: ComponentProps<'select'> & { rotulo?: ReactNode }) {
  return (
    <div className={className}>
      {rotulo && <Rotulo htmlFor={p.id ?? p.name}>{rotulo}</Rotulo>}
      <select id={p.id ?? p.name} className={CAMPO} {...p}>
        {children}
      </select>
    </div>
  );
}

export function Caixa({ rotulo, ...p }: ComponentProps<'input'> & { rotulo: ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-azul" {...p} />
      {rotulo}
    </label>
  );
}

type CorSelo = 'cinza' | 'azul' | 'verde' | 'amarelo' | 'vermelho';
const SELOS: Record<CorSelo, string> = {
  cinza: 'bg-slate-100 text-slate-700',
  azul: 'bg-azul-claro text-azul',
  verde: 'bg-green-50 text-verde',
  amarelo: 'bg-amarelo-suave text-amber-700 ring-1 ring-amber-200',
  vermelho: 'bg-red-50 text-vermelho',
};
export function Selo({ cor = 'cinza', children }: { cor?: CorSelo; children: ReactNode }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold', SELOS[cor])}>{children}</span>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-borda p-6 text-center text-sm text-cinza">{children}</p>;
}

/** Tabela responsiva simples. */
export function Tabela({ cabecalho, children }: { cabecalho: ReactNode[]; children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-borda text-left text-xs uppercase tracking-wide text-cinza">
            {cabecalho.map((c, i) => (
              <th key={i} className="px-3 py-2 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export { cx };
