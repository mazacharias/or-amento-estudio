import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badge = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium uppercase tracking-wide',
  {
    variants: {
      tom: {
        neutro: 'border-linha bg-tinta/5 text-sutil',
        acento: 'border-acento/30 bg-acento/10 text-acento',
        positivo: 'border-positivo/30 bg-positivo/10 text-positivo',
        alerta: 'border-alerta/30 bg-alerta/10 text-alerta',
        critico: 'border-critico/30 bg-critico/10 text-critico',
      },
    },
    defaultVariants: { tom: 'neutro' },
  },
);

export function Badge({
  className,
  tom,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tom }), className)} {...props} />;
}
