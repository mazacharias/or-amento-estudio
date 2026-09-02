'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('rotulo', className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('campo', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('campo min-h-[80px] resize-y leading-relaxed', className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('campo appearance-none pr-8', className)} {...props} />;
}

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 rounded border-linha text-acento accent-acento focus:ring-acento/30',
        className,
      )}
      {...props}
    />
  );
}

export function Campo({
  label,
  dica,
  erro,
  children,
  className,
}: {
  label?: string;
  dica?: string;
  erro?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {dica && !erro ? <p className="text-xs text-sutil">{dica}</p> : null}
      {erro ? <p className="text-xs text-critico">{erro}</p> : null}
    </div>
  );
}
