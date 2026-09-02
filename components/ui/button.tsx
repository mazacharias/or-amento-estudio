'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const botao = cva(
  'inline-flex items-center justify-center gap-2 rounded-marca text-sm font-medium transition ' +
    'outline-none focus-visible:ring-2 focus-visible:ring-acento/40 disabled:pointer-events-none disabled:opacity-50 ' +
    'whitespace-nowrap',
  {
    variants: {
      variant: {
        // Cor de acento só na ação primária — direção do §7.
        primario: 'bg-acento text-white hover:bg-acento/90 dark:text-papel',
        secundario: 'border border-linha bg-superficie text-tinta hover:bg-tinta/5',
        fantasma: 'text-tinta hover:bg-tinta/5',
        perigo: 'border border-critico/30 text-critico hover:bg-critico/10',
        link: 'text-acento underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3.5',
        lg: 'h-11 px-5',
        icone: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'secundario', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof botao> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(botao({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { botao };
