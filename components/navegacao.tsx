'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { brand } from '@/lib/brand';

const ITENS = [
  { href: '/', rotulo: 'Dashboard' },
  { href: '/orcamentos', rotulo: 'Orçamentos' },
  { href: '/clientes', rotulo: 'Clientes' },
  { href: '/servicos', rotulo: 'Serviços' },
  { href: '/config', rotulo: 'Configurações' },
];

export function Navegacao() {
  const caminho = usePathname();
  return (
    <header className="sem-impressao sticky top-0 z-30 border-b border-linha bg-papel/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-8 px-6 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-base font-semibold tracking-tight">{brand.nome}</span>
          <span className="text-2xs uppercase tracking-[0.2em] text-sutil">orçamentos</span>
        </Link>
        <nav className="flex items-center gap-1">
          {ITENS.map((item) => {
            const ativo = item.href === '/' ? caminho === '/' : caminho.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-marca px-3 py-1.5 text-sm transition',
                  ativo ? 'bg-tinta/[0.06] font-medium text-tinta' : 'text-sutil hover:text-tinta',
                )}
              >
                {item.rotulo}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto">
          <BotaoTema />
        </div>
      </div>
    </header>
  );
}

function BotaoTema() {
  const [escuro, setEscuro] = React.useState(false);

  React.useEffect(() => {
    setEscuro(document.documentElement.classList.contains('dark'));
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.classList.toggle('dark', novo);
    try {
      localStorage.setItem('atalho-tema', novo ? 'escuro' : 'claro');
    } catch {
      /* modo privado: segue sem persistir */
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Alternar tema"
      className="rounded-marca border border-linha p-2 text-sutil transition hover:text-tinta"
    >
      {escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
