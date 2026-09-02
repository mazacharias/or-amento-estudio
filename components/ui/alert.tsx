import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NivelAlerta = 'info' | 'ok' | 'atencao' | 'critico';

const ESTILO: Record<NivelAlerta, string> = {
  info: 'border-linha bg-tinta/[0.03] text-tinta',
  ok: 'border-positivo/30 bg-positivo/10 text-positivo',
  atencao: 'border-alerta/40 bg-alerta/10 text-alerta',
  critico: 'border-critico/40 bg-critico/10 text-critico',
};

const ICONE: Record<NivelAlerta, React.ComponentType<{ className?: string }>> = {
  info: Info,
  ok: CheckCircle2,
  atencao: AlertTriangle,
  critico: OctagonAlert,
};

export function Alert({
  nivel = 'info',
  titulo,
  children,
  className,
}: {
  nivel?: NivelAlerta;
  titulo?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icone = ICONE[nivel];
  return (
    <div className={cn('flex gap-2.5 rounded-marca border p-3 text-sm', ESTILO[nivel], className)}>
      <Icone className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        {titulo ? <p className="font-semibold">{titulo}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}
