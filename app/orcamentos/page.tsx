import Link from 'next/link';
import { Cabecalho } from '@/components/cabecalho';
import { ListaOrcamentos } from '@/components/lista-orcamentos';
import { expirarVencidos, listarClientes, listarOrcamentos } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default function PaginaOrcamentos() {
  expirarVencidos();
  return (
    <>
      <Cabecalho
        titulo="Orçamentos"
        acoes={
          <Link
            href="/orcamentos/novo"
            className="inline-flex h-9 items-center rounded-marca bg-acento px-4 text-sm font-medium text-white transition hover:bg-acento/90 dark:text-papel"
          >
            Novo orçamento
          </Link>
        }
      />
      <ListaOrcamentos inicial={listarOrcamentos()} clientes={listarClientes()} />
    </>
  );
}
