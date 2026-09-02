'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatarNumero, parseMoeda } from '@/lib/money';

/**
 * Campo de dinheiro. O estado externo é sempre inteiro em centavos; o texto
 * digitado só existe dentro do input.
 */
export function InputMoeda({
  valor,
  onValor,
  className,
  simbolo = 'R$',
  ...props
}: {
  valor: number;
  onValor: (centavos: number) => void;
  simbolo?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [texto, setTexto] = React.useState(() => (valor ? formatarNumero(valor) : ''));
  const [focado, setFocado] = React.useState(false);

  React.useEffect(() => {
    if (!focado) setTexto(valor ? formatarNumero(valor) : '');
  }, [valor, focado]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-sutil">
        {simbolo}
      </span>
      <input
        {...props}
        inputMode="decimal"
        className={cn('campo pl-9 text-right font-mono tabular-nums', className)}
        value={texto}
        onFocus={(e) => {
          setFocado(true);
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocado(false);
          setTexto(valor ? formatarNumero(valor) : '');
        }}
        onChange={(e) => {
          setTexto(e.target.value);
          onValor(parseMoeda(e.target.value));
        }}
      />
    </div>
  );
}

/** Campo de percentual. Estado externo em decimal (0.25); UI em 25. */
export function InputPercentual({
  valor,
  onValor,
  className,
  max = 100,
  casas = 1,
  ...props
}: {
  valor: number;
  onValor: (decimal: number) => void;
  max?: number;
  casas?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'max'>) {
  const [texto, setTexto] = React.useState(() => formatarPct(valor, casas));
  const [focado, setFocado] = React.useState(false);

  React.useEffect(() => {
    if (!focado) setTexto(formatarPct(valor, casas));
  }, [valor, focado, casas]);

  return (
    <div className="relative">
      <input
        {...props}
        inputMode="decimal"
        className={cn('campo pr-7 text-right font-mono tabular-nums', className)}
        value={texto}
        onFocus={(e) => {
          setFocado(true);
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocado(false);
          setTexto(formatarPct(valor, casas));
        }}
        onChange={(e) => {
          setTexto(e.target.value);
          const numero = Number(e.target.value.replace(',', '.'));
          if (Number.isFinite(numero)) {
            onValor(Math.min(Math.max(numero, 0), max) / 100);
          }
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sutil">
        %
      </span>
    </div>
  );
}

function formatarPct(decimal: number, casas: number): string {
  const n = decimal * 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(casas).replace('.', ',');
}

/** Campo numérico simples (horas, meses, dias). */
export function InputNumero({
  valor,
  onValor,
  className,
  min = 0,
  step = 1,
  ...props
}: {
  valor: number;
  onValor: (n: number) => void;
  min?: number;
  step?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'step'>) {
  const [texto, setTexto] = React.useState(() => String(valor ?? 0));
  const [focado, setFocado] = React.useState(false);

  React.useEffect(() => {
    if (!focado) setTexto(String(valor ?? 0));
  }, [valor, focado]);

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      className={cn('campo text-right font-mono tabular-nums', className)}
      value={texto}
      onFocus={(e) => {
        setFocado(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setFocado(false);
        setTexto(String(valor ?? 0));
      }}
      onChange={(e) => {
        setTexto(e.target.value);
        const numero = Number(e.target.value.replace(',', '.'));
        if (Number.isFinite(numero)) onValor(Math.max(min, numero));
        else if (e.target.value === '') onValor(min);
      }}
      step={step}
    />
  );
}

/** Slider + input percentual lado a lado (passo 4 do wizard). */
export function SliderPercentual({
  label,
  valor,
  onValor,
  max = 60,
  dica,
}: {
  label: string;
  valor: number;
  onValor: (decimal: number) => void;
  max?: number;
  dica?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="rotulo">{label}</label>
        <div className="w-24">
          <InputPercentual valor={valor} onValor={onValor} max={max} />
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={0.5}
        value={Math.round(valor * 1000) / 10}
        onChange={(e) => onValor(Number(e.target.value) / 100)}
        className="w-full accent-acento"
        aria-label={label}
      />
      {dica ? <p className="text-xs text-sutil">{dica}</p> : null}
    </div>
  );
}
