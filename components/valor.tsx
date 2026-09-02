import { cn } from '@/lib/utils';
import { formatarMoeda, formatarPercentual } from '@/lib/money';

/** Número monetário: mono, tabular, alinhado à direita. */
export function Valor({
  centavos,
  moeda = 'BRL',
  className,
  destaque,
}: {
  centavos: number;
  moeda?: string;
  className?: string;
  destaque?: boolean;
}) {
  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        destaque && 'text-lg font-semibold text-acento',
        centavos < 0 && 'text-critico',
        className,
      )}
    >
      {formatarMoeda(centavos, moeda)}
    </span>
  );
}

export function Percentual({ decimal, className }: { decimal: number; className?: string }) {
  return <span className={cn('font-mono tabular-nums', className)}>{formatarPercentual(decimal)}</span>;
}

export function Horas({ horas, className }: { horas: number; className?: string }) {
  const texto = Number.isInteger(horas) ? String(horas) : horas.toFixed(1).replace('.', ',');
  return <span className={cn('font-mono tabular-nums', className)}>{texto}h</span>;
}
